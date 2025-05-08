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
export async function findAdjacentNeighborhoods(
    subject: Feature
): Promise<Feature[]> {
  if (!subject) return [];

  // 1) Load everything
  const all = (await getNYCNeighborhoods()).features;

  // 2) Make a 1-mile buffer around your subject neighborhood
  const mileBuffer = buffer(subject, 1, { units: 'miles' });

  // 3) Filter out your subject + keep any that touch that buffer
  return all.filter((candidate) => {
    const codeA = subject.properties.ntacode || subject.properties.id;
    const codeB = candidate.properties.ntacode || candidate.properties.id;
    if (codeA === codeB) return false;

    // “any part within 1 mile” test
    return booleanIntersects(mileBuffer, candidate);
  });
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
