import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Types for web search results
interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

// Type for extracted property data
interface ExtractedPropertyData {
  capRate?: string;
  rentStabilizedUnits?: string;
  averageMarketRent?: string;
  noi?: string;
  recentRenovations?: string;
  buyer?: string;
  seller?: string;
  propertyClass?: string;
  amenities?: string;
  zoning?: string;
  taxInformation?: string;
  buildingManager?: string;
  occupancyRate?: string;
  neighborhoodTrends?: string;
  sourceConfidence?: string;
  [key: string]: string | undefined; // Allow for additional fields
}

export async function POST(request: NextRequest) {
  try {
    const { property } = await request.json();
    
    if (!property || !property.address) {
      return NextResponse.json(
        { error: 'Property information is required' },
        { status: 400 }
      );
    }
    
    // Build search query with property details for best results
    const searchQuery = `${property.address} NYC ${property.neighborhood} apartment building sale ${new Date(property.saleDate).getFullYear()} real estate transaction cap rate rent stabilized`;
    
    console.log('Search query:', searchQuery);
    
    // First search step: Get general information using the Responses API with web_search tool
    const searchResponse = await openai.responses.create({
      model: "gpt-4o", // Or another supported model
      input: `You are a commercial real estate researcher. Find information about this property sale: 
        - Address: ${property.address}
        - Neighborhood: ${property.neighborhood}
        - Sale price: ${property.price.toLocaleString()}
        - Sale date: ${new Date(property.saleDate).toLocaleDateString()}
        - Units: ${property.units}
        - Year built: ${property.yearBuilt}
        
        Search for information about this property sale including cap rate, rent stabilized units, average market rents, recent renovations, NOI, buyer, seller, and other relevant details.`,
      tools: [
        {
          type: "web_search"
        }
      ],
      temperature: 0.2, // Lower temperature for more factual responses
    });
    
    // Process the response to collect search results
    const searchResults: SearchResult[] = [];
    let searchResultText = "";
    
    if (searchResponse.output) {
      for (const item of searchResponse.output) {
        if (item.type === 'message') {
          const messageContent = item.content;
          for (const content of messageContent) {
            // Extract URLs from annotations
            if (content.type === 'output_text') {
              if (content.annotations) {
                for (const annotation of content.annotations) {
                  if (annotation.type === 'url_citation') {
                    searchResults.push({
                      title: annotation.title || 'Source',
                      link: annotation.url,
                      snippet: 'Click link to view source content'
                    });
                  }
                }
              }
              
              // Collect search result text for the next step
              if (content.text) {
                searchResultText += content.text;
              }
            }
          }
        }
      }
    }
    
    // Second step: Ask GPT to extract structured data from the search results
    const extractionResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a commercial real estate data extraction specialist. Extract structured data from search results about property sales. Format your response as a JSON object with the following fields (include only fields with information you can find):
          
          1. capRate: The capitalization rate for this property sale
          2. rentStabilizedUnits: Information about rent stabilized units in this building
          3. averageMarketRent: Average market rent for units in this building or area
          4. noi: Net Operating Income information
          5. recentRenovations: Information about recent renovations
          6. buyer: Information about the buyer
          7. seller: Information about the seller
          8. propertyClass: The property class or building classification
          9. amenities: Building amenities
          10. zoning: Zoning information
          11. taxInformation: Property tax information
          12. buildingManager: Building management company
          13. occupancyRate: Occupancy rate information
          14. neighborhoodTrends: Brief trend information about the neighborhood
          15. sourceConfidence: Your confidence in the extracted information (high/medium/low)
          
          IMPORTANT: Return ONLY valid JSON without any explanation text. Include only fields that have information.`
        },
        {
          role: "user",
          content: `Extract structured data about this property from the following search results. Convert to a JSON object:

Property information:
- Address: ${property.address}
- Neighborhood: ${property.neighborhood}
- Sale price: ${property.price.toLocaleString()}
- Sale date: ${new Date(property.saleDate).toLocaleDateString()}
- Units: ${property.units}
- Year built: ${property.yearBuilt}

Search results:
${searchResultText}`
        }
      ],
      temperature: 0.1, // Very low temperature for consistent JSON output
      response_format: { type: "json_object" } // Ensure the response is in JSON format
    });
    
    // Parse the extracted data from the JSON response
    let extractedData: ExtractedPropertyData = {};
    try {
      if (extractionResponse.choices[0]?.message?.content) {
        extractedData = JSON.parse(extractionResponse.choices[0].message.content);
        console.log('Extracted data:', extractedData);
      }
    } catch (error) {
      console.error('Error parsing extracted data JSON:', error);
    }
    
    // Return both the search results and the extracted data
    return NextResponse.json({
      searchResults,
      extractedData
    });
  } catch (error) {
    console.error('Error enriching property data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to enrich property data',
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      }, 
      { status: 500 }
    );
  }
}
