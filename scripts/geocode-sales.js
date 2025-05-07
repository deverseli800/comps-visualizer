/**
 * Script to convert Excel sales data to geocoded GeoJSON
 * 
 * This script:
 * 1. Reads Excel file with rolling sales data
 * 2. Extracts multifamily properties (C and D class buildings, excluding co-ops)
 * 3. Geocodes addresses using Mapbox API
 * 4. Saves results as GeoJSON for use in the application
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables from .env.local instead of .env
const envPath = path.resolve(__dirname, '..', '.env.local');
dotenv.config({ path: envPath });

// Mapbox API token (from .env.local file)
const MAPBOX_TOKEN = "pk.eyJ1IjoiZGV2ZXJzZWxpODAwIiwiYSI6ImNtYTh0NnEzZzFoc3Iya285Mm5wZmRmOXUifQ.-X-WQD4UFusGNKQkvk79Lw"

// Confirm token is loaded
if (!MAPBOX_TOKEN) {
  console.error('Error: Mapbox token not found in environment variables');
  console.error(`Looked for .env.local at: ${envPath}`);
  console.error('Please ensure NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is set in .env.local');
  process.exit(1);
} else {
  console.log('Mapbox token loaded successfully');
}

// Paths
const DATA_DIR = path.join(__dirname, '..', 'data');
const EXCEL_FILE = path.join(DATA_DIR, 'rollingsales_manhattan.xlsx');
const OUTPUT_FILE = path.join(DATA_DIR, 'manhattan_sales_geocoded.geojson');

// Delay helper function to respect API rate limits
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Geocode an address using Mapbox API
async function geocodeAddress(address) {
  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${MAPBOX_TOKEN}&country=us&types=address&bbox=-74.25909,40.477399,-73.700181,40.916178&limit=1`;
    
    const response = await axios.get(url);
    
    if (response.data && response.data.features && response.data.features.length > 0) {
      const [lng, lat] = response.data.features[0].center;
      return [lng, lat];
    }
    
    return null;
  } catch (error) {
    console.error(`Error geocoding address "${address}":`, error.message);
    if (error.response) {
      console.error(`Status code: ${error.response.status}`);
      console.error(`Response data:`, error.response.data);
    }
    return null;
  }
}

// Main function
async function processRollingSalesData() {
  console.log('Reading Excel file...');
  
  // Check if Excel file exists
  if (!fs.existsSync(EXCEL_FILE)) {
    console.error(`Excel file not found: ${EXCEL_FILE}`);
    console.error('Please place the rolling sales Excel file in the data directory.');
    process.exit(1);
  }
  
  // Read and parse Excel file
  const workbook = XLSX.readFile(EXCEL_FILE);
  const worksheet = workbook.Sheets['Manhattan'];
  
  if (!worksheet) {
    console.error('Manhattan worksheet not found in the Excel file.');
    process.exit(1);
  }
  
  // Define column indices based on the structure we analyzed
  const columns = {
    BOROUGH: 0,
    NEIGHBORHOOD: 1,
    BUILDING_CLASS_CATEGORY: 2,
    BLOCK: 4,
    LOT: 5,
    BUILDING_CLASS: 7,  // BUILDING CLASS AT TIME OF SALE
    ADDRESS: 8,
    ZIP_CODE: 10,
    RESIDENTIAL_UNITS: 11,
    COMMERCIAL_UNITS: 12,
    TOTAL_UNITS: 13,
    LAND_SQFT: 14,
    GROSS_SQFT: 15,
    YEAR_BUILT: 16,
    SALE_PRICE: 19,
    SALE_DATE: 20
  };
  
  // Extract data starting from row 11 (index 10)
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  const sales = [];
  
  console.log('Extracting multifamily sales data...');
  
  for (let r = 10; r <= range.e.r; r++) {
    // Get building class first to filter
    const buildingClassCell = XLSX.utils.encode_cell({r, c: columns.BUILDING_CLASS});
    if (!worksheet[buildingClassCell]) continue;
    
    const buildingClass = worksheet[buildingClassCell].v.toString();
    
    // Only include C and D building classes (multifamily)
    if (buildingClass.startsWith('C') || buildingClass.startsWith('D')) {
      // Skip co-ops (C6, D4)
      if (buildingClass === 'C6' || buildingClass === 'D4' || buildingClass === 'CC' || buildingClass === 'D0') {
        continue;
      }
      
      // Extract each field we need
      const block = worksheet[XLSX.utils.encode_cell({r, c: columns.BLOCK})]?.v;
      const lot = worksheet[XLSX.utils.encode_cell({r, c: columns.LOT})]?.v;
      const address = worksheet[XLSX.utils.encode_cell({r, c: columns.ADDRESS})]?.v;
      const zipCode = worksheet[XLSX.utils.encode_cell({r, c: columns.ZIP_CODE})]?.v;
      const neighborhood = worksheet[XLSX.utils.encode_cell({r, c: columns.NEIGHBORHOOD})]?.v;
      const price = worksheet[XLSX.utils.encode_cell({r, c: columns.SALE_PRICE})]?.v;
      const resUnits = worksheet[XLSX.utils.encode_cell({r, c: columns.RESIDENTIAL_UNITS})]?.v;
      const commUnits = worksheet[XLSX.utils.encode_cell({r, c: columns.COMMERCIAL_UNITS})]?.v;
      const totalUnits = worksheet[XLSX.utils.encode_cell({r, c: columns.TOTAL_UNITS})]?.v;
      const yearBuilt = worksheet[XLSX.utils.encode_cell({r, c: columns.YEAR_BUILT})]?.v;
      const landSqFt = worksheet[XLSX.utils.encode_cell({r, c: columns.LAND_SQFT})]?.v;
      const grossSqFt = worksheet[XLSX.utils.encode_cell({r, c: columns.GROSS_SQFT})]?.v;
      const saleDate = worksheet[XLSX.utils.encode_cell({r, c: columns.SALE_DATE})]?.v;
      
      // Format the address for geocoding
      const fullAddress = address ? 
        `${address}, Manhattan, New York, NY ${zipCode || ''}` : null;
      
      if (fullAddress) {
        sales.push({
          id: `${block}-${lot}`,
          address: fullAddress,
          originalAddress: address,
          neighborhood: neighborhood || 'Unknown',
          buildingClass,
          price: price || 0,
          units: totalUnits || 0,
          residentialUnits: resUnits || 0,
          commercialUnits: commUnits || 0,
          yearBuilt: yearBuilt || 0,
          landSqFt: landSqFt || 0,
          grossSqFt: grossSqFt || 0,
          saleDate: saleDate || null
        });
      }
    }
  }
  
  console.log(`Found ${sales.length} multifamily sales to geocode`);
  
  // Geocode addresses in batches to respect API rate limits
  const batchSize = 5;
  const delayMs = 1000; // 1 second between batches
  const geocodedSales = [];
  
  console.log('Geocoding addresses in batches...');
  
  for (let i = 0; i < sales.length; i += batchSize) {
    const batch = sales.slice(i, Math.min(i + batchSize, sales.length));
    console.log(`Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(sales.length/batchSize)}`);
    
    const promises = batch.map(async (sale) => {
      const location = await geocodeAddress(sale.address);
      return {
        ...sale,
        location
      };
    });
    
    const geocodedBatch = await Promise.all(promises);
    geocodedSales.push(...geocodedBatch);
    
    // Add delay between batches to respect API rate limits
    if (i + batchSize < sales.length) {
      console.log(`Waiting ${delayMs}ms before next batch...`);
      await delay(delayMs);
    }
  }
  
  // Filter out sales without geocoded locations
  const validSales = geocodedSales.filter(sale => sale.location !== null);
  
  console.log(`Successfully geocoded ${validSales.length} out of ${sales.length} sales`);
  
  // Convert to GeoJSON
  const geojson = {
    type: 'FeatureCollection',
    features: validSales.map(sale => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: sale.location
      },
      properties: {
        id: sale.id,
        address: sale.originalAddress,
        fullAddress: sale.address,
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
    }))
  };
  
  // Save GeoJSON to file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(geojson, null, 2));
  
  console.log(`GeoJSON saved to ${OUTPUT_FILE}`);
}

// Run the script
processRollingSalesData().catch(err => {
  console.error('Error processing sales data:', err);
  process.exit(1);
});
