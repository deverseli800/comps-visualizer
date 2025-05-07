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
}

const MapView: React.FC<MapViewProps> = ({ viewport, setViewport }) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapInitialized, setMapInitialized] = useState(false);

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

  return (
    <div>
      <div ref={mapContainer} className="map-container" />
    </div>
  );
};

export default MapView;
