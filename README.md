# 🗺️ NYC Neighborhood Property Visualizer

A proof of concept web application that allows users to input a New York City address and visualize all properties within the corresponding neighborhood on an interactive map.

## Features (Planned)

* **Address Input**: User can enter any NYC address
* **Geocoding**: Convert the input address to geographic coordinates
* **Neighborhood Identification**: Determine the neighborhood containing the address
* **Property Visualization**: Display all properties within the identified neighborhood

## Tech Stack

* **Frontend**: Next.js with App Router
* **Mapping**: Mapbox GL JS
* **Backend**: Node.js with Express.js
* **Data Processing**: Turf.js

## Getting Started

### Prerequisites

- Node.js 16.x or higher
- A Mapbox account and access token

### Installation

1. Clone this repository
2. Install dependencies
   ```bash
   npm install
   ```
3. Create a `.env.local` file based on `.env.example` and add your Mapbox access token
   ```
   NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token_here
   ```

### Development

Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Data Sources

* **MapPLUTO Dataset**: Provides detailed land use and geographic data at the tax lot level
* **Neighborhood Tabulation Areas (NTAs)**: Defines neighborhood boundaries in NYC

## Development Plan

This project is being developed incrementally:

1. ✅ Basic Map Display
2. ⬜️ Address Input and Geocoding
3. ⬜️ Neighborhood Boundary Identification
4. ⬜️ Load and Display Property Data
5. ⬜️ Interactive Property Details
6. ⬜️ Adjacent Neighborhoods (Optional)
7. ⬜️ Performance Optimization
