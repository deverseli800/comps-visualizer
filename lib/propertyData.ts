import * as turf from '@turf/turf';

// In a real application, this would fetch data from an external source or database
// For this POC, we'll create mock property data

// Generate a grid of property points within a given neighborhood boundary
export function generateMockProperties(neighborhoodBoundary: any, density = 10) {
  if (!neighborhoodBoundary || !neighborhoodBoundary.geometry) {
    return [];
  }

  const bbox = turf.bbox(neighborhoodBoundary);
  const properties = [];
  
  // Create a grid of points within the bounding box
  const xStep = (bbox[2] - bbox[0]) / density;
  const yStep = (bbox[3] - bbox[1]) / density;
  
  for (let x = bbox[0]; x <= bbox[2]; x += xStep) {
    for (let y = bbox[1]; y <= bbox[3]; y += yStep) {
      const point = turf.point([x, y]);
      
      // Only include points that are within the neighborhood boundary
      if (turf.booleanPointInPolygon(point, neighborhoodBoundary)) {
        properties.push({
          id: `prop-${properties.length}`,
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [x, y]
          },
          properties: {
            address: `${Math.floor(Math.random() * 999) + 1} ${getRandomStreet()}`,
            buildingClass: getRandomBuildingClass(),
            lotArea: Math.floor(Math.random() * 10000) + 1000,
            yearBuilt: Math.floor(Math.random() * 100) + 1920,
            numFloors: Math.floor(Math.random() * 20) + 1,
            assessedValue: Math.floor(Math.random() * 5000000) + 500000
          }
        });
      }
    }
  }
  
  return {
    type: 'FeatureCollection',
    features: properties
  };
}

// Helper functions for mock data generation
function getRandomStreet() {
  const streets = [
    'Main St', 'Broadway', 'Park Ave', 'Lexington Ave', 
    '5th Ave', 'Madison Ave', 'Amsterdam Ave', 'Columbus Ave'
  ];
  return streets[Math.floor(Math.random() * streets.length)];
}

function getRandomBuildingClass() {
  const classes = [
    'Residential', 'Commercial', 'Mixed Use', 
    'Industrial', 'Office', 'Retail'
  ];
  return classes[Math.floor(Math.random() * classes.length)];
}
