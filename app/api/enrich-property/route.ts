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
    
    // Use the OpenAI Responses API with web_search tool
    const response = await openai.responses.create({
      model: "gpt-4o", // Or another supported model
      input: `You are a commercial real estate researcher. Find information about this property sale: 
        - Address: ${property.address}
        - Neighborhood: ${property.neighborhood}
        - Sale price: $${property.price.toLocaleString()}
        - Sale date: ${new Date(property.saleDate).toLocaleDateString()}
        - Units: ${property.units}
        - Year built: ${property.yearBuilt}
        
        Search for information about this property sale. Extract specific data points about:
        1. Cap rate for this sale (if available)
        2. Number of rent stabilized units
        3. Average market rents in the building or area
        4. Any recent renovations mentioned
        5. Net Operating Income (NOI) if mentioned
        6. Any information about the buyer and seller
        7. Any other relevant financial or property information
        
        Present the findings in a structured format and include links to the sources.`,
      tools: [
        {
          type: "web_search"
        }
      ],
      temperature: 0.2, // Lower temperature for more factual responses
    });
    
    // Process the response to extract search results and structured data
    const searchResults: SearchResult[] = [];
    let extractedData: {[key: string]: string} = {};
    
    // Process the response to get search results and extracted data
    const output = response.output;
    if (output) {
      for (const item of output) {
        if (item.type === 'message') {
          // Extract URLs from annotations in the message content
          const messageContent = item.content;
          for (const content of messageContent) {
            if (content.type === 'output_text' && content.annotations) {
              // Extract URLs from annotations
              for (const annotation of content.annotations) {
                if (annotation.type === 'url_citation') {
                  searchResults.push({
                    title: annotation.title || 'Source',
                    link: annotation.url,
                    snippet: 'Click link to view source content'
                  });
                }
              }
              
              // Process text to extract structured data
              // This is a simple approach - for production, a more sophisticated
              // parsing approach would be better
              const text = content.text;
              if (text) {
                // Extract cap rate info
                const capRateMatch = text.match(/cap rate[:\s]*([^%\n]+)%/i);
                if (capRateMatch && capRateMatch[1]) {
                  extractedData['Cap Rate'] = capRateMatch[1].trim() + '%';
                }
                
                // Extract rent stabilized units info
                const rentStabMatch = text.match(/rent stabilized[:\s]*([^,\n]+)/i);
                if (rentStabMatch && rentStabMatch[1]) {
                  extractedData['Rent Stabilized Units'] = rentStabMatch[1].trim();
                }
                
                // Extract average rent info
                const avgRentMatch = text.match(/average(?:\s+market)?\s+rent[:\s]*([^,\n]+)/i);
                if (avgRentMatch && avgRentMatch[1]) {
                  extractedData['Average Market Rent'] = avgRentMatch[1].trim();
                }
                
                // Extract NOI info
                const noiMatch = text.match(/NOI[:\s]*([^,\n]+)/i);
                if (noiMatch && noiMatch[1]) {
                  extractedData['NOI'] = noiMatch[1].trim();
                }
                
                // Extract renovation info
                const renovationMatch = text.match(/renovation[s]?[:\s]*([^,\n.]+)/i);
                if (renovationMatch && renovationMatch[1]) {
                  extractedData['Recent Renovations'] = renovationMatch[1].trim();
                }
                
                // Extract buyer info
                const buyerMatch = text.match(/buyer[:\s]*([^,\n.]+)/i);
                if (buyerMatch && buyerMatch[1]) {
                  extractedData['Buyer'] = buyerMatch[1].trim();
                }
                
                // Extract seller info
                const sellerMatch = text.match(/seller[:\s]*([^,\n.]+)/i);
                if (sellerMatch && sellerMatch[1]) {
                  extractedData['Seller'] = sellerMatch[1].trim();
                }
              }
            }
          }
        }
      }
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
