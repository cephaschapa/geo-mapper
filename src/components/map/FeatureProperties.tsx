import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { Feature } from 'geojson';

interface FeaturePropertiesProps {
  feature: Feature | null;
  onUpdate: (feature: Feature) => void;
  onClose: () => void;
}

export function FeatureProperties({ feature, onUpdate, onClose }: FeaturePropertiesProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (feature) {
      setName(feature.properties?.name || '');
      setDescription(feature.properties?.description || '');
    }
  }, [feature]);

  const handleSave = () => {
    if (!feature) return;

    const updatedFeature: Feature = {
      ...feature,
      properties: {
        ...feature.properties,
        name,
        description,
      },
    };

    onUpdate(updatedFeature);
    onClose();
  };

  if (!feature) return null;

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <Input
          id="name"
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          placeholder="Enter feature name"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
          placeholder="Enter feature description"
          className="w-full min-h-[100px] p-2 border rounded-md"
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave}>Save</Button>
      </div>
    </div>
  );
} 