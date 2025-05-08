const fs = require('fs');
const path = require('path');

// Load the input GeoJSON
const inputPath = path.join(__dirname, '../data/2020 Neighborhood Tabulation Areas (NTAs)_20250507.geojson'); // rename your file accordingly
const outputPath = path.join(__dirname, 'manhattan_neighborhoods.geojson');

const rawData = fs.readFileSync(inputPath, 'utf-8');
const geojson = JSON.parse(rawData);

// Filter for Manhattan neighborhoods
const filteredFeatures = geojson.features.filter(
    feature => feature.properties.boroname === 'Manhattan'
);

// Write the filtered GeoJSON
const filteredGeojson = {
    type: 'FeatureCollection',
    features: filteredFeatures
};

fs.writeFileSync(outputPath, JSON.stringify(filteredGeojson, null, 2));
console.log(`Filtered GeoJSON saved to ${outputPath}`);