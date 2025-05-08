import {
  booleanTouches,
  booleanIntersects,
  buffer,
  distance,
  centroid,
  point,
  booleanPointInPolygon,
  featureCollection
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
      const filePath = path.join(process.cwd(), 'data', 'manhattan_neighborhoods.geojson');
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

/**
 * Find neighborhoods within a specific distance of the subject neighborhood
 * This implementation uses multiple approaches to ensure reliable proximity detection.
 * 
 * @param subject - The subject neighborhood feature
 * @param proximityMiles - The proximity radius in miles (default: 1)
 * @returns Array of neighborhood features within the specified proximity
 */
export async function findAdjacentNeighborhoods(
    subject: Feature,
    proximityMiles: number = 1
): Promise<Feature[]> {
  if (!subject) {
    console.error('[Lib] No subject neighborhood provided');
    return [];
  }

  // Get the subject neighborhood info for logging
  const subjectName = subject.properties.ntaname || subject.properties.name || 'Unknown';
  const subjectCode = subject.properties.ntacode || subject.properties.id || 'Unknown';
  
  console.log(`[Lib] Finding neighborhoods within ${proximityMiles} mile(s) of ${subjectName} (${subjectCode})`);
  
  // 1) Load all neighborhood features
  const allNeighborhoods = (await getNYCNeighborhoods()).features;
  console.log(`[Lib] Loaded ${allNeighborhoods.length} total neighborhoods`);

  // Helper function to safely get neighborhood centroid
  const safeGetCentroid = (feature: Feature) => {
    try {
      return centroid(feature);
    } catch (error) {
      console.error(`[Lib] Error calculating centroid:`, error);
      // If centroid fails, create a point from the first coordinate of the first polygon
      try {
        if (feature.geometry.type === 'MultiPolygon') {
          const firstCoord = feature.geometry.coordinates[0][0][0];
          return point(firstCoord);
        } else if (feature.geometry.type === 'Polygon') {
          const firstCoord = feature.geometry.coordinates[0][0];
          return point(firstCoord);
        }
      } catch (e) {
        console.error(`[Lib] Failed to extract point from geometry:`, e);
      }
      return null;
    }
  };

  // 2) Calculate centroid of subject neighborhood for distance calculations
  const subjectCentroid = safeGetCentroid(subject);
  if (!subjectCentroid) {
    console.error('[Lib] Could not calculate centroid for subject neighborhood');
    return [];
  }

  // 3) Create a buffer around the subject for intersection tests
  let bufferAroundSubject;
  try {
    bufferAroundSubject = buffer(subject, proximityMiles, { units: 'miles' });
  } catch (error) {
    console.error(`[Lib] Error creating buffer:`, error);
    console.log('[Lib] Falling back to centroid-based proximity only');
    bufferAroundSubject = null;
  }

  // 4) Find nearby neighborhoods using multiple methods
  const nearbyNeighborhoods = allNeighborhoods.filter((candidate) => {
    // Skip if this is the subject neighborhood
    const candidateCode = candidate.properties.ntacode || candidate.properties.id;
    const candidateName = candidate.properties.ntaname || candidate.properties.name || 'Unknown';
    
    if (candidateCode === subjectCode) {
      return false;
    }
    
    try {
      // Method 1: Check if the candidate intersects with the buffer (if buffer exists)
      if (bufferAroundSubject) {
        const intersects = booleanIntersects(bufferAroundSubject, candidate);
        if (intersects) {
          console.log(`[Lib] ${candidateName} intersects with the buffer around ${subjectName}`);
          return true;
        }
      }
      
      // Method 2: Calculate distance between centroids
      const candidateCentroid = safeGetCentroid(candidate);
      if (candidateCentroid && subjectCentroid) {
        const dist = distance(subjectCentroid, candidateCentroid, { units: 'miles' });
        if (dist <= proximityMiles) {
          console.log(`[Lib] ${candidateName} centroid is within ${dist.toFixed(2)} miles of ${subjectName} centroid`);
          return true;
        }
      }
      
      // Method 3: Try boundary-based methods
      // Check if neighborhoods directly touch (are adjacent)
      try {
        if (booleanTouches(subject, candidate)) {
          console.log(`[Lib] ${candidateName} directly touches ${subjectName}`);
          return true;
        }
      } catch (error) {
        // If touches check fails, ignore and continue with other methods
      }
      
      return false;
    } catch (error) {
      console.error(`[Lib] Error checking proximity for ${candidateName}:`, error);
      return false;
    }
  });
  
  // Log the results for debugging
  console.log(`[Lib] Found ${nearbyNeighborhoods.length} neighborhoods within ${proximityMiles} mile(s) of ${subjectName}`);
  
  const nearbyNames = nearbyNeighborhoods
    .map(n => n.properties.ntaname || n.properties.name)
    .filter(Boolean)
    .join(', ');
    
  console.log(`[Lib] Nearby neighborhoods: ${nearbyNames || 'None'}`);
  
  return nearbyNeighborhoods;
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
