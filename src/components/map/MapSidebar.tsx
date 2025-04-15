import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { MapPin, LineChart, Square, Trash2 } from "lucide-react";
import type { Feature } from 'geojson';

interface MapSidebarProps {
  features: Feature[];
  onFeatureSelect: (id: string) => void;
  onFeatureDelete: (id: string) => void;
  selectedFeature?: string;
}

export function MapSidebar({
  features,
  onFeatureSelect,
  onFeatureDelete,
  selectedFeature,
}: MapSidebarProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'Point':
        return <MapPin className="h-4 w-4" />;
      case 'LineString':
        return <LineChart className="h-4 w-4" />;
      case 'Polygon':
        return <Square className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold">Features</h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {features.map((feature) => (
            <div
              key={feature.id as string}
              className={`p-3 rounded-lg border ${
                selectedFeature === feature.id
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 flex-1 justify-start"
                  onClick={() => onFeatureSelect(feature.id as string)}
                >
                  {getIcon(feature.geometry.type)}
                  <span>{feature.properties?.name || 'Unnamed Feature'}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:text-red-600"
                  onClick={() => onFeatureDelete(feature.id as string)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {feature.properties?.description && (
                <>
                  <Separator className="my-2" />
                  <p className="text-sm text-gray-500">{feature.properties.description}</p>
                </>
              )}
            </div>
          ))}
          {features.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No features added yet. Use the toolbar to add points, lines, or areas.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
} 