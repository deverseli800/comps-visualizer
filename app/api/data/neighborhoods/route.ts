import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

// API endpoint to serve the NYC neighborhoods GeoJSON data
export async function GET() {
  console.log('[API] [NEIGHBORHOODS] Starting to load neighborhood data');
  try {
    // Read the official NTA neighborhood data file
    const dataPath = path.join(process.cwd(), 'data');
    console.log('[API] [NEIGHBORHOODS] Looking for data in:', dataPath);
    
    // List files in the directory to debug
    try {
      const files = fs.readdirSync(dataPath);
      console.log('[API] [NEIGHBORHOODS] Files found in data directory:', files);
    } catch (readDirError) {
      console.error('[API] [NEIGHBORHOODS] Error reading data directory:', readDirError);
    }
    
    const filePath = path.join(process.cwd(), 'data', '2020 Neighborhood Tabulation Areas (NTAs)_20250507.geojson');
    console.log('[API] [NEIGHBORHOODS] Attempting to read file:', filePath);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error('[API] [NEIGHBORHOODS] File does not exist:', filePath);
      return NextResponse.json(
        { 
          error: 'Neighborhood data file not found',
          message: 'The NYC neighborhoods GeoJSON file could not be found.'
        }, 
        { status: 404 }
      );
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    console.log('[API] [NEIGHBORHOODS] File read successfully, size:', fileContent.length, 'bytes');
    
    try {
      const data = JSON.parse(fileContent);
      console.log('[API] [NEIGHBORHOODS] Data parsed successfully');
      console.log('[API] [NEIGHBORHOODS] Neighborhoods count:', data.features?.length || 0);
      console.log('[API] [NEIGHBORHOODS] Sample neighborhoods:', 
        data.features?.slice(0, 3).map((f: any) => f.properties.ntaname || f.properties.name));
      
      // Return the data as JSON
      return NextResponse.json(data);
    } catch (parseError) {
      console.error('[API] [NEIGHBORHOODS] Error parsing GeoJSON:', parseError);
      return NextResponse.json(
        { 
          error: 'Failed to parse neighborhood data',
          message: 'The NYC neighborhoods GeoJSON file could not be parsed.'
        }, 
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[API] [NEIGHBORHOODS] Error loading neighborhood data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to load neighborhood data',
        message: 'An error occurred while loading the neighborhood data.'
      }, 
      { status: 500 }
    );
  }
}
