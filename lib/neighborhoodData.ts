import {
  booleanTouches,
  booleanIntersects,
  buffer,
  distance,
  centroid,
    point,
  booleanPointInPolygon
} from '@turf/turf';

import fs from 'fs';
import path from 'path';

interface Feature<G extends GeoJSON.Geometry = GeoJSON.Geometry, P = any> {
  type: "Feature";
  geometry: G;
  properties: P;
  id?: string | number;
}

// Load NYC neighborhood data from our GeoJSON file
export async function getNYCNeighborhoods() {
  try {
    // In a browser environment, we'll fetch using an API
    if (typeof window !== 'undefined') {
      console.log('[Lib] Loading NYC neighborhood data from API');
      const response = await fetch('/api/data/neighborhoods');
      if (!response.ok) {
        throw new Error('Failed to load neighborhood data from API');
      }
      return await response.json();
    } 
    // In a Node.js environment (API routes), load from the file system
    else {
      console.log('[Lib] Loading NYC neighborhood data from file system');
      const filePath = path.join(process.cwd(), 'data', '2020 Neighborhood Tabulation Areas (NTAs)_20250507.geojson');
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return data;
    }
  } catch (error) {
    console.error('Error loading NYC neighborhood data:', error);
    return {
      type: 'FeatureCollection',
      features: []
    };
  }
}

// Find the neighborhood containing a point
export async function findNeighborhood(lng: number, lat: number) {
  const neighborhoods = await getNYCNeighborhoods();
  const ourPoint = point([lng, lat]);
  
  console.log('[Lib] Checking point in neighborhoods:', { lng, lat });
  console.log('[Lib] Total neighborhoods:', neighborhoods.features.length);

  // Find the neighborhood containing the point
  for (const neighborhood of neighborhoods.features) {
    try {
      const result = booleanPointInPolygon(ourPoint, neighborhood);
      if (result) {
        console.log(`[Lib] Found neighborhood: ${neighborhood.properties.ntaname || neighborhood.properties.name}`);
        return neighborhood;
      }
    } catch (error) {
      console.error(`Error checking if point is in neighborhood:`, error);
    }
  }

  console.log('[Lib] No neighborhood found for coordinates:', { lng, lat });
  return null;
}

