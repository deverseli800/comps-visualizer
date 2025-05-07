import fs from 'fs';
import path from 'path';

// Types for our sales data
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

interface SalesGeoJSON {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: {
      type: 'Point';
      coordinates: [number, number]; // [longitude, latitude]
    };
    properties: any;
  }>;
}

// Get all sales data
export async function getSalesData(): Promise<PropertySale[]> {
  try {
    if (typeof window !== 'undefined') {
      // In browser environment, fetch from our API
      console.log('[Lib] Loading sales data from API');
      const response = await fetch('/api/data/sales');
      if (!response.ok) {
        throw new Error('Failed to load sales data from API');
      }
      return await response.json();
    } else {
      // In Node.js environment (API routes), load from the GeoJSON file
      console.log('[Lib] Loading sales data from GeoJSON file');
      const filePath = path.join(process.cwd(), 'data', 'manhattan_sales_geocoded.geojson');
      
      // Check if GeoJSON file exists
      if (!fs.existsSync(filePath)) {
        console.warn('GeoJSON file not found. Using mock data instead.');
        return getMockGeocodedSales();
      }
      
      // Read and parse the GeoJSON file
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8')) as SalesGeoJSON;
      
      // Convert GeoJSON features to PropertySale objects
      return data.features.map(feature => {
        const props = feature.properties;
        
        // Convert Excel date numbers to JavaScript Date objects, if needed
        let saleDate = props.saleDate;
        if (typeof saleDate === 'number') {
          // Excel dates are number of days since 1900-01-01 (with a leap year bug)
          // Add days to the date 1899-12-30 to get the correct date
          const excelEpoch = new Date(1899, 11, 30);
          excelEpoch.setDate(excelEpoch.getDate() + saleDate);
          saleDate = excelEpoch.toISOString();
        }
        
        return {
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
          saleDate: saleDate,
          location: feature.geometry.coordinates as [number, number]
        };
      });
    }
  } catch (error) {
    console.error('Error loading sales data:', error);
    // Return mock data if there's an error
    return getMockGeocodedSales();
  }
}

// Get sales data by neighborhood
export async function getSalesByNeighborhood(neighborhoodName: string): Promise<PropertySale[]> {
  const allSales = await getSalesData();
  return allSales.filter(sale => 
    sale.neighborhood.toLowerCase() === neighborhoodName.toLowerCase()
  );
}

// Convert sales data to GeoJSON format for mapping
export function convertToGeoJSON(sales: PropertySale[]): SalesGeoJSON {
  const features = sales
    .filter(sale => sale.location)
    .map(sale => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
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
        saleDate: sale.saleDate
      }
    }));
  
  return {
    type: 'FeatureCollection',
    features
  };
}

// Mock geocoded data for development (fallback when GeoJSON file is not available)
export function getMockGeocodedSales(): PropertySale[] {
  // This data would typically come from a cache or database
  // For now, we'll just return a small sample with hardcoded coordinates
  return [
    {
      id: '385-38',
      address: '21-23 AVENUE C, 4C, Manhattan, New York, NY 10009',
      neighborhood: 'ALPHABET CITY',
      buildingClass: 'C4',
      price: 210326,
      units: 22,
      residentialUnits: 20,
      commercialUnits: 2,
      yearBuilt: 1900,
      landSqFt: 3315,
      grossSqFt: 17160,
      saleDate: '2024-05-15',
      location: [-73.978964, 40.723632]
    },
    {
      id: '392-33',
      address: '155 AVENUE C, 4A, Manhattan, New York, NY 10009',
      neighborhood: 'ALPHABET CITY',
      buildingClass: 'C7',
      price: 2000000,
      units: 18,
      residentialUnits: 17,
      commercialUnits: 1,
      yearBuilt: 1900,
      landSqFt: 1909,
      grossSqFt: 8441,
      saleDate: '2024-06-22',
      location: [-73.976512, 40.725789]
    },
    {
      id: '406-14',
      address: '516 EAST 13TH STREET, Manhattan, New York, NY 10009',
      neighborhood: 'ALPHABET CITY',
      buildingClass: 'C1',
      price: 11032000,
      units: 10,
      residentialUnits: 10,
      commercialUnits: 0,
      yearBuilt: 1910,
      landSqFt: 2581,
      grossSqFt: 10010,
      saleDate: '2024-07-01',
      location: [-73.977284, 40.729356]
    }
  ];
}
