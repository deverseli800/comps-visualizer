'use client';

import { useState, useEffect } from 'react';
import MapView from '@/components/MapView';
import Header from '@/components/Header';

export default function Home() {
  const [viewport, setViewport] = useState({
    longitude: -74.0060,  // NYC default center
    latitude: 40.7128,
    zoom: 12
  });

  return (
    <main className="flex min-h-screen flex-col">
      <Header />
      <div className="flex-1 p-4">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-2xl font-bold mb-4">NYC Neighborhood Property Visualizer</h1>
          <p className="mb-6">
            Enter a New York City address to visualize all properties within its neighborhood.
          </p>
          
          {/* Map Container */}
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <MapView viewport={viewport} setViewport={setViewport} />
          </div>
          
          {/* Address Input will be added in the next step */}
        </div>
      </div>
    </main>
  );
}
