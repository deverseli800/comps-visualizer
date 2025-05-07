/**
 * Helper functions for working with map data
 */

/**
 * Ensures that a GeoJSON feature is properly formatted for Mapbox
 * 
 * @param feature GeoJSON feature to format
 * @returns Properly formatted GeoJSON feature
 */
export function formatGeoJSONForMapbox(feature: any): any {
  if (!feature) return null;
  
  try {
    // Clone to avoid modifying the original
    const formattedFeature = JSON.parse(JSON.stringify(feature));
    
    // Ensure feature has required properties for GeoJSON
    if (!formattedFeature.type) {
      formattedFeature.type = 'Feature';
    }
    
    // Ensure properties object exists
    if (!formattedFeature.properties) {
      formattedFeature.properties = {};
    }
    
    // Ensure geometry exists and has proper types
    if (!formattedFeature.geometry) {
      console.error('Feature has no geometry');
      return null;
    }
    
    return formattedFeature;
  } catch (error) {
    console.error('Error formatting GeoJSON:', error);
    return null;
  }
}

/**
 * Creates a GeoJSON Feature Collection from a single feature
 * 
 * @param feature GeoJSON feature
 * @returns Feature Collection containing the feature
 */
export function createFeatureCollection(feature: any): any {
  return {
    type: 'FeatureCollection',
    features: [feature]
  };
}

/**
 * Logs detailed information about a GeoJSON feature to help debug
 * 
 * @param feature GeoJSON feature to inspect
 */
export function inspectGeoJSON(feature: any): void {
  console.log('GeoJSON Inspection:');
  console.log('- Type:', feature.type);
  
  if (feature.geometry) {
    console.log('- Geometry Type:', feature.geometry.type);
    
    if (feature.geometry.coordinates) {
      console.log('- Coordinate Structure:');
      if (feature.geometry.type === 'Point') {
        console.log('  Point:', feature.geometry.coordinates);
      } else if (feature.geometry.type === 'Polygon') {
        console.log('  First ring length:', feature.geometry.coordinates[0]?.length);
        console.log('  First few coordinates:', feature.geometry.coordinates[0]?.slice(0, 3));
      }
    } else {
      console.log('- No coordinates found');
    }
  } else {
    console.log('- No geometry found');
  }
  
  if (feature.properties) {
    console.log('- Properties:', Object.keys(feature.properties));
  } else {
    console.log('- No properties found');
  }
}
