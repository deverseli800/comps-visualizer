import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';

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
  location?: [number, number];
  isMainNeighborhood?: boolean;
}

interface PropertyRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: PropertySale | null;
}

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

const PropertyRecordModal: React.FC<PropertyRecordModalProps> = ({
  isOpen,
  onClose,
  property
}) => {
  const [isEnriching, setIsEnriching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [extractedData, setExtractedData] = useState<{[key: string]: any} | null>(null);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  };

  const handleEnrichRecord = async () => {
    if (!property) return;
    
    setIsEnriching(true);
    setSearchResults([]);
    setExtractedData(null);
    
    try {
      // Call your backend API that interfaces with OpenAI web search
      const response = await fetch('/api/enrich-property', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          property: {
            address: property.address,
            neighborhood: property.neighborhood,
            price: property.price,
            saleDate: property.saleDate,
            units: property.units,
            yearBuilt: property.yearBuilt
          }
        })
      });
      
      if (!response.ok) throw new Error('Failed to enrich property data');
      
      const data = await response.json();
      setSearchResults(data.searchResults || []);
      setExtractedData(data.extractedData || null);
    } catch (error) {
      console.error('Error enriching property data:', error);
    } finally {
      setIsEnriching(false);
    }
  };

  if (!property) return null;

  // Function to get description for building class
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

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-50 overflow-y-auto"
    >
      <div className="flex items-center justify-center min-h-screen p-4">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

        <div className="relative bg-white rounded-lg max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto shadow-xl">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
            <Dialog.Title className="text-lg font-bold">
              Property Record: {property.address}
            </Dialog.Title>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Property Details */}
          <div className="px-6 py-4">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <h3 className="text-xl font-bold text-blue-700">{formatCurrency(property.price)}</h3>
                <p className="text-gray-600">{property.neighborhood}</p>
                <p className="text-sm text-gray-500">
                  Sale Date: {typeof property.saleDate === 'string' 
                    ? new Date(property.saleDate).toLocaleDateString() 
                    : property.saleDate.toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm">
                  <span className="font-medium">Building Class:</span> {property.buildingClass}
                  <span className="text-xs text-gray-500 block">
                    {getBuildingClassDescription(property.buildingClass)}
                  </span>
                </p>
                <p className="text-sm"><span className="font-medium">Year Built:</span> {property.yearBuilt}</p>
                <p className="text-sm">
                  <span className="font-medium">Price Per Unit:</span> {formatCurrency(property.price / Math.max(1, property.units))}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-medium mb-2">Building Information</h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div><span className="font-medium">Total Units:</span> {property.units}</div>
                <div><span className="font-medium">Residential Units:</span> {property.residentialUnits}</div>
                <div><span className="font-medium">Commercial Units:</span> {property.commercialUnits}</div>
                <div><span className="font-medium">Gross Sq Ft:</span> {property.grossSqFt?.toLocaleString() || 'N/A'}</div>
                <div><span className="font-medium">Land Sq Ft:</span> {property.landSqFt?.toLocaleString() || 'N/A'}</div>
                <div>
                  <span className="font-medium">Price/Sq Ft:</span> {
                    property.grossSqFt ? formatCurrency(property.price / property.grossSqFt) : 'N/A'
                  }
                </div>
              </div>
            </div>
            
            {/* AI-Extracted Data (if available) */}
            {extractedData && (
              <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-3">AI-Extracted Information</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {Object.entries(extractedData).map(([key, value]) => (
                    <div key={key} className="col-span-1">
                      <span className="font-medium">{key}:</span> {value || 'N/A'}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Enrich Record Button */}
            <div className="mb-6 flex justify-center">
              <button
                onClick={handleEnrichRecord}
                disabled={isEnriching}
                className={`${
                  isEnriching ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'
                } text-white px-4 py-2 rounded-lg flex items-center`}
              >
                {isEnriching ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Searching Web...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Enrich Record with AI
                  </>
                )}
              </button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="border-t border-gray-200 pt-6">
                <h4 className="font-medium mb-4">Web Search Results</h4>
                <div className="space-y-4">
                  {searchResults.map((result, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <a 
                        href={result.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 font-medium block mb-1"
                      >
                        {result.title}
                      </a>
                      <p className="text-sm text-gray-600">{result.snippet}</p>
                      <div className="mt-1 text-xs text-gray-400 truncate">
                        <span>{result.link}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default PropertyRecordModal;
