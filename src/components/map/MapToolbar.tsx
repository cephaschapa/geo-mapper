import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MapPin, LineChart, Square, Undo, Redo } from "lucide-react";

interface MapToolbarProps {
  onToolSelect: (tool: string) => void;
  selectedTool: string;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export function MapToolbar({
  onToolSelect,
  selectedTool,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: MapToolbarProps) {
  const tools = [
    { id: 'point', icon: MapPin, label: 'Add Point' },
    { id: 'line', icon: LineChart, label: 'Add Road' },
    { id: 'polygon', icon: Square, label: 'Add Area' },
  ];

  return (
    <TooltipProvider>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-lg p-2 flex space-x-2">
        {tools.map((tool) => (
          <Tooltip key={tool.id}>
            <TooltipTrigger asChild>
              <Button
                variant={selectedTool === tool.id ? "default" : "ghost"}
                size="icon"
                onClick={() => onToolSelect(tool.id)}
              >
                <tool.icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{tool.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}

        <div className="w-px h-6 bg-gray-200 mx-2 self-center" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onUndo}
              disabled={!canUndo}
            >
              <Undo className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Undo</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onRedo}
              disabled={!canRedo}
            >
              <Redo className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Redo</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
} 