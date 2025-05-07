import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

interface AddressSearchProps {
  onAddressSelect: (address: AddressResult) => void;
}

interface AddressResult {
  address: string;
  coordinates: [number, number]; // [longitude, latitude]
  neighborhood?: string;
}

const AddressSearch: React.FC<AddressSearchProps> = ({ onAddressSelect }) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Function to fetch address suggestions from Mapbox
  const fetchAddressSuggestions = async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);

    try {
      // Mapbox Geocoding API with NYC boundary bias
      const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        query
      )}.json?access_token=${
        process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
      }&country=us&types=address&bbox=-74.25909,40.477399,-73.700181,40.916178&limit=5`;

      const response = await fetch(endpoint);
      const data = await response.json();

      if (data && data.features) {
        setSuggestions(data.features);
      }
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Debounce API requests
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    debounceTimeout.current = setTimeout(() => {
      fetchAddressSuggestions(value);
    }, 300);
  };

  const handleSuggestionClick = async (suggestion: any) => {
    const address = suggestion.place_name;
    const coordinates = suggestion.geometry.coordinates;
    
    setInputValue(address);
    setSuggestions([]);
    
    try {
      // Fetch neighborhood data based on coordinates
      const response = await fetch(
        `/api/neighborhoods?lng=${coordinates[0]}&lat=${coordinates[1]}`
      );
      
      if (response.ok) {
        const data = await response.json();
        
        onAddressSelect({
          address,
          coordinates,
          neighborhood: data.neighborhood,
        });
      } else {
        // If no neighborhood found, still select the address
        onAddressSelect({
          address,
          coordinates,
        });
      }
    } catch (error) {
      console.error('Error fetching neighborhood data:', error);
      
      // Still select the address even if neighborhood lookup fails
      onAddressSelect({
        address,
        coordinates,
      });
    }
  };

  // Clear suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setSuggestions([]);
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Enter NYC address..."
          className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          autoComplete="off"
        />
        {isLoading && (
          <div className="absolute right-3 top-3">
            <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg max-h-60 overflow-auto">
          <ul className="py-1">
            {suggestions.map((suggestion) => (
              <li
                key={suggestion.id}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSuggestionClick(suggestion);
                }}
              >
                {suggestion.place_name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AddressSearch;
