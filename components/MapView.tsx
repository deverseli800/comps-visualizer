import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Using environment variable for Mapbox token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

interface ViewportProps {
  longitude: number;
  latitude: number;
  zoom: number;
}

interface MapViewProps {
  viewport: ViewportProps;
  setViewport: React.Dispatch<React.SetStateAction<ViewportProps>>;
  selectedAddress?: {
    address: string;
    coordinates: [number, number];
    neighborhood?: string;
  };
}

const MapView: React.FC<MapViewProps> = ({ viewport, setViewport, selectedAddress }) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapInitialized, setMapInitialized] = useState(false);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [neighborhoodData, setNeighborhoodData] = useState<any>(null);
  const [propertyData, setPropertyData] = useState<any>(null);

  useEffect(() => {
    if (mapContainer.current && !map.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [viewport.longitude, viewport.latitude],
        zoom: viewport.zoom
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      
      map.current.on('load', () => {
        console.log('Map initialized');
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
  }, [selectedAddress, setViewport]);

  // Add or update neighborhood boundary on the map
  useEffect(() => {
    if (!map.current || !mapInitialized || !neighborhoodData) {
      console.log('Not adding neighborhood layer:', { 
        mapExists: !!map.current, 
        mapInitialized, 
        hasNeighborhoodData: !!neighborhoodData 
      });
      return;
    }

    console.log('Adding neighborhood boundary to map:', neighborhoodData);

    try {
      // Check if the neighborhood layer already exists
      const neighborhoodLayerId = 'neighborhood-boundary';
      const neighborhoodSourceId = 'neighborhood-source';

      // Remove existing layer and source if they exist
      if (map.current.getLayer(neighborhoodLayerId)) {
        map.current.removeLayer(neighborhoodLayerId);
      }
      if (map.current.getLayer('neighborhood-outline')) {
        map.current.removeLayer('neighborhood-outline');
      }
      if (map.current.getSource(neighborhoodSourceId)) {
        map.current.removeSource(neighborhoodSourceId);
      }

      // Add new source and layer for the neighborhood boundary
      map.current.addSource(neighborhoodSourceId, {
        type: 'geojson',
        data: neighborhoodData
      });

      map.current.addLayer({
        id: neighborhoodLayerId,
        type: 'fill',
        source: neighborhoodSourceId,
        paint: {
          'fill-color': '#0080ff',
          'fill-opacity': 0.3,
          'fill-outline-color': '#0080ff'
        }
      });

      // Add the outline layer
      map.current.addLayer({
        id: 'neighborhood-outline',
        type: 'line',
        source: neighborhoodSourceId,
        paint: {
          'line-color': '#0080ff',
          'line-width': 2
        }
      });

      console.log('Successfully added neighborhood boundary');
    } catch (error) {
      console.error('Error adding neighborhood boundary:', error);
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

  return (
    <div>
      <div ref={mapContainer} className="map-container" />
    </div>
  );
};

export default MapView;
