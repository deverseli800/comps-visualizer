import * as turf from '@turf/turf';
import fs from 'fs';
import path from 'path';

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
  const point = turf.point([lng, lat]);
  
  console.log('[Lib] Checking point in neighborhoods:', { lng, lat });
  console.log('[Lib] Total neighborhoods:', neighborhoods.features.length);

  // Find the neighborhood containing the point
  for (const neighborhood of neighborhoods.features) {
    try {
      const result = turf.booleanPointInPolygon(point, neighborhood);
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
export async function findAdjacentNeighborhoods(neighborhood: any) {
  if (!neighborhood) return [];
  
  try {
    const allNeighborhoods = await getNYCNeighborhoods();
    const adjacentNeighborhoods = [];
    
    // Get the current neighborhood borough to narrow down search
    const mainBorough = neighborhood.properties.boro_name || 
                         neighborhood.properties.borough || '';
    
    // Get a buffer around the neighborhood to find potential neighbors
    const buffer = turf.buffer(neighborhood, 0.001, { units: 'kilometers' });
    
    console.log(`[Lib] Searching for neighborhoods adjacent to: ${neighborhood.properties.ntaname || neighborhood.properties.name}`);
    
    // Find neighborhoods that intersect with our buffered area
    for (const candidate of allNeighborhoods.features) {
      // Skip if it's the same neighborhood
      if (candidate.properties.ntacode === neighborhood.properties.ntacode) {
        continue;
      }
      
      // For efficiency, first check if it's in the same borough
      const candidateBorough = candidate.properties.boro_name || 
                               candidate.properties.borough || '';
      
      // Skip boroughs that aren't the same or adjacent
      if (mainBorough && candidateBorough && mainBorough !== candidateBorough) {
        // Allow Manhattan-Brooklyn, Manhattan-Queens, Brooklyn-Queens adjacency
        // (Special cases for neighborhoods that border other boroughs)
        const boroughPair = `${mainBorough}-${candidateBorough}`;
        if (!['Manhattan-Brooklyn', 'Brooklyn-Manhattan', 
               'Manhattan-Queens', 'Queens-Manhattan',
               'Brooklyn-Queens', 'Queens-Brooklyn'].includes(boroughPair)) {
          continue;
        }
      }
      
      try {
        // Try a different approach - use distance to determine adjacency
        const distance = turf.distance(
          turf.center(neighborhood),
          turf.center(candidate),
          { units: 'kilometers' }
        );
        
        // Consider neighborhoods within 2km as potentially adjacent
        if (distance < 2) {
          // Check for actual intersection of boundaries
          const intersection = turf.intersect(neighborhood, candidate);
          
          // If there's any intersection, it's adjacent
          if (intersection) {
            adjacentNeighborhoods.push(candidate);
            console.log(`[Lib] Found adjacent neighborhood: ${candidate.properties.ntaname || candidate.properties.name}`);
          }
        }
      } catch (error) {
        // Try a simpler method as fallback - just use a distance threshold
        try {
          const distance = turf.distance(
            turf.center(neighborhood),
            turf.center(candidate),
            { units: 'kilometers' }
          );
          
          // If centers are very close, consider them adjacent
          // East Village to surrounding areas should be within this range
          if (distance < 1) {
            adjacentNeighborhoods.push(candidate);
            console.log(`[Lib] Found nearby neighborhood: ${candidate.properties.ntaname || candidate.properties.name} (distance: ${distance.toFixed(2)}km)`);
          }
        } catch (innerError) {
          console.error('Error calculating distance between neighborhoods:', innerError);
        }
      }
    }
    
    console.log(`[Lib] Found ${adjacentNeighborhoods.length} adjacent neighborhoods`);
    return adjacentNeighborhoods;
  } catch (error) {
    console.error('Error finding adjacent neighborhoods:', error);
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
