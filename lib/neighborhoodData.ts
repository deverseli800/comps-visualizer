import * as turf from '@turf/turf';
import path from 'path';
import fs from 'fs';

// In a real application, you would:
// 1. Download and store the NTA boundaries GeoJSON file
// 2. Load and process it here

// This is a placeholder - you'll need to replace with actual implementation
// that loads the NTA data from a file or database
export async function getNYCNeighborhoods() {
  // In production, you would load this from a file:
  // const filePath = path.join(process.cwd(), 'data', 'nta_boundaries.geojson');
  // const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  // For now, return a simplified version with just a few neighborhoods for testing
  // These are very approximated boundaries
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          name: 'Midtown',
          ntacode: 'MN17',
          borough: 'Manhattan'
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-74.0000, 40.7400],
            [-73.9700, 40.7400],
            [-73.9700, 40.7650],
            [-74.0000, 40.7650],
            [-74.0000, 40.7400]
          ]]
        }
      },
      {
        type: 'Feature',
        properties: {
          name: 'Times Square',
          ntacode: 'MN18',
          borough: 'Manhattan'
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-73.9900, 40.7500],
            [-73.9800, 40.7500],
            [-73.9800, 40.7600],
            [-73.9900, 40.7600],
            [-73.9900, 40.7500]
          ]]
        }
      },
      {
        type: 'Feature',
        properties: {
          name: 'Chelsea',
          ntacode: 'MN12',
          borough: 'Manhattan'
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-74.0100, 40.7300],
            [-73.9900, 40.7300],
            [-73.9900, 40.7500],
            [-74.0100, 40.7500],
            [-74.0100, 40.7300]
          ]]
        }
      },
      {
        type: 'Feature',
        properties: {
          name: 'Upper East Side',
          ntacode: 'MN40',
          borough: 'Manhattan'
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-73.9700, 40.7700],
            [-73.9400, 40.7700],
            [-73.9400, 40.7900],
            [-73.9700, 40.7900],
            [-73.9700, 40.7700]
          ]]
        }
      },
      {
        type: 'Feature',
        properties: {
          name: 'Upper West Side',
          ntacode: 'MN41',
          borough: 'Manhattan'
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-73.9900, 40.7700],
            [-73.9700, 40.7700],
            [-73.9700, 40.7900],
            [-73.9900, 40.7900],
            [-73.9900, 40.7700]
          ]]
        }
      },
      {
        type: 'Feature',
        properties: {
          name: 'Downtown',
          ntacode: 'MN01',
          borough: 'Manhattan'
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-74.0100, 40.7000],
            [-74.0000, 40.7000],
            [-74.0000, 40.7200],
            [-74.0100, 40.7200],
            [-74.0100, 40.7000]
          ]]
        }
      },
      {
        type: 'Feature',
        properties: {
          name: 'Williamsburg',
          ntacode: 'BK73',
          borough: 'Brooklyn'
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-73.9700, 40.7000],
            [-73.9500, 40.7000],
            [-73.9500, 40.7200],
            [-73.9700, 40.7200],
            [-73.9700, 40.7000]
          ]]
        }
      },
      {
        type: 'Feature',
        properties: {
          name: 'Dumbo',
          ntacode: 'BK38',
          borough: 'Brooklyn'
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-73.9950, 40.7000],
            [-73.9800, 40.7000],
            [-73.9800, 40.7100],
            [-73.9950, 40.7100],
            [-73.9950, 40.7000]
          ]]
        }
      }
    ]
  };
}

// Find the neighborhood containing a point
export async function findNeighborhood(lng: number, lat: number) {
  const neighborhoods = await getNYCNeighborhoods();
  const point = turf.point([lng, lat]);
  
  console.log('[Lib] Checking point in neighborhoods:', { lng, lat });
  console.log('[Lib] Total neighborhoods:', neighborhoods.features.length);
  
  // Debug: Test a specific point in a known neighborhood
  const testPoint = turf.point([-73.98, 40.75]); // Times Square-ish
  neighborhoods.features.forEach((neighborhood, index) => {
    const isPointInNeighborhood = turf.booleanPointInPolygon(testPoint, neighborhood);
    console.log(`[Lib] Test - Is point in ${neighborhood.properties.name}?`, isPointInNeighborhood);
  });

  // Find the neighborhood containing the point
  const containingNeighborhood = neighborhoods.features.find(neighborhood => {
    const result = turf.booleanPointInPolygon(point, neighborhood);
    console.log(`[Lib] Is point in ${neighborhood.properties.name}?`, result);
    return result;
  });

  return containingNeighborhood;
}
