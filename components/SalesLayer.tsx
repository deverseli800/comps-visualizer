import React, { useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';

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

interface SalesLayerProps {
  map: mapboxgl.Map | null;
  mapInitialized: boolean;
  selectedNeighborhood?: string;
  adjacentNeighborhoods?: string[];
  onSaleSelect?: (sale: PropertySale) => void;
}

const SalesLayer: React.FC<SalesLayerProps> = ({ 
  map, 
  mapInitialized, 
  selectedNeighborhood,
  adjacentNeighborhoods = [],
  onSaleSelect
}) => {
  const [salesData, setSalesData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch sales data when component mounts or neighborhood changes
  useEffect(() => {
    async function fetchSalesData() {
      if (!mapInitialized) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Use the API endpoint that serves the data in GeoJSON format
        let url = '/api/data/sales?format=geojson';
        if (selectedNeighborhood) {
          console.log('Selected neighborhood:', selectedNeighborhood);
          url += `&neighborhood=${encodeURIComponent(selectedNeighborhood)}`;
          
          // Include adjacent neighborhoods if available
          if (adjacentNeighborhoods && adjacentNeighborhoods.length > 0) {
            console.log('Including adjacent neighborhoods:', adjacentNeighborhoods);
            url += `&includeAdjacent=true&adjacentNeighborhoods=${encodeURIComponent(adjacentNeighborhoods.join(','))}`;
          }
        }
        
        console.log('Fetching sales data from:', url);
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch sales data: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Sales data loaded:', data.features?.length, 'properties');
        setSalesData(data);
      } catch (err) {
        console.error('Error fetching sales data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load sales data');
      } finally {
        setLoading(false);
      }
    }
    
    if (mapInitialized) {
      fetchSalesData();
    }
  }, [mapInitialized, selectedNeighborhood, adjacentNeighborhoods]);
  
  // Add sales markers to the map
  useEffect(() => {
    if (!map || !mapInitialized || !salesData || !salesData.features?.length) {
      return;
    }
    
    // Source ID and layer ID for sales data
    const salesSourceId = 'sales-source';
    const salesLayerId = 'sales-points';
    const salesClusterId = 'sales-clusters';
    const salesCountId = 'sales-count';
    
    // Remove existing layers and source if they exist
    if (map.getLayer(salesLayerId)) map.removeLayer(salesLayerId);
    if (map.getLayer(salesClusterId)) map.removeLayer(salesClusterId);
    if (map.getLayer(salesCountId)) map.removeLayer(salesCountId);
    if (map.getSource(salesSourceId)) map.removeSource(salesSourceId);
    
    // Add source
    map.addSource(salesSourceId, {
      type: 'geojson',
      data: salesData,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50
    });
    
    // Add cluster layer
    map.addLayer({
      id: salesClusterId,
      type: 'circle',
      source: salesSourceId,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#51bbd6',  // 0-9 sales
          10,
          '#f1f075',  // 10-49 sales
          50,
          '#f28cb1'   // 50+ sales
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          20,         // 0-9 sales: 20px radius
          10,
          25,         // 10-49 sales: 25px radius
          50,
          30          // 50+ sales: 30px radius
        ]
      }
    });
    
    // Add cluster count label
    map.addLayer({
      id: salesCountId,
      type: 'symbol',
      source: salesSourceId,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 12
      }
    });
    
    // Add individual sale points
    map.addLayer({
    id: salesLayerId,
    type: 'circle',
    source: salesSourceId,
    filter: ['!', ['has', 'point_count']],
    paint: {
    'circle-color': [
    'interpolate',
    ['linear'],
    ['get', 'price'],
    100000, '#2c7bb6',   // $100K or less: blue
    1000000, '#ffffbf',  // $1M: yellow
    5000000, '#d7191c'   // $5M+: red
    ],
    'circle-radius': 8,
    'circle-stroke-width': 2,
    'circle-stroke-color': [
        'case',
          // Use different stroke colors based on neighborhood
          ['==', ['get', 'isMainNeighborhood'], true],
          '#ffffff', // White stroke for main neighborhood
          '#15803d'  // Green stroke for adjacent neighborhoods
        ]
      }
    });
    
    // Add click handler for individual sale points
    map.on('click', salesLayerId, (e) => {
      if (!e.features || e.features.length === 0) return;
      
      const feature = e.features[0];
      const props = feature.properties;
      const coordinates = feature.geometry.coordinates.slice() as [number, number];
      
      // Format the price with a dollar sign and commas
      const formattedPrice = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
      }).format(props.price);
      
      // Format the sale date
      const formattedDate = props.saleDate ? 
        new Date(props.saleDate).toLocaleDateString() : 'Unknown';
      
      // Create popup content
      const popupContent = `
        <div class="p-3">
          <h3 class="font-bold text-lg">${formattedPrice}</h3>
          <p class="text-sm font-medium">${props.address}</p>
          <div class="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
            <div>
              <span class="font-medium">Building Class:</span> ${props.buildingClass}
            </div>
            <div>
              <span class="font-medium">Units:</span> ${props.units}
            </div>
            <div>
              <span class="font-medium">Built:</span> ${props.yearBuilt}
            </div>
            <div>
              <span class="font-medium">Sale Date:</span> ${formattedDate}
            </div>
            <div class="col-span-2">
              <span class="font-medium">Price Per Unit:</span> ${Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                maximumFractionDigits: 0
              }).format(props.price / Math.max(1, props.units))}
            </div>
            <div class="col-span-2">
              <span class="font-medium">Building Size:</span> ${props.grossSqFt?.toLocaleString() || 'N/A'} sq ft
            </div>
          </div>
        </div>
      `;
      
      // Create popup
      new mapboxgl.Popup()
        .setLngLat(coordinates)
        .setHTML(popupContent)
        .addTo(map);
      
      // Call onSaleSelect if provided
      if (onSaleSelect) {
        onSaleSelect({
          id: props.id,
          address: props.address,
          neighborhood: props.neighborhood,
          buildingClass: props.buildingClass,
          price: props.price,
          units: props.units,
          residentialUnits: props.residentialUnits,
          commercialUnits: props.commercialUnits,
          yearBuilt: props.yearBuilt,
          landSqFt: props.landSqFt,
          grossSqFt: props.grossSqFt,
          saleDate: props.saleDate,
          location: coordinates
        });
      }
    });
    
    // Change cursor to pointer when hovering over sales points
    map.on('mouseenter', salesLayerId, () => {
      if (map) {
        map.getCanvas().style.cursor = 'pointer';
      }
    });
    
    map.on('mouseleave', salesLayerId, () => {
      if (map) {
        map.getCanvas().style.cursor = '';
      }
    });
    
    // Add click handler for clusters
    map.on('click', salesClusterId, (e) => {
      if (!e.features || e.features.length === 0) return;
      
      const feature = e.features[0];
      const clusterId = feature.properties?.cluster_id;
      const source = map.getSource(salesSourceId) as mapboxgl.GeoJSONSource;
      
      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return;
        
        map.easeTo({
          center: (feature.geometry as GeoJSON.Point).coordinates as [number, number],
          zoom: zoom
        });
      });
    });
    
    // Change cursor to pointer when hovering over clusters
    map.on('mouseenter', salesClusterId, () => {
      if (map) {
        map.getCanvas().style.cursor = 'pointer';
      }
    });
    
    map.on('mouseleave', salesClusterId, () => {
      if (map) {
        map.getCanvas().style.cursor = '';
      }
    });
    
    // Return cleanup function to remove event handlers
    return () => {
      // Clean up event listeners when component unmounts
      if (map) {
        map.off('click', salesLayerId);
        map.off('mouseenter', salesLayerId);
        map.off('mouseleave', salesLayerId);
        map.off('click', salesClusterId);
        map.off('mouseenter', salesClusterId);
        map.off('mouseleave', salesClusterId);
      }
    };
  }, [map, mapInitialized, salesData, onSaleSelect]);

  // This component doesn't render anything directly
  return null;
};

export default SalesLayer;
