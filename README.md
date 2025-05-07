# 🗺️ NYC Neighborhood Property Visualizer

A proof of concept web application that allows users to input a New York City address and visualize all properties within the corresponding neighborhood on an interactive map.

![NYC Property Visualizer](https://via.placeholder.com/1200x600?text=NYC+Property+Visualizer)

## Features

* **Address Input**: Users can enter any NYC address with autocomplete suggestions
* **Geocoding**: The application converts the input address to geographic coordinates using Mapbox
* **Neighborhood Identification**: The application determines and highlights the neighborhood containing the address
* **Property Visualization**: All properties within the identified neighborhood are displayed on an interactive map
* **Property Details**: Click on any property to view its details in a popup

## Tech Stack

* **Frontend**: Next.js 14+ with App Router
* **Mapping**: Mapbox GL JS
* **Backend**: Node.js with Next.js API Routes
* **Data Processing**: Turf.js for spatial operations

## Getting Started

### Prerequisites

- Node.js 16.x or higher
- npm or yarn package manager
- A Mapbox account and access token

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

3. Create a `.env.local` file and add your Mapbox access token
   ```
   NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token_here
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
- Currently using simplified neighborhood boundaries (in a production version, this would use NYC's official NTA boundaries)

### 3. Property Display
- The application displays all properties within the identified neighborhood
- Currently using mock property data (in a production version, this would use NYC's MapPLUTO dataset)

### 4. Interactive Map
- The map allows users to:
  - Click on properties to view details
  - Pan and zoom to explore the neighborhood
  - See a clear boundary outline of the neighborhood

## Data Sources

* **MapPLUTO Dataset**: Provides detailed land use and geographic data at the tax lot level
* **Neighborhood Tabulation Areas (NTAs)**: Defines neighborhood boundaries in NYC

## Development Plan

This project is being developed incrementally:

1. ✅ Basic Map Display
2. ✅ Address Input and Geocoding
3. ✅ Neighborhood Boundary Identification
4. ✅ Load and Display Property Data
5. ⬜️ Interactive Property Details (Enhanced)
6. ⬜️ Adjacent Neighborhoods (Optional)
7. ⬜️ Performance Optimization

## Future Enhancements

- Integration with real NYC property data (MapPLUTO)
- Advanced filtering by property characteristics
- Property comparison tool
- Statistical analysis of neighborhood properties
- Export/save functionality for research purposes

## Notes

- This is a proof of concept application with simplified data
- In a production environment, you would need to:
  - Deploy the application with proper environment variables
  - Set up proper data storage and retrieval mechanisms
  - Implement caching for better performance with large datasets
  - Add error handling and input validation

## License

This project is licensed under the MIT License - see the LICENSE file for details
