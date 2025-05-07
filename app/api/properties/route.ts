import { NextRequest, NextResponse } from 'next/server';
import { findNeighborhood } from '@/lib/neighborhoodData';
import { generateMockProperties } from '@/lib/propertyData';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lng = parseFloat(searchParams.get('lng') || '0');
  const lat = parseFloat(searchParams.get('lat') || '0');

  if (isNaN(lng) || isNaN(lat)) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
  }

  try {
    // Find the neighborhood containing the point
    const neighborhood = await findNeighborhood(lng, lat);
    console.log('[API Properties] Coordinates:', { lng, lat });
    console.log('[API Properties] Found neighborhood:', neighborhood ? neighborhood.properties.name : 'None');

    if (!neighborhood) {
      return NextResponse.json(
        { 
          error: 'No neighborhood found for these coordinates',
          message: 'The coordinates do not fall within any defined neighborhood boundary.',
          coordinates: [lng, lat]
        }, 
        { status: 404 }
      );
    }

    // Generate mock property data for this neighborhood
    // In a real application, you would query a database or external API for this data
    const properties = generateMockProperties(neighborhood);

    return NextResponse.json({
      neighborhood: neighborhood.properties.name,
      properties: properties
    });
  } catch (error) {
    console.error('Error fetching property data:', error);
    return NextResponse.json(
      { 
        error: 'Error processing property data',
        message: 'An error occurred while processing the property data.'
      }, 
      { status: 500 }
    );
  }
}
