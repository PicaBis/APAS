import React from 'react';

// Simple fallback component for now
const Simulation3D: React.FC<any> = (props) => {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg">
      <div className="text-center">
        <div className="text-2xl mb-2">🚧</div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">3D Mode Coming Soon</h3>
        <p className="text-sm text-gray-500">3D simulation is being prepared</p>
        <p className="text-xs text-gray-400 mt-2">Please use 2D mode for now</p>
      </div>
    </div>
  );
};

export default Simulation3D;
