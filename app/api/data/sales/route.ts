import { NextRequest, NextResponse } from 'next/server';
import { getSalesData, getMockGeocodedSales, convertToGeoJSON } from '@/lib/salesData';

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
    
    // For development, use mock geocoded data to avoid API calls
    // In production, you would use the actual geocoded data from a database
    let salesData = await getMockGeocodedSales();
    
    // In production, you would use this code:
    // let salesData = await getSalesData();
    
    // Apply filters
    if (neighborhood) {
      salesData = salesData.filter(sale => 
        sale.neighborhood.toLowerCase() === neighborhood.toLowerCase()
      );
    }
    
    if (minPrice > 0 || maxPrice < 999999999) {
      salesData = salesData.filter(sale => 
        sale.price >= minPrice && sale.price <= maxPrice
      );
    }
    
    if (minUnits > 0 || maxUnits < 999) {
      salesData = salesData.filter(sale => 
        sale.units >= minUnits && sale.units <= maxUnits
      );
    }
    
    if (buildingClass) {
      salesData = salesData.filter(sale => 
        sale.buildingClass.startsWith(buildingClass)
      );
    }
    
    // Return data in the requested format
    if (format === 'geojson') {
      return NextResponse.json(convertToGeoJSON(salesData));
    } else {
      return NextResponse.json(salesData);
    }
  } catch (error) {
    console.error('Error serving sales data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to load sales data',
        message: 'An error occurred while loading the sales data.'
      }, 
      { status: 500 }
    );
  }
}
