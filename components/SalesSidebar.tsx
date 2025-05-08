import React, { useEffect, useState } from 'react';
import PropertyRecordModal from './PropertyRecordModal';

interface PropertySale {
  id: string;
  address: string;
  neighborhood: string;
  buildingClass: string;
  price: number;
  units: number;
  residentialUnits: number;
  commercialUnits: number;
  yearBuilt: number;
  landSqFt: number;
  grossSqFt: number;
  saleDate: string | Date;
  location?: [number, number]; // [longitude, latitude]
  isMainNeighborhood?: boolean;
}

interface SalesSummary {
  count: number;
  totalValue: number;
  avgPrice: number;
  medianPrice: number;
  totalUnits: number;
  pricePerUnit: number;
  minPrice: number;
  maxPrice: number;
}

interface SalesSidebarProps {
  neighborhood: string | null;
  isOpen: boolean;
  onClose: () => void;
  adjacentNeighborhoods?: string[];
}

const SalesSidebar: React.FC<SalesSidebarProps> = ({ 
  neighborhood, 
  isOpen,
  onClose,
  adjacentNeighborhoods = []
}) => {
  const [sales, setSales] = useState<PropertySale[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<PropertySale | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Fetch sales data when neighborhood changes
  useEffect(() => {
    async function fetchSalesData() {
      if (!neighborhood) {
        setSales([]);
        setSummary(null);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        // Build the URL with the neighborhood and adjacent neighborhoods
        let url = `/api/data/sales?neighborhood=${encodeURIComponent(neighborhood)}`;
        
        // Include adjacent neighborhoods if available
        if (adjacentNeighborhoods && adjacentNeighborhoods.length > 0) {
          url += `&includeAdjacent=true&adjacentNeighborhoods=${encodeURIComponent(adjacentNeighborhoods.join(','))}`;
        }
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch sales data: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Sort by price (high to low)
        const sortedSales = [...data].sort((a, b) => b.price - a.price);
        setSales(sortedSales);
        
        // Calculate summary statistics
        if (sortedSales.length > 0) {
          const count = sortedSales.length;
          const totalValue = sortedSales.reduce((sum, sale) => sum + sale.price, 0);
          const avgPrice = totalValue / count;
          
          // Get median price
          const pricesSorted = [...sortedSales].map(s => s.price).sort((a, b) => a - b);
          const midIndex = Math.floor(pricesSorted.length / 2);
          const medianPrice = pricesSorted.length % 2 === 0 
            ? (pricesSorted[midIndex - 1] + pricesSorted[midIndex]) / 2 
            : pricesSorted[midIndex];
            
          const totalUnits = sortedSales.reduce((sum, sale) => sum + sale.units, 0);
          const pricePerUnit = totalValue / Math.max(1, totalUnits);
          const minPrice = Math.min(...sortedSales.map(s => s.price));
          const maxPrice = Math.max(...sortedSales.map(s => s.price));
          
          setSummary({
            count,
            totalValue,
            avgPrice,
            medianPrice,
            totalUnits,
            pricePerUnit,
            minPrice,
            maxPrice
          });
        } else {
          setSummary(null);
        }
      } catch (err) {
        console.error('Error fetching sales data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load sales data');
        setSales([]);
        setSummary(null);
      } finally {
        setLoading(false);
      }
    }
    
    fetchSalesData();
  }, [neighborhood, adjacentNeighborhoods]);
  
  // Format currency values
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  };
  
  // Format date values
  const formatDate = (dateValue: string | Date) => {
    if (!dateValue) return 'Unknown';
    
    // Handle Excel date number (already converted to YYYY-MM-DD string)
    const date = new Date(dateValue);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Calculate color based on price (for price gradient visualization)
  const getPriceColor = (price: number) => {
    if (!summary) return '#3b82f6'; // Default blue
    
    const min = summary.minPrice;
    const max = summary.maxPrice;
    const range = max - min;
    
    if (range === 0) return '#3b82f6'; // All same price
    
    const normalizedPrice = (price - min) / range;
    
    if (normalizedPrice < 0.33) {
      return '#3b82f6'; // Blue for lower third
    } else if (normalizedPrice < 0.66) {
      return '#f59e0b'; // Yellow/amber for middle third
    } else {
      return '#ef4444'; // Red for upper third
    }
  };
  
  // Get building class description
  const getBuildingClassDescription = (buildingClass: string) => {
    const classDescriptions: Record<string, string> = {
      'C0': 'Walk-up Apartments',
      'C1': 'Walk-up Apartments, Small (3-5 units)',
      'C2': 'Walk-up Apartments, Medium (6-10 units)',
      'C3': 'Walk-up Apartments, Large (11-40 units)',
      'C4': 'Walk-up Apartments, Large (Over 40 units)',
      'C5': 'Converted Dwelling (originally 1-family)',
      'C6': 'Cooperative Walk-up',
      'C7': 'Walk-up with Stores',
      'C8': 'Walk-up, Over 6 Families, with Stores',
      'C9': 'Garden Apartments',
      'D0': 'Elevator Apartments',
      'D1': 'Elevator Apartments, Medium (10-19 stories)',
      'D2': 'Elevator Apartments, Large (20-39 stories)',
      'D3': 'Elevator Apartments, Large (40+ stories)',
      'D4': 'Cooperative Elevator Apartments',
      'D5': 'Elevator with Stores',
      'D6': 'Elevator Co-ops with Stores',
      'D7': 'Elevator Apartments (Luxury)',
      'D8': 'Elevator Apartments, Luxury (With Stores)',
      'D9': 'Elevator Apartments (Miscellaneous)'
    };
    
    return classDescriptions[buildingClass] || buildingClass;
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed right-0 top-0 bottom-0 w-80 bg-white shadow-lg z-10 overflow-y-auto transition-transform transform">
      <div className="p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-blue-700">
            {neighborhood ? `${neighborhood}` : 'Property Sales'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
            aria-label="Close sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="p-4 flex justify-center items-center h-32">
          <svg className="animate-spin h-5 w-5 mr-3 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Loading sales data...</span>
        </div>
      ) : error ? (
        <div className="p-4 text-red-500">
          <div className="bg-red-50 p-3 rounded-md border border-red-200">
            <h3 className="font-semibold text-red-700 mb-1">Error Loading Data</h3>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      ) : (
        <>
          {/* Summary Statistics */}
          {summary && (
            <div className="p-4 bg-blue-50 border-b border-gray-200">
              <h3 className="font-semibold text-blue-800 mb-2">Sales Summary</h3>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                <div className="text-gray-600">Number of Sales:</div>
                <div className="font-medium text-gray-900">{summary.count}</div>
                
                <div className="text-gray-600">Total Value:</div>
                <div className="font-medium text-gray-900">{formatCurrency(summary.totalValue)}</div>
                
                <div className="text-gray-600">Average Price:</div>
                <div className="font-medium text-gray-900">{formatCurrency(summary.avgPrice)}</div>
                
                <div className="text-gray-600">Median Price:</div>
                <div className="font-medium text-gray-900">{formatCurrency(summary.medianPrice)}</div>
                
                <div className="text-gray-600">Total Units:</div>
                <div className="font-medium text-gray-900">{summary.totalUnits}</div>
                
                <div className="text-gray-600">Avg Price/Unit:</div>
                <div className="font-medium text-gray-900">{formatCurrency(summary.pricePerUnit)}</div>
                
                <div className="text-gray-600">Price Range:</div>
                <div className="font-medium text-gray-900">
                  {formatCurrency(summary.minPrice)} - {formatCurrency(summary.maxPrice)}
                </div>
              </div>
              
              {/* Price distribution visualization */}
              <div className="mt-3 mb-1">
                <div className="text-xs text-gray-500 mb-1">Price Distribution:</div>
                <div className="price-gradient rounded h-2 w-full"></div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{formatCurrency(summary.minPrice)}</span>
                  <span>{formatCurrency(summary.maxPrice)}</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Sales List */}
          <div className="p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-gray-700">Sales List</h3>
              <div className="text-xs text-gray-500">
                {sales.length} {sales.length === 1 ? 'property' : 'properties'}
              </div>
            </div>
            
            {sales.length === 0 ? (
              <div className="text-gray-500 bg-gray-50 p-4 rounded-md text-center">
                No sales data found for this neighborhood.
              </div>
            ) : (
              <div className="space-y-4">
                {sales.map(sale => (
                  <div 
                    key={sale.id} 
                    className={`border ${sale.isMainNeighborhood === false ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'} rounded-md p-3 shadow-sm hover:shadow-md transition-shadow`}
                  >
                    <div className="font-bold text-lg" style={{ color: getPriceColor(sale.price) }}>
                      {formatCurrency(sale.price)}
                    </div>
                    <div className="font-medium text-gray-800">{sale.address}</div>
                    {sale.isMainNeighborhood === false && (
                      <div className="text-xs text-green-700 bg-green-100 inline-block px-2 py-0.5 rounded-full mt-1 mb-1">
                        Adjacent Neighborhood
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-2 text-xs">
                      <div className="text-gray-500">Building Class:</div>
                      <div className="text-gray-900" title={getBuildingClassDescription(sale.buildingClass)}>
                        {sale.buildingClass}
                      </div>
                      
                      <div className="text-gray-500">Units:</div>
                      <div className="text-gray-900">
                        {sale.units} ({sale.residentialUnits} res + {sale.commercialUnits} comm)
                      </div>
                      
                      <div className="text-gray-500">Price/Unit:</div>
                      <div className="text-gray-900">{formatCurrency(sale.price / Math.max(1, sale.units))}</div>
                      
                      <div className="text-gray-500">Year Built:</div>
                      <div className="text-gray-900">{sale.yearBuilt || 'N/A'}</div>
                      
                      <div className="text-gray-500">Size:</div>
                      <div className="text-gray-900">{sale.grossSqFt ? `${sale.grossSqFt.toLocaleString()} sq ft` : 'N/A'}</div>
                      
                      <div className="text-gray-500">Price/Sq Ft:</div>
                      <div className="text-gray-900">
                        {sale.grossSqFt && sale.grossSqFt > 0
                          ? formatCurrency(sale.price / sale.grossSqFt) 
                          : 'N/A'}
                      </div>
                      
                      <div className="text-gray-500">Sale Date:</div>
                      <div className="text-gray-900">{formatDate(sale.saleDate)}</div>
                    </div>
                    
                    {/* View Record Button */}
                    <div className="mt-3 flex justify-end">
                      <button 
                        onClick={() => {
                          setSelectedProperty(sale);
                          setIsModalOpen(true);
                        }}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs"
                      >
                        View Record
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
      
      {/* Property Record Modal */}
      <PropertyRecordModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        property={selectedProperty}
      />
    </div>
  );
};

export default SalesSidebar;
