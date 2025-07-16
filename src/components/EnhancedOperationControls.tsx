import React, { useState, useEffect, useCallback } from 'react';

interface EnhancedOperationControlsProps {
  operationType: 'loading' | 'unloading';
  operationQuantity: number;
  onOperationTypeChange: (type: 'loading' | 'unloading') => void;
  onOperationQuantityChange: (value: string) => void;
  averageDensity: number;
}

export const EnhancedOperationControls: React.FC<EnhancedOperationControlsProps> = ({
  operationType,
  operationQuantity,
  onOperationTypeChange,
  onOperationQuantityChange,
  averageDensity
}) => {
  const [quantityUnit, setQuantityUnit] = useState<'m3' | 'mt'>('m3');
  const [displayQuantity, setDisplayQuantity] = useState<string>(operationQuantity.toString());

  // Convert between m³ and MT
  const convertQuantity = useCallback((value: number, fromUnit: 'm3' | 'mt', toUnit: 'm3' | 'mt'): number => {
    // Handle invalid inputs
    if (!isFinite(value) || value < 0) return 0;
    if (fromUnit === toUnit) return value;
    if (averageDensity <= 0) return 0;
    
    if (fromUnit === 'm3' && toUnit === 'mt') {
      // m³ to MT: volume * density / 1000
      return (value * averageDensity) / 1000;
    } else {
      // MT to m³: (mass * 1000) / density
      return (value * 1000) / averageDensity;
    }
  }, [averageDensity]);

  // Update display when unit changes
  useEffect(() => {
    const currentM3 = operationQuantity;
    if (quantityUnit === 'mt') {
      const mt = convertQuantity(currentM3, 'm3', 'mt');
      setDisplayQuantity(mt.toFixed(1));
    } else {
      setDisplayQuantity(currentM3.toString());
    }
  }, [quantityUnit, operationQuantity, averageDensity, convertQuantity]);

  const handleQuantityChange = (value: string) => {
    setDisplayQuantity(value);
    const numValue = parseFloat(value) || 0;
    
    // Convert to m³ if needed
    const m3Value = quantityUnit === 'mt' 
      ? convertQuantity(numValue, 'mt', 'm3')
      : numValue;
    
    onOperationQuantityChange(m3Value.toString());
  };

  const handleUnitToggle = () => {
    setQuantityUnit(prev => prev === 'm3' ? 'mt' : 'm3');
  };

  return (
    <div className="bg-white border border-gray-200 rounded p-2">
      <div className="text-xs font-bold text-gray-700 mb-1">OPERATION CONTROL</div>
      
      {/* Operation Type */}
      <div className="flex bg-gray-100 rounded border border-gray-300 overflow-hidden mb-2">
        <button
          className={`flex-1 px-2 py-1 text-xs font-bold transition-colors ${
            operationType === 'loading'
              ? 'bg-green-600 text-white'
              : 'bg-white text-black hover:bg-gray-50'
          }`}
          onClick={() => onOperationTypeChange('loading')}
        >
          LOAD
        </button>
        <button
          className={`flex-1 px-2 py-1 text-xs font-bold transition-colors ${
            operationType === 'unloading'
              ? 'bg-red-600 text-white'
              : 'bg-white text-black hover:bg-gray-50'
          }`}
          onClick={() => onOperationTypeChange('unloading')}
        >
          UNLOAD
        </button>
      </div>

      {/* Quantity Input with Unit Toggle */}
      <div className="space-y-1">
        <div className="flex items-center space-x-1">
          <input
            type="number"
            value={displayQuantity}
            onChange={(e) => handleQuantityChange(e.target.value)}
            className="flex-1 text-xs border border-gray-300 rounded px-2 py-1"
            step={quantityUnit === 'mt' ? '0.1' : '10'}
            min="0"
          />
          <button
            onClick={handleUnitToggle}
            className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700 font-bold"
            title={`Switch to ${quantityUnit === 'm3' ? 'Metric Tons' : 'Cubic Meters'}`}
          >
            {quantityUnit === 'm3' ? 'm³' : 'MT'}
          </button>
        </div>
        
        {/* Conversion Display */}
        <div className="text-xs text-gray-600">
          {quantityUnit === 'm3' ? (
            <span>≈ {convertQuantity(parseFloat(displayQuantity) || 0, 'm3', 'mt').toFixed(1)} MT</span>
          ) : (
            <span>≈ {convertQuantity(parseFloat(displayQuantity) || 0, 'mt', 'm3').toFixed(0)} m³</span>
          )}
        </div>
      </div>
    </div>
  );
};