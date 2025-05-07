import React, { useState } from 'react';

interface TestPointProps {
  name: string;
  lng: number;
  lat: number;
}

const NeighborhoodDebug: React.FC = () => {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Pre-defined test points in NYC neighborhoods
  const testPoints: TestPointProps[] = [
    { name: "Times Square", lng: -73.9855, lat: 40.7580 },
    { name: "Central Park", lng: -73.9665, lat: 40.7812 },
    { name: "Empire State", lng: -73.9857, lat: 40.7484 },
    { name: "Chelsea", lng: -74.0014, lat: 40.7430 },
    { name: "Upper East Side", lng: -73.9595, lat: 40.7735 },
    { name: "Brooklyn Bridge", lng: -73.9974, lat: 40.7061 },
    { name: "Williamsburg", lng: -73.9630, lat: 40.7140 }
  ];

  const testNeighborhood = async (point: TestPointProps) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/neighborhoods?lng=${point.lng}&lat=${point.lat}`);
      const data = await response.json();
      setResult({
        point: point,
        status: response.status,
        data: data
      });
    } catch (error) {
      console.error("Error testing neighborhood:", error);
      setResult({
        point: point,
        error: String(error)
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-gray-100 rounded-lg mt-4">
      <h2 className="text-lg font-bold mb-2">Neighborhood Debug Tool</h2>
      <div className="grid grid-cols-2 gap-2 mb-4 md:grid-cols-4">
        {testPoints.map((point) => (
          <button
            key={point.name}
            onClick={() => testNeighborhood(point)}
            disabled={loading}
            className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Test {point.name}
          </button>
        ))}
      </div>

      {loading && <div className="text-center py-2">Testing...</div>}

      {result && (
        <div className="mt-4 p-4 bg-white rounded border">
          <h3 className="font-bold">Test Result: {result.point.name}</h3>
          <p className="text-sm mb-2">
            Coordinates: {result.point.lng}, {result.point.lat}
          </p>
          
          {result.error ? (
            <div className="text-red-500">{result.error}</div>
          ) : (
            <>
              <p>Status: {result.status}</p>
              <pre className="bg-gray-100 p-2 mt-2 overflow-auto text-xs">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default NeighborhoodDebug;