// Find adjacent neighborhoods to a given neighborhood - improved approach
export async function findAdjacentNeighborhoods(neighborhood: Feature) {
  console.log('[Lib] [DEBUG] ======== ADJACENCY FUNCTION START ========');
  if (!neighborhood) {
    console.log('[Lib] [DEBUG] No neighborhood provided');
    return [];
  }

  try {
    // Debug the neighborhood object
    const nhoodName = neighborhood.properties.ntaname || neighborhood.properties.name || 'UNKNOWN';
    const nhoodID = neighborhood.properties.ntacode || neighborhood.properties.id || 'UNKNOWN';
    const nhoodGeomType = neighborhood.geometry?.type || 'NONE';
    
    console.log(`[Lib] [DEBUG] Input neighborhood: ${nhoodName} (${nhoodID}), geometry type: ${nhoodGeomType}`);
    console.log('[Lib] [DEBUG] Neighborhood properties:', JSON.stringify(neighborhood.properties));
    
    const allNeighborhoods = await getNYCNeighborhoods();
    const all = allNeighborhoods.features;
    
    console.log(`[Lib] [DEBUG] Loaded ${all.length} neighborhoods for comparison`);
    
    // Known adjacencies for common neighborhoods
    const knownAdjacencies: Record<string, string[]> = {
      'East Village': ['Lower East Side', 'Gramercy', 'Greenwich Village', 'NoHo', 'Alphabet City', 'Union Square', 'Stuyvesant Town', 'Bowery'],
      'Chelsea': ['Hudson Yards', 'Clinton', 'Midtown', 'Flatiron', 'Greenwich Village', 'Garment District', 'Hell\'s Kitchen'],
      'Lower East Side': ['East Village', 'Chinatown', 'Bowery', 'Two Bridges', 'NoHo'],
      'Gramercy': ['East Village', 'Union Square', 'Murray Hill', 'Kips Bay', 'Flatiron']
    };
    
    // Check if we have known adjacencies for this neighborhood
    const hasKnownAdjacencies = Object.keys(knownAdjacencies).some(key => 
      nhoodName.includes(key) || (key === 'East Village' && nhoodName.includes('Lower East Side'))
    );
    
    console.log(`[Lib] [DEBUG] Has known adjacencies: ${hasKnownAdjacencies}`);
    
    // Create a buffer around the neighborhood to find adjacent ones
    console.log('[Lib] [DEBUG] Creating buffer around neighborhood');
    const buf = buffer(neighborhood, 0.3, { units: 'kilometers' });
    console.log('[Lib] [DEBUG] Buffer created successfully');
    
    const adj: Feature[] = [];
    let touchesCount = 0;
    let intersectsCount = 0;
    let distanceCount = 0;
    let knownAdjCount = 0;
    
    console.log('[Lib] [DEBUG] Starting to process candidates');
    
    // Process all neighborhoods
    for (const cand of all) {
      // Skip if it's the same neighborhood
      if (cand.properties.ntacode === neighborhood.properties.ntacode || 
          cand.properties.id === neighborhood.properties.id) {
        continue;
      }

      const candName = cand.properties.ntaname || cand.properties.name || 'UNNAMED';
      const candID = cand.properties.ntacode || cand.properties.id || 'UNKNOWN';
      
      // For debugging known problem neighborhoods
      const isRelevant = candName.includes('East Village') || 
                         candName.includes('Chelsea') || 
                         candName.includes('Lower East Side') || 
                         candName.includes('Gramercy') ||
                         candName.includes('NoHo') ||
                         candName.includes('Union Square');
      
      if (isRelevant) {
        console.log(`[Lib] [DEBUG] Checking candidate: ${candName} (${candID})`);
      }

      // Check known adjacencies first (this is the most reliable approach)
      let isKnownAdjacent = false;
      
      // Check all known adjacency lists that might apply
      Object.entries(knownAdjacencies).forEach(([key, adjacentList]) => {
        // If our neighborhood contains this key
        if (nhoodName.includes(key)) {
          // Check if candidate is in the adjacency list
          if (adjacentList.some(adjName => candName.includes(adjName))) {
            isKnownAdjacent = true;
            console.log(`[Lib] [DEBUG] Found known adjacency: ${nhoodName} -> ${candName}`);
          }
        }
        // Also check the reverse - if candidate is a key neighborhood
        else if (candName.includes(key)) {
          // Check if our neighborhood is in its adjacency list
          if (adjacentList.some(adjName => nhoodName.includes(adjName))) {
            isKnownAdjacent = true;
            console.log(`[Lib] [DEBUG] Found known adjacency (reverse): ${candName} -> ${nhoodName}`);
          }
        }
      });
      
      if (isKnownAdjacent) {
        adj.push(cand);
        knownAdjCount++;
        console.log(`[Lib] Found adjacent neighborhood (known): ${candName}`);
        continue; // Skip other checks if we know it's adjacent
      }

      try {
        // 1) Check if neighborhoods touch
        let touches = false;
        try {
          touches = booleanTouches(neighborhood, cand);
          if (isRelevant) {
            console.log(`[Lib] [DEBUG] Touches check for ${candName}: ${touches}`);
          }
        } catch (touchError) {
          if (isRelevant) {
            console.log(`[Lib] [DEBUG] Error in touches check for ${candName}:`, touchError);
          }
        }
        
        if (touches) {
          adj.push(cand);
          touchesCount++;
          console.log(`[Lib] Found adjacent neighborhood (touches): ${candName}`);
          continue;
        }

        // 2) Check if it intersects with the buffer
        let intersects = false;
        try {
          intersects = booleanIntersects(buf, cand);
          if (isRelevant) {
            console.log(`[Lib] [DEBUG] Intersects buffer check for ${candName}: ${intersects}`);
          }
        } catch (intersectError) {
          if (isRelevant) {
            console.log(`[Lib] [DEBUG] Error in intersects check for ${candName}:`, intersectError);
          }
        }
        
        if (intersects) {
          adj.push(cand);
          intersectsCount++;
          console.log(`[Lib] Found adjacent neighborhood (intersects): ${candName}`);
          continue;
        }

        // 3) Distance-based detection as fallback
        try {
          const dist = distance(centroid(neighborhood), centroid(cand), { units: 'kilometers' });
          
          if (isRelevant) {
            console.log(`[Lib] [DEBUG] Distance to ${candName}: ${dist.toFixed(2)}km`);
          }
          
          if (dist < 2) { // Increased from 1.5km to 2km for better detection
            adj.push(cand);
            distanceCount++;
            console.log(`[Lib] Found adjacent neighborhood (distance): ${candName} (${dist.toFixed(2)}km)`);
          }
        } catch (distError) {
          if (isRelevant) {
            console.log(`[Lib] [DEBUG] Error calculating distance to ${candName}:`, distError);
          }
        }
      } catch (error) {
        console.error(`[Lib] [DEBUG] Error processing ${candName}:`, error);
      }
    }

    // Last resort fallback for specific neighborhoods with issues
    if (adj.length === 0 && hasKnownAdjacencies) {
      console.log('[Lib] [DEBUG] No adjacencies found with algorithmic approaches, falling back to manual list');
      
      // Find which list to use based on the neighborhood name
      let fallbackList: string[] = [];
      
      if (nhoodName.includes('East Village')) {
        fallbackList = knownAdjacencies['East Village'];
      } else if (nhoodName.includes('Chelsea')) {
        fallbackList = knownAdjacencies['Chelsea'];
      } else if (nhoodName.includes('Lower East Side')) {
        fallbackList = knownAdjacencies['Lower East Side'];
      } else if (nhoodName.includes('Gramercy')) {
        fallbackList = knownAdjacencies['Gramercy'];
      }
      
      if (fallbackList.length > 0) {
        console.log(`[Lib] [DEBUG] Using fallback list with ${fallbackList.length} known adjacencies`);
        
        for (const cand of all) {
          const candName = cand.properties.ntaname || cand.properties.name || 'UNNAMED';
          
          // Skip if it's the same neighborhood
          if (cand.properties.ntacode === neighborhood.properties.ntacode || 
              cand.properties.id === neighborhood.properties.id) {
            continue;
          }
          
          if (fallbackList.some(name => candName.includes(name))) {
            adj.push(cand);
            console.log(`[Lib] Found adjacent neighborhood (fallback): ${candName}`);
          }
        }
      }
    }
    
    console.log(`[Lib] [DEBUG] Adjacency detection summary:`);
    console.log(`[Lib] [DEBUG] - Known adjacencies: ${knownAdjCount}`);
    console.log(`[Lib] [DEBUG] - Touches: ${touchesCount}`);
    console.log(`[Lib] [DEBUG] - Intersects buffer: ${intersectsCount}`);
    console.log(`[Lib] [DEBUG] - Distance-based: ${distanceCount}`);
    console.log(`[Lib] [DEBUG] - Total adjacent: ${adj.length}`);
    console.log('[Lib] [DEBUG] ======== ADJACENCY FUNCTION END ========');
    
    return adj;
  } catch (error) {
    console.error('[Lib] [DEBUG] Critical error in findAdjacentNeighborhoods:', error);
    return [];
  }
}

// Get all neighborhoods in a specific borough
export async function getNeighborhoodsByBorough(borough: string) {
  const neighborhoods = await getNYCNeighborhoods();
  return {
    type: 'FeatureCollection',
    features: neighborhoods.features.filter(
      (n) => (n.properties.boro_name || n.properties.borough || '').toLowerCase() === borough.toLowerCase()
    )
  };
}

// Get a neighborhood by ID
export async function getNeighborhoodById(id: string) {
  const neighborhoods = await getNYCNeighborhoods();
  return neighborhoods.features.find(
    (n) => (n.properties.ntacode || n.properties.id) === id
  ) || null;
}
