import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

// API endpoint to serve the NYC neighborhoods GeoJSON data
export async function GET() {
  try {
    // Read the official NTA neighborhood data file
    const filePath = path.join(process.cwd(), 'data', '2020 Neighborhood Tabulation Areas (NTAs)_20250507.geojson');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Return the data as JSON
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error loading neighborhood data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to load neighborhood data',
        message: 'An error occurred while loading the neighborhood data.'
      }, 
      { status: 500 }
    );
  }
}
