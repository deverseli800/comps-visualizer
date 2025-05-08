import { NextRequest, NextResponse } from 'next/server';
import * as turf from '@turf/turf';
import { findNeighborhood, findAdjacentNeighborhoods } from '@/lib/neighborhoodData';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lng = parseFloat(searchParams.get('lng') || '0');
  const lat = parseFloat(searchParams.get('lat') || '0');
  const includeAdjacent = searchParams.get('adjacent') !== 'false'; // Default to true

  if (isNaN(lng) || isNaN(lat)) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
  }

  try {
    // Find the neighborhood containing the point using our utility function
    const containingNeighborhood = await findNeighborhood(lng, lat);
    console.log('[API] Coordinates:', { lng, lat });
    console.log('[API] Found neighborhood:', 
      containingNeighborhood 
        ? (containingNeighborhood.properties.ntaname || containingNeighborhood.properties.name) 
        : 'None'
    );

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

    // If adjacent neighborhoods are requested, find them
    let adjacentNeighborhoods = [];
    if (includeAdjacent) {
      console.log('[API] Finding adjacent neighborhoods...');
      adjacentNeighborhoods = await findAdjacentNeighborhoods(containingNeighborhood);
      console.log(`[API] Found ${adjacentNeighborhoods.length} adjacent neighborhoods:`);
      
      // Log the names of adjacent neighborhoods for debugging
      adjacentNeighborhoods.forEach((n, i) => {
        console.log(`[API] Adjacent #${i+1}: ${n.properties.ntaname || n.properties.name}`);
      });
    }

    // Return the neighborhood data with adjacent neighborhoods
    return NextResponse.json({
      neighborhood: containingNeighborhood.properties.ntaname || containingNeighborhood.properties.name,
      data: containingNeighborhood,
      adjacentNeighborhoods: adjacentNeighborhoods
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
