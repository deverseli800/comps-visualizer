import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import SalesLayer from './SalesLayer';
import SalesSidebar from './SalesSidebar';

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
  const [neighborhoodData, setNeighborhoodData] = useState<any>(null);
  const [selectedSale, setSelectedSale] = useState<PropertySale | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showSidebar, setShowSidebar] = useState<boolean>(false);
  const [currentNeighborhood, setCurrentNeighborhood] = useState<string | null>(null);

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

  // Function to update neighborhood boundaries
  const updateNeighborhoodBoundary = (map: mapboxgl.Map, data: any) => {
    console.log('Updating neighborhood boundary with data:', data.properties?.ntaname || data.properties?.name);
    
    // Remove existing layers
    const sourceId = 'neighborhood-source';
    const layerId = 'neighborhood-boundary';
    const outlineId = 'neighborhood-outline';
    
    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getLayer(outlineId)) map.removeLayer(outlineId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);
    
    try {
      // Create proper GeoJSON format if needed
      const geojsonData = {
        type: 'Feature',
        geometry: data.geometry,
        properties: data.properties || {}
      };
      
      console.log('Using GeoJSON data with geometry type:', geojsonData.geometry.type);
      
      // Add new source
      map.addSource(sourceId, {
        type: 'geojson',
        data: geojsonData
      });
      
      // Add fill layer
      map.addLayer({
        id: layerId,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': '#0080ff',
          'fill-opacity': 0.2
        }
      });
      
      // Add outline layer
      map.addLayer({
        id: outlineId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': '#0080ff',
          'line-width': 2
        }
      });
      
      console.log('Successfully added neighborhood boundary layers');
    } catch (error) {
      console.error('Error adding neighborhood layers:', error);
    }
  };

  // Update map when selected address changes
  useEffect(() => {
    if (map.current && selectedAddress) {
      setIsLoading(true);
      const [lng, lat] = selectedAddress.coordinates;
      
      // Fly to the selected address
      map.current.flyTo({
        center: [lng, lat],
        zoom: 15,
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
        zoom: 15
      });

      // Fetch neighborhood data
      console.log('Fetching neighborhood data for:', [lng, lat]);
      fetch(`/api/neighborhoods?lng=${lng}&lat=${lat}`)
        .then(response => {
          console.log('Neighborhood API response status:', response.status);
          if (response.ok) {
            return response.json();
          }
          throw new Error(`Failed to fetch neighborhood data: ${response.status}`);
        })
        .then(data => {
          console.log('Neighborhood data received:', data);
          setNeighborhoodData(data.data);
          
          // Set the current neighborhood name for the sidebar
          const neighborhoodName = data.data?.properties?.ntaname || data.data?.properties?.name || null;
          setCurrentNeighborhood(neighborhoodName);
          
          // Show the sidebar if we have a neighborhood
          if (neighborhoodName) {
            setShowSidebar(true);
          }
          
          // If map is initialized, update boundary immediately
          if (map.current && mapInitialized && data.data) {
            // Force the map to wait until it's fully initialized
            setTimeout(() => {
              if (map.current) {
                updateNeighborhoodBoundary(map.current, data.data);
              }
            }, 100);
          }
          
          setIsLoading(false);
        })
        .catch(error => {
          console.error('Error fetching neighborhood data:', error);
          setNeighborhoodData(null);
          setCurrentNeighborhood(null);
          setIsLoading(false);
        });
    }
  }, [selectedAddress, mapInitialized]);

  // Update neighborhood boundary when data or map changes
  useEffect(() => {
    if (map.current && mapInitialized && neighborhoodData) {
      // Force the map to wait until it's fully initialized
      setTimeout(() => {
        if (map.current) {
          updateNeighborhoodBoundary(map.current, neighborhoodData);
        }
      }, 200);
    }
  }, [neighborhoodData, mapInitialized]);

  // Handler for sale selection
  const handleSaleSelect = (sale: PropertySale) => {
    setSelectedSale(sale);
    console.log('Selected sale:', sale);
    // Additional handling can be added here if needed
  };

  // Toggle sidebar visibility
  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  return (
    <div className="relative">
      {/* Sidebar Toggle Button */}
      {currentNeighborhood && (
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
      
      {/* Sales Layer */}
      {mapInitialized && showSales && (
        <SalesLayer 
          map={map.current} 
          mapInitialized={mapInitialized}
          selectedNeighborhood={currentNeighborhood}
          onSaleSelect={handleSaleSelect}
        />
      )}
      
      {/* Sales Sidebar */}
      <SalesSidebar 
        neighborhood={currentNeighborhood} 
        isOpen={showSidebar && !!currentNeighborhood}
        onClose={() => setShowSidebar(false)}
      />
    </div>
  );
};

export default MapView;
