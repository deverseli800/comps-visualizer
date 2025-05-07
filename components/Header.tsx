import React from 'react';

const Header = () => {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <span className="text-xl font-bold text-gray-800">🗺️ NYC Property Visualizer</span>
          </div>
          <div>
            {/* Navigation or other header elements can be added here */}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
