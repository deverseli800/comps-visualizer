import { NextRequest, NextResponse } from 'next/server';
import * as turf from '@turf/turf';
import { findNeighborhood } from '@/lib/neighborhoodData';

// We'll use the utility function from lib/neighborhoodData.ts

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lng = parseFloat(searchParams.get('lng') || '0');
  const lat = parseFloat(searchParams.get('lat') || '0');

  if (isNaN(lng) || isNaN(lat)) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
  }

  try {
    // Find the neighborhood containing the point using our utility function
    const containingNeighborhood = await findNeighborhood(lng, lat);
    console.log('[API] Coordinates:', { lng, lat });
    console.log('[API] Found neighborhood:', containingNeighborhood ? containingNeighborhood.properties.name : 'None');

    if (!containingNeighborhood) {
      return NextResponse.json(
        { 
          error: 'No neighborhood found for these coordinates',
          message: 'The coordinates do not fall within any defined neighborhood boundary.',
          coordinates: [lng, lat]
        }, 
        { status: 404 }
      );
    }

    // Return the neighborhood data
    return NextResponse.json({
      neighborhood: containingNeighborhood.properties.name,
      data: containingNeighborhood
    });
  } catch (error) {
    console.error('Error finding neighborhood:', error);
    return NextResponse.json(
      { 
        error: 'Error processing neighborhood data',
        message: 'An error occurred while processing the neighborhood data.'
      }, 
      { status: 500 }
    );
  }
}
