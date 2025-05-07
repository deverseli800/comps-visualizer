import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import SalesLayer from './SalesLayer';

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
  const [propertyData, setPropertyData] = useState<any>(null);
  const [selectedSale, setSelectedSale] = useState<PropertySale | null>(null);

  // Map initialization
  useEffect(() => {
    if (mapContainer.current && !map.current) {
      console.log('Creating map instance');
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v11',
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
          'fill-opacity': 0.3
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
          
          // If map is initialized, update boundary immediately
          if (map.current && mapInitialized && data.data) {
            // Force the map to wait until it's fully initialized
            setTimeout(() => {
              if (map.current) {
                updateNeighborhoodBoundary(map.current, data.data);
              }
            }, 100);
          }
          
          // After getting neighborhood data, fetch properties
          return fetch(`/api/properties?lng=${lng}&lat=${lat}`);
        })
        .then(response => {
          if (response.ok) {
            return response.json();
          }
          throw new Error('Failed to fetch property data');
        })
        .then(data => {
          setPropertyData(data.properties);
        })
        .catch(error => {
          console.error('Error fetching data:', error);
          setNeighborhoodData(null);
          setPropertyData(null);
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

  // Add or update property markers on the map
  useEffect(() => {
    if (!map.current || !mapInitialized || !propertyData) {
      console.log('Not adding property layer:', { 
        mapExists: !!map.current, 
        mapInitialized, 
        hasPropertyData: !!propertyData 
      });
      return;
    }

    console.log('Adding property points to map:', propertyData);

    try {
      // Check if the property layer already exists
      const propertyLayerId = 'property-points';
      const propertySourceId = 'property-source';

      // Remove existing layer and source if they exist
      if (map.current.getLayer(propertyLayerId)) {
        map.current.removeLayer(propertyLayerId);
      }
      if (map.current.getSource(propertySourceId)) {
        map.current.removeSource(propertySourceId);
      }

      // Add new source and layer for the properties
      map.current.addSource(propertySourceId, {
        type: 'geojson',
        data: propertyData
      });

      map.current.addLayer({
        id: propertyLayerId,
        type: 'circle',
        source: propertySourceId,
        paint: {
          'circle-radius': 6,
          'circle-color': '#FF0000',
          'circle-stroke-width': 1,
          'circle-stroke-color': '#FFFFFF'
        }
      });

      // Add property popups when clicking on property points
      map.current.on('click', propertyLayerId, (e) => {
        if (!e.features || e.features.length === 0) return;

        const feature = e.features[0];
        const props = feature.properties;
        const coordinates = feature.geometry.coordinates.slice();
        
        // Create popup content
        const popupContent = `
          <div class="p-2">
            <h3 class="font-bold">${props.address}</h3>
            <p>Building Type: ${props.buildingClass}</p>
            <p>Year Built: ${props.yearBuilt}</p>
            <p>Floors: ${props.numFloors}</p>
            <p>Lot Area: ${props.lotArea} sq ft</p>
            <p>Assessed Value: $${props.assessedValue.toLocaleString()}</p>
          </div>
        `;

        // Create popup
        new mapboxgl.Popup()
          .setLngLat(coordinates)
          .setHTML(popupContent)
          .addTo(map.current);
      });

      // Change cursor to pointer when hovering over a property
      map.current.on('mouseenter', propertyLayerId, () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = 'pointer';
        }
      });

      map.current.on('mouseleave', propertyLayerId, () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = '';
        }
      });

      console.log('Successfully added property points');
    } catch (error) {
      console.error('Error adding property points:', error);
    }
  }, [propertyData, mapInitialized]);

  // Handler for sale selection
  const handleSaleSelect = (sale: PropertySale) => {
    setSelectedSale(sale);
    // Additional handling can be added here
  };

  return (
    <div>
      <div ref={mapContainer} className="map-container" />
      {mapInitialized && showSales && (
        <SalesLayer 
          map={map.current} 
          mapInitialized={mapInitialized}
          selectedNeighborhood={neighborhoodData?.properties?.name || neighborhoodData?.properties?.ntaname}
          onSaleSelect={handleSaleSelect}
        />
      )}
    </div>
  );
};

export default MapView;
