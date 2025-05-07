/**
 * Test script to verify your Mapbox token is working correctly
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const axios = require('axios');

// Load environment variables from .env.local
const envPath = path.resolve(__dirname, '..', '.env.local');
dotenv.config({ path: envPath });

// Get token from environment
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

// Check if token exists
if (!MAPBOX_TOKEN) {
  console.error('Error: NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN not found in .env.local');
  console.error(`Looked for .env.local at: ${envPath}`);
  process.exit(1);
} else {
  console.log('Token found:', MAPBOX_TOKEN.substring(0, 10) + '...');
}

// Test function
async function testGeocoding() {
  const testAddress = "New York City";
  console.log(`Testing geocoding with address: "${testAddress}"`);
  
  try {
    const encodedAddress = encodeURIComponent(testAddress);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${MAPBOX_TOKEN}`;
    
    console.log('Sending request to Mapbox...');
    const response = await axios.get(url);
    
    if (response.status === 200) {
      console.log('✅ Success! Token is working correctly.');
      
      if (response.data.features && response.data.features.length > 0) {
        const firstResult = response.data.features[0];
        console.log('Found location:', firstResult.place_name);
        console.log('Coordinates:', firstResult.center);
      } else {
        console.log('Response did not contain any features.');
      }
    } else {
      console.log(`❌ Unexpected status code: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Error testing geocoding:');
    
    if (error.response) {
      console.error(`Status code: ${error.response.status}`);
      console.error('Response data:', error.response.data);
      
      if (error.response.status === 401) {
        console.error('\nPossible solutions for 401 Unauthorized:');
        console.error('1. Your token may have expired. Generate a new token at https://account.mapbox.com/access-tokens/');
        console.error('2. The token may not have geocoding permissions. Ensure it has the "geocoding" scope.');
        console.error('3. Check for typos in your token.');
      }
    } else {
      console.error(`Error message: ${error.message}`);
    }
  }
}

// Run the test
testGeocoding().catch(err => {
  console.error('Uncaught error:', err);
});
