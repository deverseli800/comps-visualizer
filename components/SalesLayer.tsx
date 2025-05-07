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
  onSaleSelect?: (sale: PropertySale) => void;
}

const SalesLayer: React.FC<SalesLayerProps> = ({ 
  map, 
  mapInitialized, 
  selectedNeighborhood,
  onSaleSelect
}) => {
  const [salesData, setSalesData] = useState<PropertySale[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch sales data when neighborhood changes
  useEffect(() => {
    async function fetchSalesData() {
      setLoading(true);
      setError(null);
      
      try {
        let url = '/api/data/sales?format=json';
        if (selectedNeighborhood) {
          url += `&neighborhood=${encodeURIComponent(selectedNeighborhood)}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch sales data: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        setSalesData(data);
      } catch (err) {
        console.error('Error fetching sales data:', err);
        setError('Failed to load sales data');
      } finally {
        setLoading(false);
      }
    }
    
    if (mapInitialized) {
      fetchSalesData();
    }
  }, [mapInitialized, selectedNeighborhood]);
  
  // Add sales markers to the map
  useEffect(() => {
    if (!map || !mapInitialized || !salesData.length) return;
    
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
    
    // Prepare GeoJSON data
    const geojsonData = {
      type: 'FeatureCollection',
      features: salesData
        .filter(sale => sale.location)
        .map(sale => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: sale.location as [number, number]
          },
          properties: {
            id: sale.id,
            address: sale.address,
            neighborhood: sale.neighborhood,
            buildingClass: sale.buildingClass,
            price: sale.price,
            units: sale.units,
            residentialUnits: sale.residentialUnits,
            commercialUnits: sale.commercialUnits,
            yearBuilt: sale.yearBuilt,
            landSqFt: sale.landSqFt,
            grossSqFt: sale.grossSqFt,
            saleDate: typeof sale.saleDate === 'string' 
              ? sale.saleDate 
              : (sale.saleDate as Date).toISOString()
          }
        }))
    };
    
    // Add source
    map.addSource(salesSourceId, {
      type: 'geojson',
      data: geojsonData as any,
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
        'circle-stroke-color': '#ffffff'
      }
    });
    
    // Add click handler for individual sale points
    map.on('click', salesLayerId, (e) => {
      if (!e.features || e.features.length === 0) return;
      
      const feature = e.features[0];
      const props = feature.properties;
      const coordinates = feature.geometry.coordinates.slice() as [number, number];
      
      // Create popup content
      const formattedPrice = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
      }).format(props.price);
      
      const formattedDate = new Date(props.saleDate).toLocaleDateString();
      
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
