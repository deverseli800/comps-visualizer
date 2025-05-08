# 🗺️ NYC Neighborhood Property Visualizer

A proof of concept web application that allows users to input a New York City address and visualize all properties within the corresponding neighborhood on an interactive map.

![NYC Property Visualizer](https://via.placeholder.com/1200x600?text=NYC+Property+Visualizer)

## Features

* **Address Input**: Users can enter any NYC address with autocomplete suggestions
* **Geocoding**: The application converts the input address to geographic coordinates using Mapbox
* **Neighborhood Identification**: The application determines and highlights the neighborhood containing the address
* **Property Visualization**: All properties within the identified neighborhood are displayed on an interactive map
* **Property Details**: Click on any property to view its details in a popup
* **Adjacent Neighborhoods**: View properties in adjacent neighborhoods as well as the main one
* **AI-Powered Record Enrichment**: Use OpenAI's web search to find additional information about properties

## Tech Stack

* **Frontend**: Next.js 14+ with App Router
* **Mapping**: Mapbox GL JS
* **Backend**: Node.js with Next.js API Routes
* **Data Processing**: Turf.js for spatial operations
* **AI Integration**: OpenAI API with web search capability

## Getting Started

### Prerequisites

- Node.js 16.x or higher
- npm or yarn package manager
- A Mapbox account and access token
- An OpenAI API key (for AI property record enrichment)

### Installation

1. Clone this repository
   ```bash
   git clone https://github.com/yourusername/comps-visualizer.git
   cd comps-visualizer
   ```

2. Install dependencies
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env.local` file and add your API keys
   ```
   NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token_here
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. Download and process the rolling sales data
   * Download the Manhattan rolling sales Excel file from [NYC Department of Finance](https://www.nyc.gov/site/finance/property/property-rolling-sales-data.page)
   * Place the Excel file in the `/data` directory with the name `rollingsales_manhattan.xlsx`
   * Install dependencies for the geocoding script:
     ```bash
     npm install xlsx axios dotenv
     ```
   * Run the geocoding script to convert the data to GeoJSON:
     ```bash
     npm run geocode-sales
     ```

### Development

Run the development server:
```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## How It Works

### 1. Address Input and Geocoding
- The application utilizes Mapbox's geocoding API to convert addresses to coordinates
- The address input field features autocomplete for NYC addresses

### 2. Neighborhood Identification
- Once an address is geocoded, the application identifies which neighborhood it falls within
- The application also identifies adjacent neighborhoods within a specified distance

### 3. Property Display
- The application displays all properties within the identified neighborhood and adjacent neighborhoods
- Properties are color-coded to distinguish between the main neighborhood and adjacent ones

### 4. Interactive Map
- The map allows users to:
  - Click on properties to view details
  - Pan and zoom to explore the neighborhood
  - See a clear boundary outline of the neighborhood and adjacent areas

### 5. AI-Powered Record Enrichment
- Each property in the sidebar has a "View Record" button
- In the property record modal, users can click "Enrich Record with AI"
- The application uses OpenAI's web search to find additional information about the property
- AI extracts structured data such as cap rate, rent-stabilized units, and market rents
- Search results include links to the original sources

## Data Sources

* **NYC Open Data - 2020 Neighborhood Tabulation Areas (NTAs)**: Official NYC neighborhood boundaries
* **NYC Department of Finance - Rolling Sales Data**: Real property sales transactions in NYC
  * Source: https://www.nyc.gov/site/finance/property/property-rolling-sales-data.page
  * Place Excel files in the `/data` directory
* **Web Search Results**: Property details enriched through OpenAI's web search functionality

## AI Integration

This project demonstrates how AI can enhance the commercial real estate appraisal process:

1. **Property Record Enrichment**:
   - Uses OpenAI's web search capability to find information not present in the local database
   - Extracts key data points like cap rates, rent stabilization status, and market rents
   - Provides links to original sources for verification
   - Demonstrates how AI can automate research that would normally take significant time

2. **Automated Data Extraction**:
   - Parses search results to extract structured data
   - Presents findings in a clear, organized format
   - Reduces manual data entry and ensures consistent categorization

This approach allows appraisers to:
- Save hours of research time
- Access more comprehensive information
- Make better-informed valuation decisions
- Maintain transparency about information sources

## Development Plan

This project is being developed incrementally:

1. ✅ Basic Map Display
2. ✅ Address Input and Geocoding
3. ✅ Neighborhood Boundary Identification
4. ✅ Load and Display Property Data
5. ✅ Adjacent Neighborhoods Support
6. ✅ AI-Powered Record Enrichment
7. ⬜️ Performance Optimization

## Future Enhancements

- Integration with real NYC property data (MapPLUTO)
- Advanced filtering by property characteristics
- Property comparison tool
- Statistical analysis of neighborhood properties
- Export/save functionality for research purposes
- AI-powered valuation predictions

## Notes

- This is a proof of concept application with simplified data
- In a production environment, you would need to:
  - Deploy the application with proper environment variables
  - Set up proper data storage and retrieval mechanisms
  - Implement caching for better performance with large datasets
  - Add error handling and input validation

## License

This project is licensed under the MIT License - see the LICENSE file for details
