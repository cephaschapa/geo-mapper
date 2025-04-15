import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapToolbar } from "./MapToolbar";
import { v4 as uuidv4 } from "uuid";
import { Feature, GeoJSON, Geometry, GeoJsonProperties } from "geojson";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FeatureProperties } from "./FeatureProperties";
import { FeatureList } from "./FeatureList";

// Initialize Mapbox token
const MAPBOX_TOKEN =
  "pk.eyJ1IjoiaWFtY2VwaGFzIiwiYSI6ImNtOWk4ZDFieDAwMmkya3NiM2kxd3g1OHcifQ.wfE0s7kwC5Cbo8uWgt4GTw";
mapboxgl.accessToken = MAPBOX_TOKEN;

interface MapComponentProps {
  initialCenter?: [number, number];
  initialZoom?: number;
  onFeatureAdd?: (feature: Feature) => void;
}

interface MapFeature {
  type: "point" | "line" | "polygon";
  coordinates: [number, number] | [number, number][];
  id: string;
}

interface CustomFeature extends Feature {
  id: string;
  properties: {
    name: string;
    description: string;
  };
}

export function MapComponent({
  initialCenter = [0, 0], // Default to center of the world
  initialZoom = 2, // Start with a wider view
  onFeatureAdd,
}: MapComponentProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [lng, setLng] = useState(initialCenter[0]);
  const [lat, setLat] = useState(initialCenter[1]);
  const [zoom, setZoom] = useState(initialZoom);
  const [selectedTool, setSelectedTool] = useState("");
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [drawingMode, setDrawingMode] = useState<
    "point" | "line" | "polygon" | null
  >(null);
  const [currentFeature, setCurrentFeature] = useState<Feature | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [showProperties, setShowProperties] = useState(false);
  const [linePoints, setLinePoints] = useState<[number, number][]>([]);
  const [polygonPoints, setPolygonPoints] = useState<[number, number][]>([]);

  useEffect(() => {
    if (!mapContainer.current) return;
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [lng, lat],
      zoom: zoom,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Add geolocation control
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        trackUserLocation: true,
      }),
      "top-right"
    );

    // Handle map movement
    map.current.on("move", () => {
      if (!map.current) return;
      const center = map.current.getCenter();
      setLng(Number(center.lng.toFixed(4)));
      setLat(Number(center.lat.toFixed(4)));
      setZoom(Number(map.current.getZoom().toFixed(2)));
    });

    // Handle geolocation
    map.current.on("geolocate", (e: any) => {
      if (!map.current) return;
      const { coords } = e;
      setLng(Number(coords.longitude.toFixed(4)));
      setLat(Number(coords.latitude.toFixed(4)));
      setZoom(12); // Zoom in when geolocating
    });

    // Handle map clicks for drawing
    const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
      if (!drawingMode || !map.current) return;

      const coordinates: [number, number] = [e.lngLat.lng, e.lngLat.lat];

      switch (drawingMode) {
        case "point":
          addPoint(e);
          break;
        case "line":
          addLinePoint(e);
          break;
        case "polygon":
          addPolygonPoint(e);
          break;
      }
    };

    map.current.on("click", handleMapClick);

    // Cleanup on unmount
    return () => {
      if (map.current) {
        map.current.off("click", handleMapClick);
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Add a separate effect to handle drawing mode changes
  useEffect(() => {
    if (!map.current) return;

    const handleDrawingClick = (e: mapboxgl.MapMouseEvent) => {
      if (!drawingMode || !map.current) return;

      const coordinates: [number, number] = [e.lngLat.lng, e.lngLat.lat];

      switch (drawingMode) {
        case "point":
          addPoint(e);
          break;
        case "line":
          addLinePoint(e);
          break;
        case "polygon":
          addPolygonPoint(e);
          break;
      }
    };

    // Remove existing click handlers
    map.current.off("click", handleDrawingClick);
    // Add new click handler for the current drawing mode
    map.current.on("click", handleDrawingClick);

    return () => {
      if (map.current) {
        map.current.off("click", handleDrawingClick);
      }
    };
  }, [drawingMode]);

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json?access_token=${MAPBOX_TOKEN}&types=country,region,place,address&limit=5`
      );
      const data = await response.json();
      setSearchResults(data.features);
      setShowResults(true);
    } catch (error) {
      console.error("Error searching:", error);
      setSearchResults([]);
    }
  };

  const handleLocationSelect = (result: any) => {
    if (!map.current) return;

    const [lng, lat] = result.center;
    map.current.flyTo({
      center: [lng, lat],
      zoom: 8,
      essential: true,
    });

    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
  };

  const clearAll = () => {
    if (!map.current) return;

    // Remove all layers from the map
    features.forEach((feature) => {
      const featureId = feature.id?.toString();
      if (featureId && map.current?.getLayer(featureId)) {
        map.current.removeLayer(featureId);
        map.current.removeSource(featureId);
      }
    });

    setFeatures([]);
    setDrawingMode(null);
  };

  const removeFeature = (index: number) => {
    if (!map.current) return;

    const feature = features[index];
    const featureId = feature.id?.toString();
    if (featureId && map.current.getLayer(featureId)) {
      map.current.removeLayer(featureId);
      map.current.removeSource(featureId);
    }

    setFeatures((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFeatureSelect = (feature: Feature) => {
    setSelectedFeature(feature);
    setShowProperties(true);
  };

  const handleFeatureDelete = (id: string) => {
    if (!map.current) return;

    // Remove from map
    if (map.current.getLayer(id)) {
      map.current.removeLayer(id);
      map.current.removeSource(id);
    }

    // Update state
    setFeatures((prev) => prev.filter((f) => f.id?.toString() !== id));
    if (selectedFeature?.id?.toString() === id) {
      setSelectedFeature(null);
      setShowProperties(false);
    }
  };

  const addPoint = (e: mapboxgl.MapMouseEvent) => {
    if (!map.current || !e.lngLat) return;

    const featureId = uuidv4();
    const sourceId = `source-${featureId}`;
    const layerId = `layer-${featureId}`;
    const feature: CustomFeature = {
      type: "Feature",
      id: featureId,
      geometry: {
        type: "Point",
        coordinates: [e.lngLat.lng, e.lngLat.lat],
      },
      properties: {
        name: `Point ${features.length + 1}`,
        description: "New point feature",
      },
    };

    setFeatures((prev) => [...prev, feature]);

    // Add to map
    if (!map.current.getSource(sourceId)) {
      map.current.addSource(sourceId, {
        type: "geojson",
        data: feature,
      });
    }

    if (!map.current.getLayer(layerId)) {
      map.current.addLayer({
        id: layerId,
        type: "circle",
        source: sourceId,
        paint: {
          "circle-radius": 6,
          "circle-color": "#3b82f6",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });
    }
  };

  const addLinePoint = (e: mapboxgl.MapMouseEvent) => {
    if (!map.current || !e.lngLat) return;

    const coordinates: [number, number] = [e.lngLat.lng, e.lngLat.lat];
    setLinePoints((prev) => [...prev, coordinates]);

    if (linePoints.length > 0) {
      const featureId = uuidv4();
      const sourceId = `source-${featureId}`;
      const layerId = `layer-${featureId}`;
      const feature: CustomFeature = {
        type: "Feature",
        id: featureId,
        geometry: {
          type: "LineString",
          coordinates: [...linePoints, coordinates],
        },
        properties: {
          name: `Line ${features.length + 1}`,
          description: "New line feature",
        },
      };

      setFeatures((prev) => [...prev, feature]);

      // Add to map
      if (!map.current.getSource(sourceId)) {
        map.current.addSource(sourceId, {
          type: "geojson",
          data: feature,
        });
      }

      if (!map.current.getLayer(layerId)) {
        map.current.addLayer({
          id: layerId,
          type: "line",
          source: sourceId,
          paint: {
            "line-color": "#3b82f6",
            "line-width": 2,
          },
        });
      }
    }
  };

  const addPolygonPoint = (e: mapboxgl.MapMouseEvent) => {
    if (!map.current || !e.lngLat) return;

    const coordinates: [number, number] = [e.lngLat.lng, e.lngLat.lat];
    setPolygonPoints((prev) => [...prev, coordinates]);

    if (polygonPoints.length > 0) {
      const featureId = uuidv4();
      const sourceId = `source-${featureId}`;
      const layerId = `layer-${featureId}`;
      const feature: CustomFeature = {
        type: "Feature",
        id: featureId,
        geometry: {
          type: "Polygon",
          coordinates: [[...polygonPoints, coordinates]],
        },
        properties: {
          name: `Polygon ${features.length + 1}`,
          description: "New polygon feature",
        },
      };

      setFeatures((prev) => [...prev, feature]);

      // Add to map
      if (!map.current.getSource(sourceId)) {
        map.current.addSource(sourceId, {
          type: "geojson",
          data: feature,
        });
      }

      if (!map.current.getLayer(layerId)) {
        map.current.addLayer({
          id: layerId,
          type: "fill",
          source: sourceId,
          paint: {
            "fill-color": "#3b82f6",
            "fill-opacity": 0.5,
          },
        });
      }
    }
  };

  const handleToolSelect = (tool: "point" | "line" | "polygon" | null) => {
    setDrawingMode(tool);
    setCurrentFeature(null);
  };

  const handleUndo = () => {
    // TODO: Implement undo functionality
  };

  const handleRedo = () => {
    // TODO: Implement redo functionality
  };

  const handleFeatureClick = (e: mapboxgl.MapMouseEvent) => {
    if (!map.current) return;

    const features = map.current.queryRenderedFeatures(e.point, {
      layers: ["points", "lines", "polygons"],
    });

    if (features.length > 0) {
      const clickedFeature = features[0];
      if (clickedFeature.type === "Feature" && clickedFeature.id) {
        setSelectedFeature(clickedFeature as Feature);
        setShowProperties(true);
      }
    }
  };

  const handleFeatureUpdate = (updatedFeature: Feature) => {
    if (!map.current || !updatedFeature.id) return;

    // Update the feature in the map
    const source = map.current.getSource("features") as mapboxgl.GeoJSONSource;
    if (source) {
      const currentData = source._data as GeoJSON.FeatureCollection;
      const updatedFeatures = currentData.features.map((f) =>
        f.id === updatedFeature.id ? updatedFeature : f
      );
      source.setData({
        type: "FeatureCollection",
        features: updatedFeatures,
      });
    }

    // Update local state
    setFeatures((prev) =>
      prev.map((f) =>
        f.id === updatedFeature.id
          ? {
              ...f,
              properties: updatedFeature.properties,
            }
          : f
      )
    );

    setSelectedFeature(null);
    setShowProperties(false);
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      <div className="flex w-full gap-4 absolute top-4 left-4">
        <MapToolbar
          selectedTool={selectedTool as string}
          onToolSelect={(tool: string) =>
            handleToolSelect(tool as "point" | "line" | "polygon" | null)
          }
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={canUndo}
          canRedo={canRedo}
        />

        <div className="relative space-y-4">
          {/* Search Box */}
          <div className="w-80 bg-white rounded-lg shadow-lg p-4">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search for a location..."
                value={searchQuery}
                onChange={handleSearch}
                className="w-full"
              />
              {searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
                  {searchResults.map((result, index) => (
                    <div
                      key={index}
                      className="p-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => handleLocationSelect(result)}
                    >
                      {result.place_name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Feature List */}
          <FeatureList
            features={features}
            onFeatureSelect={handleFeatureSelect}
            onFeatureDelete={handleFeatureDelete}
            selectedFeature={selectedFeature || undefined}
          />

          {/* Feature Properties */}
          {showProperties && selectedFeature && (
            <div className="w-80 bg-white rounded-lg shadow-lg">
              <FeatureProperties
                feature={selectedFeature}
                onUpdate={handleFeatureUpdate}
                onClose={() => {
                  setShowProperties(false);
                  setSelectedFeature(null);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
