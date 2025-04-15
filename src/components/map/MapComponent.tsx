import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapToolbar } from "./MapToolbar";
import { v4 as uuidv4 } from "uuid";
import type { Feature, Point, LineString, Polygon } from "geojson";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FeatureProperties } from "./FeatureProperties";

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
  const [features, setFeatures] = useState<MapFeature[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [showProperties, setShowProperties] = useState(false);

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
          addPoint(coordinates);
          break;
        case "line":
          addLinePoint(coordinates);
          break;
        case "polygon":
          addPolygonPoint(coordinates);
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
          addPoint(coordinates);
          break;
        case "line":
          addLinePoint(coordinates);
          break;
        case "polygon":
          addPolygonPoint(coordinates);
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
      if (feature.id && map.current?.getLayer(feature.id)) {
        map.current.removeLayer(feature.id);
        map.current.removeSource(feature.id);
      }
    });

    setFeatures([]);
    setDrawingMode(null);
  };

  const removeFeature = (index: number) => {
    if (!map.current) return;

    const feature = features[index];
    if (feature.id && map.current.getLayer(feature.id)) {
      map.current.removeLayer(feature.id);
      map.current.removeSource(feature.id);
    }

    setFeatures((prev) => prev.filter((_, i) => i !== index));
  };

  const addPoint = (coordinates: [number, number]) => {
    if (!map.current) return;

    const featureId = uuidv4();
    const feature: Feature = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates,
      },
      properties: {},
      id: featureId,
    };

    // Add the point to the map
    map.current.addLayer({
      id: featureId,
      type: "circle",
      source: {
        type: "geojson",
        data: feature,
      },
      paint: {
        "circle-radius": 8,
        "circle-color": "#ff0000",
      },
    });

    setFeatures((prev) => [
      ...prev,
      { type: "point", coordinates, id: featureId },
    ]);
  };

  const addLinePoint = (coordinates: [number, number]) => {
    if (!map.current) return;

    setFeatures((prev) => {
      const lastFeature = prev[prev.length - 1];
      if (lastFeature?.type === "line") {
        const lineCoordinates = [
          ...(lastFeature.coordinates as [number, number][]),
          coordinates,
        ];
        const featureId = `line-${Date.now()}`;

        // Update or create the line layer
        if (map.current?.getLayer(lastFeature.id)) {
          const source = map.current.getSource(
            lastFeature.id
          ) as mapboxgl.GeoJSONSource;
          if (source) {
            source.setData({
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: lineCoordinates,
              },
              properties: {},
            });
          }
        } else if (map.current) {
          map.current.addLayer({
            id: featureId,
            type: "line",
            source: {
              type: "geojson",
              data: {
                type: "Feature",
                geometry: {
                  type: "LineString",
                  coordinates: lineCoordinates,
                },
                properties: {},
              },
            },
            paint: {
              "line-color": "#ff0000",
              "line-width": 2,
            },
          });
        }

        return [
          ...prev.slice(0, -1),
          { type: "line", coordinates: lineCoordinates, id: featureId },
        ];
      }

      const featureId = `line-${Date.now()}`;
      if (map.current) {
        map.current.addLayer({
          id: featureId,
          type: "line",
          source: {
            type: "geojson",
            data: {
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: [coordinates],
              },
              properties: {},
            },
          },
          paint: {
            "line-color": "#ff0000",
            "line-width": 2,
          },
        });
      }

      return [
        ...prev,
        { type: "line", coordinates: [coordinates], id: featureId },
      ];
    });
  };

  const addPolygonPoint = (coordinates: [number, number]) => {
    if (!map.current) return;

    setFeatures((prev) => {
      const lastFeature = prev[prev.length - 1];
      if (lastFeature?.type === "polygon") {
        const polygonCoordinates = [
          ...(lastFeature.coordinates as [number, number][]),
          coordinates,
        ];
        const featureId = `polygon-${Date.now()}`;

        // Update or create the polygon layer
        if (map.current?.getLayer(lastFeature.id)) {
          const source = map.current.getSource(
            lastFeature.id
          ) as mapboxgl.GeoJSONSource;
          if (source) {
            source.setData({
              type: "Feature",
              geometry: {
                type: "Polygon",
                coordinates: [polygonCoordinates],
              },
              properties: {},
            });
          }
        } else if (map.current) {
          map.current.addLayer({
            id: featureId,
            type: "fill",
            source: {
              type: "geojson",
              data: {
                type: "Feature",
                geometry: {
                  type: "Polygon",
                  coordinates: [polygonCoordinates],
                },
                properties: {},
              },
            },
            paint: {
              "fill-color": "#ff0000",
              "fill-opacity": 0.5,
              "fill-outline-color": "#ff0000",
            },
          });
        }

        return [
          ...prev.slice(0, -1),
          { type: "polygon", coordinates: polygonCoordinates, id: featureId },
        ];
      }

      const featureId = `polygon-${Date.now()}`;
      if (map.current) {
        map.current.addLayer({
          id: featureId,
          type: "fill",
          source: {
            type: "geojson",
            data: {
              type: "Feature",
              geometry: {
                type: "Polygon",
                coordinates: [[coordinates]],
              },
              properties: {},
            },
          },
          paint: {
            "fill-color": "#ff0000",
            "fill-opacity": 0.5,
            "fill-outline-color": "#ff0000",
          },
        });
      }

      return [
        ...prev,
        { type: "polygon", coordinates: [coordinates], id: featureId },
      ];
    });
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
      <div className="flex w-full gap-4 absolute top-4 left-4 ">
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

        {/* Floating Controls */}
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
