'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { MapSidebar } from '@/components/map/MapSidebar';
import type { Feature } from 'geojson';

// Dynamically import the MapComponent to avoid SSR issues with mapbox-gl
const MapComponent = dynamic(
  () => import('@/components/map/MapComponent').then((mod) => mod.MapComponent),
  { ssr: false }
);

export default function Home() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<string>();

  const handleFeatureSelect = (id: string) => {
    setSelectedFeature(id);
    // TODO: Implement feature highlighting on the map
  };

  const handleFeatureDelete = (id: string) => {
    setFeatures(features.filter(f => f.id !== id));
    if (selectedFeature === id) {
      setSelectedFeature(undefined);
    }
    // TODO: Remove feature from the map
  };

  const handleFeatureAdd = (feature: Feature) => {
    setFeatures([...features, feature]);
  };

  return (
    <div className="flex h-screen">
      <MapSidebar
        features={features}
        onFeatureSelect={handleFeatureSelect}
        onFeatureDelete={handleFeatureDelete}
        selectedFeature={selectedFeature}
      />
      <div className="flex-1 relative">
        <MapComponent onFeatureAdd={handleFeatureAdd} />
      </div>
    </div>
  );
}
