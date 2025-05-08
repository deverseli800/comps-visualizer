import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Function to read the GeoJSON file
async function readSalesGeoJSON() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'manhattan_sales_geocoded.geojson');

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error('GeoJSON file not found at:', filePath);
      throw new Error('GeoJSON file not found');
    }

    // Read and parse the file
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return data;
  } catch (error) {
    console.error('Error reading GeoJSON file:', error);
    throw error;
  }
}

// Function to convert GeoJSON features to simple sales objects
function convertToSalesObjects(data: any) {
  try {
    if (!data.features || !Array.isArray(data.features)) {
      console.error('Invalid GeoJSON data: no features array');
      return [];
    }

    return data.features.map((feature: any) => {
      const props = feature.properties;
      const coords = feature.geometry.coordinates;

      // Convert Excel date numbers to ISO date strings, if needed
      let saleDate = props.saleDate;
      if (typeof saleDate === 'number') {
        // Excel dates are number of days since 1900-01-01 (with a leap year bug)
        // Add days to the date 1899-12-30 to get the correct date
        const excelEpoch = new Date(1899, 11, 30);
        excelEpoch.setDate(excelEpoch.getDate() + saleDate);
        saleDate = excelEpoch.toISOString().split('T')[0]; // YYYY-MM-DD
      }

      return {
        id: props.id,
        address: props.address,
        fullAddress: props.fullAddress,
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
        location: coords
      };
    });
  } catch (error) {
    console.error('Error converting GeoJSON to sales objects:', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'json';
    const neighborhood = searchParams.get('neighborhood');
    const minPrice = parseInt(searchParams.get('minPrice') || '0', 10);
    const maxPrice = parseInt(searchParams.get('maxPrice') || '999999999', 10);
    const minUnits = parseInt(searchParams.get('minUnits') || '0', 10);
    const maxUnits = parseInt(searchParams.get('maxUnits') || '999', 10);
    const buildingClass = searchParams.get('buildingClass');

    // Read the geocoded sales data
    const geojsonData = await readSalesGeoJSON();

    // Apply filters to the GeoJSON features if needed
    let filteredFeatures = geojsonData.features;

    if (neighborhood) {
      console.log('Filtering by neighborhood:', neighborhood);
      console.log('Sample neighborhoods in data:', filteredFeatures.slice(0, 5).map((f: any) => f.properties.neighborhood));

      filteredFeatures = filteredFeatures.filter((feature: any) => {
        const featureNeighborhood = feature.properties.neighborhood?.toLowerCase() || '';
        const searchNeighborhood = neighborhood.toLowerCase();
        return featureNeighborhood === searchNeighborhood;
      });

      console.log(`Found ${filteredFeatures.length} properties in ${neighborhood}`);
    }

    if (minPrice > 0 || maxPrice < 999999999) {
      filteredFeatures = filteredFeatures.filter((feature: any) =>
          feature.properties.price >= minPrice && feature.properties.price <= maxPrice
      );
    }

    if (minUnits > 0 || maxUnits < 999) {
      filteredFeatures = filteredFeatures.filter((feature: any) =>
          feature.properties.units >= minUnits && feature.properties.units <= maxUnits
      );
    }

    if (buildingClass) {
      filteredFeatures = filteredFeatures.filter((feature: any) =>
          feature.properties.buildingClass.startsWith(buildingClass)
      );
    }

    // Return data in the requested format
    if (format === 'geojson') {
      // Return data in GeoJSON format
      return NextResponse.json({
        type: 'FeatureCollection',
        features: filteredFeatures
      });
    } else {
      // Return data as an array of sales objects
      const salesObjects = convertToSalesObjects({
        features: filteredFeatures
      });
      return NextResponse.json(salesObjects);
    }
  } catch (error) {
    console.error('Error serving sales data:', error);
    return NextResponse.json(
        {
          error: 'Failed to load sales data',
          message: error instanceof Error ? error.message : 'An error occurred while loading the sales data.'
        },
        { status: 500 }
    );
  }
}
