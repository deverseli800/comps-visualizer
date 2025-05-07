'use client';

import { useState, useEffect } from 'react';
import MapView from '@/components/MapView';
import Header from '@/components/Header';
import AddressSearch from '@/components/AddressSearch';
import Debug from '@/components/Debug';
import NeighborhoodDebug from '@/components/NeighborhoodDebug';

export default function Home() {
  const [viewport, setViewport] = useState({
    longitude: -74.0060,  // NYC default center
    latitude: 40.7128,
    zoom: 12
  });

  const [selectedAddress, setSelectedAddress] = useState<{
    address: string;
    coordinates: [number, number];
    neighborhood?: string;
  } | undefined>(undefined);
  
  const [neighborhood, setNeighborhood] = useState<string | null>(null);
  const [propertyCount, setPropertyCount] = useState<number | null>(null);

  // When an address is selected, fetch property count
  useEffect(() => {
    if (selectedAddress && selectedAddress.coordinates) {
      const [lng, lat] = selectedAddress.coordinates;
      
      // Fetch property data to get the count
      fetch(`/api/properties?lng=${lng}&lat=${lat}`)
        .then(response => {
          if (response.ok) {
            return response.json();
          }
          throw new Error('Failed to fetch property data');
        })
        .then(data => {
          if (data.properties && data.properties.features) {
            setPropertyCount(data.properties.features.length);
            // Also set neighborhood from the response if available
            if (data.neighborhood && !neighborhood) {
              setNeighborhood(data.neighborhood);
            }
          }
        })
        .catch(error => {
          console.error('Error fetching property count:', error);
          setPropertyCount(null);
        });
    }
  }, [selectedAddress]);

  return (
    <main className="flex min-h-screen flex-col">
      <Header />
      <div className="flex-1 p-4">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-2xl font-bold mb-4">NYC Neighborhood Property Visualizer</h1>
          <p className="mb-6">
            Enter a New York City address to visualize all properties within its neighborhood.
          </p>
          
          {/* Address Input */}
          <div className="mb-6">
            <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-medium mb-3">Find a Neighborhood</h2>
              <AddressSearch 
                onAddressSelect={(address) => {
                  setSelectedAddress(address);
                  if (address.neighborhood) {
                    setNeighborhood(address.neighborhood);
                  } else {
                    setNeighborhood(null);
                  }
                }}
              />
              {selectedAddress && (
                <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
                  <h3 className="font-medium">Selected Location</h3>
                  <p className="text-sm text-gray-600">{selectedAddress.address}</p>
                  {neighborhood && (
                    <div className="mt-2">
                      <p className="text-sm"><span className="font-medium">Neighborhood:</span> {neighborhood}</p>
                      {propertyCount !== null && (
                        <p className="text-sm"><span className="font-medium">Properties:</span> {propertyCount}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Map Container */}
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <MapView 
              viewport={viewport} 
              setViewport={setViewport} 
              selectedAddress={selectedAddress}
            />
          </div>
          
          {/* Neighborhood Debug Tool */}
          <div className="mt-6 mb-6">
            <NeighborhoodDebug />
          </div>
          
          {/* Legend and Info */}
          <div className="mt-4 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-medium mb-2">Map Legend</h2>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-red-500 mr-2"></div>
                <span>Selected Address</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-red-500 border border-white mr-2"></div>
                <span>Properties</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-500 opacity-30 border border-blue-500 mr-2"></div>
                <span>Neighborhood Boundary</span>
              </div>
            </div>
            
            <h2 className="text-lg font-medium mt-4 mb-2">About This Project</h2>
            <p className="text-sm text-gray-600">
              This proof of concept demonstrates a web-based application that allows users to input a 
              New York City address and visualize all properties within the corresponding neighborhood on 
              an interactive map. Built with Next.js, Mapbox, and Node.js.
            </p>
            <div className="mt-2 text-sm text-gray-600">
              <p><strong>Note:</strong> The current implementation uses mock property data. In a production version, 
              real property data from the MapPLUTO dataset would be integrated.</p>
            </div>
          </div>
        </div>
      </div>
      <Debug />
    </main>
  );
}
