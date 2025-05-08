import { NextRequest, NextResponse } from 'next/server';
import * as turf from '@turf/turf';
import { findNeighborhood, findAdjacentNeighborhoods } from '@/lib/neighborhoodData';

export async function GET(request: NextRequest) {
  console.log('[API] [NEIGHBORHOODS MAIN] ========== REQUEST START ==========');
  const searchParams = request.nextUrl.searchParams;
  const lng = parseFloat(searchParams.get('lng') || '0');
  const lat = parseFloat(searchParams.get('lat') || '0');
  const includeAdjacent = searchParams.get('adjacent') !== 'false'; // Default to true

  console.log('[API] [NEIGHBORHOODS MAIN] Request parameters:', { 
    lng, 
    lat, 
    includeAdjacent,
    url: request.nextUrl.toString()
  });

  if (isNaN(lng) || isNaN(lat)) {
    console.log('[API] [NEIGHBORHOODS MAIN] Invalid coordinates provided');
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
  }

  try {
    console.log('[API] [NEIGHBORHOODS MAIN] Looking for neighborhood at coordinates:', { lng, lat });
    
    // Find the neighborhood containing the point using our utility function
    const containingNeighborhood = await findNeighborhood(lng, lat);
    
    const neighborhoodName = containingNeighborhood 
      ? (containingNeighborhood.properties.ntaname || containingNeighborhood.properties.name) 
      : 'None';
    
    console.log('[API] [NEIGHBORHOODS MAIN] Found neighborhood:', neighborhoodName);
    
    if (containingNeighborhood) {
      console.log('[API] [NEIGHBORHOODS MAIN] Neighborhood properties:', JSON.stringify({
        ntacode: containingNeighborhood.properties.ntacode,
        ntaname: containingNeighborhood.properties.ntaname,
        name: containingNeighborhood.properties.name,
        borough: containingNeighborhood.properties.boro_name || containingNeighborhood.properties.borough,
        geom_type: containingNeighborhood.geometry?.type
      }));
    }

    if (!containingNeighborhood) {
      console.log('[API] [NEIGHBORHOODS MAIN] No neighborhood found for coordinates');
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
      console.log('[API] [NEIGHBORHOODS MAIN] Finding adjacent neighborhoods...');
      
      // Using our utility function to find adjacent neighborhoods
      adjacentNeighborhoods = await findAdjacentNeighborhoods(containingNeighborhood);
      
      console.log(`[API] [NEIGHBORHOODS MAIN] Found ${adjacentNeighborhoods.length} adjacent neighborhoods`);
      
      // Log the names of adjacent neighborhoods for debugging
      if (adjacentNeighborhoods.length > 0) {
        console.log('[API] [NEIGHBORHOODS MAIN] Adjacent neighborhoods found:');
        adjacentNeighborhoods.forEach((n, i) => {
          const adjName = n.properties.ntaname || n.properties.name;
          const adjCode = n.properties.ntacode || n.properties.id;
          console.log(`[API] [NEIGHBORHOODS MAIN] Adjacent #${i+1}: ${adjName} (${adjCode})`);
        });
      } else {
        console.log('[API] [NEIGHBORHOODS MAIN] WARNING: No adjacent neighborhoods found!');
      }
    }

    // Construct the response data
    const responseData = {
      neighborhood: neighborhoodName,
      data: containingNeighborhood,
      adjacentNeighborhoods: adjacentNeighborhoods
    };
    
    console.log(`[API] [NEIGHBORHOODS MAIN] Returning response with ${adjacentNeighborhoods.length} adjacent neighborhoods`);
    console.log('[API] [NEIGHBORHOODS MAIN] ========== REQUEST END ==========');
    
    // Return the neighborhood data with adjacent neighborhoods
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('[API] [NEIGHBORHOODS MAIN] Error finding neighborhood:', error);
    return NextResponse.json(
      { 
        error: 'Error processing neighborhood data',
        message: 'An error occurred while processing the neighborhood data.',
        details: error instanceof Error ? error.message : String(error)
      }, 
      { status: 500 }
    );
  }
}
