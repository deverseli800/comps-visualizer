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
  const [showSales, setShowSales] = useState<boolean>(true);

  // Function to handle debug tool point selection
  const handleDebugPointSelect = (coordinates: [number, number]) => {
    // Create a synthetic address object using debug coordinates
    setSelectedAddress({
      address: `Test Point: ${coordinates[0].toFixed(4)}, ${coordinates[1].toFixed(4)}`,
      coordinates: coordinates
    });
  };

  return (
    <main className="flex min-h-screen flex-col">
      <Header />
      <div className="flex-1 p-4">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-2xl font-bold mb-4">NYC Neighborhood Property Visualizer</h1>
          <p className="mb-6">
            Enter a New York City address to visualize properties within its neighborhood and adjacent areas.
          </p>
          
          {/* Sales Data Toggle */}
          <div className="mb-4 flex items-center">
            <button
              onClick={() => setShowSales(!showSales)}
              className={`mr-2 px-4 py-2 rounded-lg ${
                showSales 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-800'
              }`}
            >
              {showSales ? 'Hide Sales Data' : 'Show Sales Data'}
            </button>
            <span className="text-sm text-gray-600">
              {showSales ? 'Showing recent property sales' : 'Property sales hidden'}
            </span>
          </div>
          
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
              showSales={showSales}
            />
          </div>
          
          {/* Neighborhood Debug Tool */}
          <div className="mt-6 mb-6">
            <NeighborhoodDebug onPointSelect={handleDebugPointSelect} />
          </div>
          
          {/* Legend and Info */}
          <div className="mt-4 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-medium mb-2">Map Legend</h2>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-red-500 mr-2"></div>
                <span>Selected Address</span>
              </div>
              {showSales && (
                <div className="flex items-center">
                  <div className="w-12 h-4 rounded bg-gradient-to-r from-blue-500 via-yellow-400 to-red-500 mr-2"></div>
                  <span>Sales (Low → High Price)</span>
                </div>
              )}
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-500 opacity-30 border border-blue-500 mr-2"></div>
                <span>Selected Neighborhood</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-500 opacity-20 border border-green-500 mr-2"></div>
                <span>Adjacent Neighborhoods</span>
              </div>
            </div>
            
            <h2 className="text-lg font-medium mt-4 mb-2">Instructions</h2>
            <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
              <li>Enter an NYC address in the search box or use the Neighborhood Debug Tool</li>
              <li>Toggle the "Show Sales Data" button to display or hide property sales</li>
              <li>Click on sales markers to see detailed information</li>
              <li>Try zooming in/out to see how the clustering works with many sales</li>
              <li>Use the sidebar panel to view sales sorted by price and neighborhood statistics</li>
              <li>Both the selected neighborhood and adjacent neighborhoods will be displayed on the map</li>
            </ul>
            
            <h2 className="text-lg font-medium mt-4 mb-2">About This Project</h2>
            <p className="text-sm text-gray-600">
              This proof of concept demonstrates a web-based application that allows users to input a 
              New York City address and visualize all properties within the corresponding neighborhood and 
              adjacent neighborhoods on an interactive map. Built with Next.js, Mapbox, and Node.js.
            </p>
            <div className="mt-2 text-sm text-gray-600">
              <p><strong>Note:</strong> The application displays recent property sales data for multifamily properties (Class C and D buildings), 
              excluding condos and co-ops. This data was geocoded using the Mapbox Geocoding API.</p>
            </div>
          </div>
        </div>
      </div>
      <Debug />
    </main>
  );
}
