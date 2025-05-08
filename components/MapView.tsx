import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import SalesLayer from './SalesLayer';
import SalesSidebar from './SalesSidebar';
import PropertyRecordModal from './PropertyRecordModal';

// Using environment variable for Mapbox token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

interface ViewportProps {
  longitude: number;
  latitude: number;
  zoom: number;
}

interface PropertySale {
  id: string;
  address: string;
  neighborhood: string;
  buildingClass: string;
  price: number;
  units: number;
  residentialUnits: number;
  commercialUnits: number;
  yearBuilt: number;
  landSqFt: number;
  grossSqFt: number;
  saleDate: string | Date;
  location?: [number, number]; // [longitude, latitude]
}

interface NeighborhoodInfo {
  name: string;
  feature: any;
  isMain: boolean;
}

interface MapViewProps {
  viewport: ViewportProps;
  setViewport: React.Dispatch<React.SetStateAction<ViewportProps>>;
  selectedAddress?: {
    address: string;
    coordinates: [number, number];
    neighborhood?: string;
  };
  showSales?: boolean;
}

const MapView: React.FC<MapViewProps> = ({ viewport, setViewport, selectedAddress, showSales = true }) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapInitialized, setMapInitialized] = useState(false);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodInfo[]>([]);
  const [mainNeighborhood, setMainNeighborhood] = useState<string | null>(null);
  const [adjacentNeighborhoodNames, setAdjacentNeighborhoodNames] = useState<string[]>([]);
  const [selectedSale, setSelectedSale] = useState<PropertySale | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showSidebar, setShowSidebar] = useState<boolean>(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState<boolean>(false);
  const [showIncomeLayer, setShowIncomeLayer] = useState<boolean>(false);
  const [incomeDataLoaded, setIncomeDataLoaded] = useState<boolean>(false);

  // Map initialization
  useEffect(() => {
    if (mapContainer.current && !map.current) {
      console.log('Creating map instance');
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11', // Use a light style for better readability
        center: [viewport.longitude, viewport.latitude],
        zoom: viewport.zoom
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      
      map.current.on('load', () => {
        console.log('Map initialized and loaded');
        setMapInitialized(true);
      });

      map.current.on('move', () => {
        if (map.current) {
          const { lng, lat } = map.current.getCenter();
          setViewport({
            longitude: lng,
            latitude: lat,
            zoom: map.current.getZoom()
          });
        }
      });
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Setup income layer as soon as map is initialized
  useEffect(() => {
    if (!map.current || !mapInitialized || incomeDataLoaded) return;
    
    const sourceId = 'income-source';
    
    // Add income data source - we do this regardless of whether the layer is visible
    fetch('/data/nta_acs_economic.geojson')
      .then(response => response.json())
      .then(data => {
        if (map.current) {
          // Add source
          map.current.addSource(sourceId, {
            type: 'geojson',
            data: data
          });
          
          // Add layer (initially hidden)
          map.current.addLayer({
            id: 'income-layer',
            type: 'fill',
            source: sourceId,
            paint: {
              'fill-color': [
                'interpolate',
                ['linear'],
                ['get', 'MHI'], // Median Household Income field
                30000, '#d1eeea', // Lower income - lighter color
                60000, '#a8dbd9',
                90000, '#85c4c9',
                120000, '#68abb8',
                150000, '#4f90a6',
                180000, '#3b738f',
                210000, '#2a5674' // Higher income - darker color
              ],
              'fill-opacity': 0.7,
              'fill-outline-color': '#000000'
            },
            layout: {
              visibility: 'none' // Initially hidden
            }
          });
          
          setIncomeDataLoaded(true);
          console.log('Income data layer initialized');
        }
      })
      .catch(error => {
        console.error("Error loading income data:", error);
      });
  }, [mapInitialized, incomeDataLoaded]);

  // Toggle income layer visibility
  useEffect(() => {
    if (!map.current || !mapInitialized || !incomeDataLoaded) return;
    
    const layerId = 'income-layer';
    
    if (map.current.getLayer(layerId)) {
      if (showIncomeLayer) {
        map.current.setLayoutProperty(layerId, 'visibility', 'visible');
        console.log('Income layer visible');
      } else {
        map.current.setLayoutProperty(layerId, 'visibility', 'none');
        console.log('Income layer hidden');
      }
    }
  }, [showIncomeLayer, mapInitialized, incomeDataLoaded]);

  // Make sure neighborhood layers are above income layer
  useEffect(() => {
    if (!map.current || !mapInitialized || !incomeDataLoaded || neighborhoods.length === 0) return;
    
    const incomeLayerId = 'income-layer';
    
    // Move all neighborhood layers above the income layer
    neighborhoods.forEach((_, index) => {
      const neighborhoodLayerId = `neighborhood-boundary-${index}`;
      const outlineId = `neighborhood-outline-${index}`;
      
      if (map.current && map.current.getLayer(neighborhoodLayerId)) {
        map.current.moveLayer(neighborhoodLayerId, incomeLayerId);
        if (map.current.getLayer(outlineId)) {
          map.current.moveLayer(outlineId);
        }
      }
    });
  }, [neighborhoods, incomeDataLoaded, mapInitialized]);

  // Function to update neighborhood boundaries
  const updateNeighborhoodBoundaries = (map: mapboxgl.Map, neighborhoods: NeighborhoodInfo[]) => {
    // Remove existing layers and sources
    neighborhoods.forEach((_, index) => {
      const sourceId = `neighborhood-source-${index}`;
      const layerId = `neighborhood-boundary-${index}`;
      const outlineId = `neighborhood-outline-${index}`;
      
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getLayer(outlineId)) map.removeLayer(outlineId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    });
    
    // Add new layers for each neighborhood
    neighborhoods.forEach((neighborhood, index) => {
      try {
        const sourceId = `neighborhood-source-${index}`;
        const layerId = `neighborhood-boundary-${index}`;
        const outlineId = `neighborhood-outline-${index}`;
        const isMain = neighborhood.isMain;
        
        // Create proper GeoJSON format if needed
        const geojsonData = {
          type: 'Feature',
          geometry: neighborhood.feature.geometry,
          properties: neighborhood.feature.properties || {}
        };
        
        // Add source
        map.addSource(sourceId, {
          type: 'geojson',
          data: geojsonData
        });
        
        // Add fill layer with different colors for main vs adjacent neighborhoods
        map.addLayer({
          id: layerId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': isMain ? '#0080ff' : '#4ade80', // Blue for main, green for adjacent
            'fill-opacity': isMain ? 0.2 : 0.1
          }
        });
        
        // Add outline layer
        map.addLayer({
          id: outlineId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': isMain ? '#0080ff' : '#22c55e',
            'line-width': isMain ? 2 : 1.5,
            'line-dasharray': isMain ? [1, 0] : [2, 1] // Solid for main, dashed for adjacent
          }
        });
        
        // Make sure neighborhood layers are above income layer
        if (incomeDataLoaded) {
          map.moveLayer(layerId, 'income-layer');
          map.moveLayer(outlineId);
        }
        
        console.log(`Added ${isMain ? 'main' : 'adjacent'} neighborhood: ${neighborhood.name}`);
      } catch (error) {
        console.error(`Error adding neighborhood layers for ${neighborhood.name}:`, error);
      }
    });
  };

  // Update map when selected address changes
  useEffect(() => {
    if (map.current && selectedAddress) {
      setIsLoading(true);
      const [lng, lat] = selectedAddress.coordinates;
      
      // Fly to the selected address
      map.current.flyTo({
        center: [lng, lat],
        zoom: 14, // Slightly zoomed out to show adjacent neighborhoods
        essential: true
      });

      // Remove existing marker if it exists
      if (markerRef.current) {
        markerRef.current.remove();
      }

      // Add a new marker
      markerRef.current = new mapboxgl.Marker({ color: '#FF0000' })
        .setLngLat([lng, lat])
        .addTo(map.current);

      // Update viewport state
      setViewport({
        longitude: lng,
        latitude: lat,
        zoom: 14
      });

      // Fetch neighborhood data including adjacent neighborhoods
      console.log('Fetching neighborhood data for:', [lng, lat]);
      fetch(`/api/neighborhoods?lng=${lng}&lat=${lat}&adjacent=true`)
        .then(response => {
          console.log('Neighborhood API response status:', response.status);
          if (response.ok) {
            return response.json();
          }
          throw new Error(`Failed to fetch neighborhood data: ${response.status}`);
        })
        .then(data => {
          console.log('Neighborhood data received:', data);
          
          // Extract main neighborhood and adjacent neighborhoods
          const mainNeighborhoodData = data.data;
          const adjacentNeighborhoodsData = data.adjacentNeighborhoods || [];
          
          // Set the main neighborhood name
          const mainName = mainNeighborhoodData?.properties?.ntaname || mainNeighborhoodData?.properties?.name || null;
          setMainNeighborhood(mainName);
          
          // Extract adjacent neighborhood names for the sales filter
          const adjacentNames = adjacentNeighborhoodsData.map(
            (feature: any) => feature.properties?.ntaname || feature.properties?.name
          ).filter(Boolean);
          setAdjacentNeighborhoodNames(adjacentNames);
          
          // Create the neighborhoods array with main and adjacent
          const neighborhoodsArray: NeighborhoodInfo[] = [
            {
              name: mainName,
              feature: mainNeighborhoodData,
              isMain: true
            },
            ...adjacentNeighborhoodsData.map((feature: any) => ({
              name: feature.properties?.ntaname || feature.properties?.name,
              feature: feature,
              isMain: false
            }))
          ];
          
          setNeighborhoods(neighborhoodsArray);
          
          // Show the sidebar if we have a neighborhood
          if (mainName) {
            setShowSidebar(true);
          }
          
          setIsLoading(false);
        })
        .catch(error => {
          console.error('Error fetching neighborhood data:', error);
          setNeighborhoods([]);
          setMainNeighborhood(null);
          setIsLoading(false);
        });
    }
  }, [selectedAddress, mapInitialized]);

  // Update neighborhood boundaries when neighborhoods change
  useEffect(() => {
    if (map.current && mapInitialized && neighborhoods.length > 0) {
      // Update the boundaries on the map
      updateNeighborhoodBoundaries(map.current, neighborhoods);
      
      // If we have multiple neighborhoods, fit the map to show all of them
      if (neighborhoods.length > 1) {
        // Create a bounds object
        const bounds = new mapboxgl.LngLatBounds();
        
        // Extend the bounds to include all neighborhood coordinates
        neighborhoods.forEach(neighborhood => {
          if (neighborhood.feature && neighborhood.feature.geometry) {
            // Handle different geometry types
            if (neighborhood.feature.geometry.type === 'Polygon') {
              neighborhood.feature.geometry.coordinates[0].forEach((coord: [number, number]) => {
                bounds.extend(coord);
              });
            } else if (neighborhood.feature.geometry.type === 'MultiPolygon') {
              neighborhood.feature.geometry.coordinates.forEach((polygon: any) => {
                polygon[0].forEach((coord: [number, number]) => {
                  bounds.extend(coord);
                });
              });
            }
          }
        });
        
        // Only fit bounds if we have a valid bounds object
        if (!bounds.isEmpty()) {
          map.current.fitBounds(bounds, {
            padding: 50,
            maxZoom: 15
          });
        }
      }
    }
  }, [neighborhoods, mapInitialized]);

  // Handler for sale selection
  const handleSaleSelect = (sale: PropertySale) => {
    setSelectedSale(sale);
    // Additional handling can be added here if needed
  };

  // Handler for opening the property record modal
  const handleViewRecord = (sale: PropertySale) => {
    setSelectedSale(sale);
    setIsRecordModalOpen(true);
  };
  
  // Toggle sidebar visibility
  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  return (
    <div className="relative">
      {/* Sidebar Toggle Button */}
      {mainNeighborhood && (
        <button 
          onClick={toggleSidebar}
          className="absolute top-4 right-4 z-20 bg-white rounded-full p-2 shadow-md"
          title={showSidebar ? "Hide Sales List" : "Show Sales List"}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-6 w-6" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            {showSidebar ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      )}
      
      {/* Income Layer Toggle */}
      <div className="absolute top-4 left-4 z-20 bg-white rounded-lg shadow-md p-2">
        <label className="flex items-center space-x-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showIncomeLayer}
            onChange={(e) => setShowIncomeLayer(e.target.checked)}
            className="form-checkbox h-4 w-4 text-blue-600"
          />
          <span>Show Income Layer</span>
        </label>
      </div>
      
      {/* Income Layer Legend (show only when layer is active) */}
      {showIncomeLayer && (
        <div className="absolute bottom-24 left-4 z-20 bg-white rounded-lg shadow-md p-2">
          <h3 className="text-xs font-bold mb-2">Median Household Income</h3>
          <div className="w-full h-4 bg-gradient-to-r from-[#d1eeea] to-[#2a5674] mb-1"></div>
          <div className="flex justify-between text-xs">
            <span>$30k</span>
            <span>$210k+</span>
          </div>
        </div>
      )}
      
      {/* Map Container */}
      <div ref={mapContainer} className="map-container" />
      
      {/* Loading Indicator */}
      {isLoading && (
        <div className="loading-indicator">
          <div className="flex items-center">
            <svg className="animate-spin h-5 w-5 mr-3 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Loading data...</span>
          </div>
        </div>
      )}
      
      {/* Sales Layer for Neighborhoods */}
      {mapInitialized && showSales && mainNeighborhood && (
        <SalesLayer 
          map={map.current} 
          mapInitialized={mapInitialized}
          selectedNeighborhood={mainNeighborhood}
          adjacentNeighborhoods={adjacentNeighborhoodNames}
          onSaleSelect={handleSaleSelect}
          onViewRecord={handleViewRecord}
        />
      )}
      
      {/* Sales Sidebar for the Neighborhoods */}
      <SalesSidebar 
        neighborhood={mainNeighborhood} 
        adjacentNeighborhoods={adjacentNeighborhoodNames}
        isOpen={showSidebar && !!mainNeighborhood}
        onClose={() => setShowSidebar(false)}
        onViewRecord={handleViewRecord}
      />
      
      {/* Property Record Modal */}
      <PropertyRecordModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        property={selectedSale}
      />
      
      {/* Neighborhood Info Panel - show neighborhoods list */}
      {neighborhoods.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-lg max-w-sm z-10">
          <h3 className="font-bold text-gray-700 mb-2">Neighborhoods</h3>
          <ul className="text-sm space-y-1">
            {neighborhoods.map((n, index) => (
              <li key={index} className="flex items-center">
                <span 
                  className={`w-3 h-3 rounded-full mr-2 ${n.isMain ? 'bg-blue-500' : 'bg-green-500'}`}
                ></span>
                <span className={n.isMain ? 'font-semibold' : ''}>
                  {n.name}
                  {n.isMain ? ' (Selected)' : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default MapView;
