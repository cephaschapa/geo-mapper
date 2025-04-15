import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Trash2, MapPin, LineChart, Square } from "lucide-react";
import type { Feature } from "geojson";

interface FeatureListProps {
  features: Feature[];
  onFeatureSelect: (feature: Feature) => void;
  onFeatureDelete: (id: string) => void;
  selectedFeature?: Feature;
}

export function FeatureList({
  features,
  onFeatureSelect,
  onFeatureDelete,
  selectedFeature,
}: FeatureListProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case "Point":
        return <MapPin className="h-4 w-4" />;
      case "LineString":
        return <LineChart className="h-4 w-4" />;
      case "Polygon":
        return <Square className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="w-80 bg-white rounded-lg shadow-lg">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Features ({features.length})</h3>
      </div>
      <ScrollArea className="h-[300px]">
        <div className="p-4 space-y-2">
          {features.map((feature) => (
            <div
              key={feature.id as string}
              className={`p-3 rounded-lg border ${
                selectedFeature?.id === feature.id
                  ? "border-primary bg-primary/5"
                  : "border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 flex-1 justify-start"
                  onClick={() => onFeatureSelect(feature)}
                >
                  {getIcon(feature.geometry.type)}
                  <span>{feature.properties?.name || "Unnamed Feature"}</span>
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
                <p className="text-sm text-gray-500 mt-2">
                  {feature.properties.description}
                </p>
              )}
            </div>
          ))}
          {features.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No features added yet. Use the toolbar to add points, lines, or
              areas.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
