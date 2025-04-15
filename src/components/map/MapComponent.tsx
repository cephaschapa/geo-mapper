import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapToolbar } from './MapToolbar';
import { v4 as uuidv4 } from 'uuid';
import type { Feature, Point, LineString, Polygon } from 'geojson';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

// Initialize Mapbox token
const MAPBOX_TOKEN = 'pk.eyJ1IjoiaWFtY2VwaGFzIiwiYSI6ImNtOWk4ZDFieDAwMmkya3NiM2kxd3g1OHcifQ.wfE0s7kwC5Cbo8uWgt4GTw';
mapboxgl.accessToken = MAPBOX_TOKEN;

interface MapComponentProps {
  initialCenter?: [number, number];
  initialZoom?: number;
  onFeatureAdd?: (feature: Feature) => void;
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
  const [selectedTool, setSelectedTool] = useState('');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [drawingMode, setDrawingMode] = useState<'point' | 'line' | 'polygon' | null>(null);
  const [currentFeature, setCurrentFeature] = useState<Feature | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [features, setFeatures] = useState<Array<{
    type: 'point' | 'line' | 'polygon';
    coordinates: [number, number][] | [number, number];
    id?: string;
  }>>([]);

  useEffect(() => {
    if (!mapContainer.current) return;
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [lng, lat],
      zoom: zoom,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add geolocation control
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        trackUserLocation: true,
      }),
      'top-right'
    );

    // Handle map movement
    map.current.on('move', () => {
      if (!map.current) return;
      const center = map.current.getCenter();
      setLng(Number(center.lng.toFixed(4)));
      setLat(Number(center.lat.toFixed(4)));
      setZoom(Number(map.current.getZoom().toFixed(2)));
    });

    // Handle geolocation
    map.current.on('geolocate', (e: any) => {
      if (!map.current) return;
      const { coords } = e;
      setLng(Number(coords.longitude.toFixed(4)));
      setLat(Number(coords.latitude.toFixed(4)));
      setZoom(12); // Zoom in when geolocating
    });

    // Handle map clicks for drawing
    map.current.on('click', (e) => {
      if (!drawingMode || !map.current) return;

      const coordinates: [number, number] = [e.lngLat.lng, e.lngLat.lat];

      switch (drawingMode) {
        case 'point':
          addPoint(coordinates);
          break;
        case 'line':
          addLinePoint(coordinates);
          break;
        case 'polygon':
          addPolygonPoint(coordinates);
          break;
      }
    });

    // Cleanup on unmount
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Add a separate effect to handle drawing mode changes
  useEffect(() => {
    if (!map.current) return;
    
    // Remove existing click handlers
    map.current.off('click');
    
    // Add new click handler for the current drawing mode
    map.current.on('click', (e) => {
      if (!drawingMode || !map.current) return;

      const coordinates: [number, number] = [e.lngLat.lng, e.lngLat.lat];

      switch (drawingMode) {
        case 'point':
          addPoint(coordinates);
          break;
        case 'line':
          addLinePoint(coordinates);
          break;
        case 'polygon':
          addPolygonPoint(coordinates);
          break;
      }
    });
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
      console.error('Error searching:', error);
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

    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };

  const clearAll = () => {
    if (!map.current) return;
    
    // Remove all layers from the map
    features.forEach(feature => {
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
    
    setFeatures(prev => prev.filter((_, i) => i !== index));
  };

  const addPoint = (coordinates: [number, number]) => {
    if (!map.current) return;
    
    const featureId = `point-${Date.now()}`;
    const feature = {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates,
      },
      properties: {},
    };

    // Add the point to the map
    map.current.addLayer({
      id: featureId,
      type: 'circle',
      source: {
        type: 'geojson',
        data: feature,
      },
      paint: {
        'circle-radius': 8,
        'circle-color': '#ff0000',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    });

    setFeatures(prev => [...prev, { type: 'point', coordinates, id: featureId }]);
  };

  const addLinePoint = (coordinates: [number, number]) => {
    if (!map.current) return;

    setFeatures(prev => {
      const lastFeature = prev[prev.length - 1];
      if (lastFeature?.type === 'line') {
        const lineCoordinates = [...lastFeature.coordinates as [number, number][], coordinates];
        const featureId = `line-${Date.now()}`;
        
        // Update or create the line layer
        if (map.current?.getLayer(lastFeature.id)) {
          const source = map.current.getSource(lastFeature.id) as mapboxgl.GeoJSONSource;
          source.setData({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: lineCoordinates,
            },
            properties: {},
          });
        } else {
          map.current.addLayer({
            id: featureId,
            type: 'line',
            source: {
              type: 'geojson',
              data: {
                type: 'Feature',
                geometry: {
                  type: 'LineString',
                  coordinates: lineCoordinates,
                },
                properties: {},
              },
            },
            paint: {
              'line-color': '#ff0000',
              'line-width': 2,
            },
          });
        }

        return [
          ...prev.slice(0, -1),
          { type: 'line', coordinates: lineCoordinates, id: featureId },
        ];
      }
      
      const featureId = `line-${Date.now()}`;
      map.current.addLayer({
        id: featureId,
        type: 'line',
        source: {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [coordinates],
            },
            properties: {},
          },
        },
        paint: {
          'line-color': '#ff0000',
          'line-width': 2,
        },
      });

      return [...prev, { type: 'line', coordinates: [coordinates], id: featureId }];
    });
  };

  const addPolygonPoint = (coordinates: [number, number]) => {
    if (!map.current) return;

    setFeatures(prev => {
      const lastFeature = prev[prev.length - 1];
      if (lastFeature?.type === 'polygon') {
        const polygonCoordinates = [...lastFeature.coordinates as [number, number][], coordinates];
        const featureId = `polygon-${Date.now()}`;
        
        // Update or create the polygon layer
        if (map.current?.getLayer(lastFeature.id)) {
          const source = map.current.getSource(lastFeature.id) as mapboxgl.GeoJSONSource;
          source.setData({
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [polygonCoordinates],
            },
            properties: {},
          });
        } else {
          map.current.addLayer({
            id: featureId,
            type: 'fill',
            source: {
              type: 'geojson',
              data: {
                type: 'Feature',
                geometry: {
                  type: 'Polygon',
                  coordinates: [polygonCoordinates],
                },
                properties: {},
              },
            },
            paint: {
              'fill-color': '#ff0000',
              'fill-opacity': 0.5,
              'fill-outline-color': '#ff0000',
            },
          });
        }

        return [
          ...prev.slice(0, -1),
          { type: 'polygon', coordinates: polygonCoordinates, id: featureId },
        ];
      }
      
      const featureId = `polygon-${Date.now()}`;
      map.current.addLayer({
        id: featureId,
        type: 'fill',
        source: {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [[coordinates]],
            },
            properties: {},
          },
        },
        paint: {
          'fill-color': '#ff0000',
          'fill-opacity': 0.5,
          'fill-outline-color': '#ff0000',
        },
      });

      return [...prev, { type: 'polygon', coordinates: [coordinates], id: featureId }];
    });
  };

  const handleToolSelect = (tool: 'point' | 'line' | 'polygon' | null) => {
    setDrawingMode(tool);
    setCurrentFeature(null);
  };

  const handleUndo = () => {
    // TODO: Implement undo functionality
  };

  const handleRedo = () => {
    // TODO: Implement redo functionality
  };

  // Update the click handler to handle tool switching
  useEffect(() => {
    if (!map.current) return;
    
    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      if (!drawingMode || !map.current) return;

      const coordinates: [number, number] = [e.lngLat.lng, e.lngLat.lat];

      switch (drawingMode) {
        case 'point':
          addPoint(coordinates);
          break;
        case 'line':
          addLinePoint(coordinates);
          break;
        case 'polygon':
          addPolygonPoint(coordinates);
          break;
      }
    };

    // Remove existing click handler
    map.current.off('click');
    // Add new click handler
    map.current.on('click', handleClick);

    return () => {
      if (map.current) {
        map.current.off('click', handleClick);
      }
    };
  }, [drawingMode]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Side Navigation */}
      <div className="absolute left-0 top-0 h-full w-64 bg-white shadow-lg p-4 flex flex-col">
        <h2 className="text-xl font-bold mb-4">Map Tools</h2>
        
        {/* Search Box */}
        <div className="relative mb-4">
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

        {/* Drawing Tools */}
        <div className="space-y-2">
          <button
            onClick={() => handleToolSelect('point')}
            className={`w-full p-2 rounded ${
              drawingMode === 'point' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
          >
            Add Point
          </button>
          <button
            onClick={() => handleToolSelect('line')}
            className={`w-full p-2 rounded ${
              drawingMode === 'line' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
          >
            Add Line
          </button>
          <button
            onClick={() => handleToolSelect('polygon')}
            className={`w-full p-2 rounded ${
              drawingMode === 'polygon' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
          >
            Add Polygon
          </button>
          <button
            onClick={() => handleToolSelect(null)}
            className="w-full p-2 bg-gray-200 rounded"
          >
            None
          </button>
          <button
            onClick={clearAll}
            className="w-full p-2 bg-red-500 text-white rounded"
          >
            Clear All
          </button>
        </div>

        {/* Feature List */}
        <div className="mt-4 flex-1 overflow-y-auto">
          <h3 className="font-semibold mb-2">Features</h3>
          <div className="space-y-2">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-2 bg-gray-100 rounded flex justify-between items-center"
              >
                <span>
                  {feature.type === 'point' && 'Point'}
                  {feature.type === 'line' && 'Line'}
                  {feature.type === 'polygon' && 'Polygon'}
                </span>
                <button
                  onClick={() => removeFeature(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 