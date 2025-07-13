import React, { useState, useEffect } from 'react';
import { Tank } from '../types/tank';
import { AlertTriangle, TrendingUp, TrendingDown, Minus, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Product, TankOperationalData, CalculationResult } from '../types/product';
import { ProductService } from '../services/ProductService';
import { operationalCalculationService } from '../services/OperationalCalculationService';
import { EnhancedTank } from '../types/tankTable';

interface TankCardProps {
  tank: Tank;
}

export const TankCard: React.FC<TankCardProps> = ({ tank }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [operationalData, setOperationalData] = useState<TankOperationalData>({
    temperature: tank.temperature || 0, // Only use actual temperature, 0 as placeholder for input
    setpoint: 0,
    flowRate: 0
  });
  const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null);
  const [errors, setErrors] = useState<{temperature?: string; setpoint?: string; flowRate?: string}>({});

  // Load products on mount
  useEffect(() => {
    const productService = ProductService.getInstance();
    setProducts(productService.getProducts());
  }, []);

  // Calculate metrics whenever inputs change
  useEffect(() => {
    if (selectedProductId && operationalData.temperature) {
      const product = products.find(p => p.id === selectedProductId);
      if (product) {
        // Create an enhanced tank object for calculations
        const enhancedTank: EnhancedTank = {
          ...tank,
          current_volume_liters: calculateVolumeFromLevel(tank.currentLevel),
          max_volume_liters: calculateVolumeFromLevel(tank.maxCapacity)
        };
        
        const result = operationalCalculationService.calculateTankMetrics(
          enhancedTank,
          product,
          operationalData
        );
        setCalculationResult(result);
      }
    } else {
      setCalculationResult(null);
    }
  }, [selectedProductId, operationalData, products, tank]);

  // Helper function to calculate volume from level (simplified - in real app would use calibration data)
  const calculateVolumeFromLevel = (level: number): number => {
    // Assuming a simple linear relationship for now
    // In production, this would use actual tank calibration data
    const volumePerMm = 10; // Example: 10 liters per mm
    return level * volumePerMm;
  };

  const handleInputChange = (field: keyof TankOperationalData, value: string) => {
    const numValue = parseFloat(value) || 0;
    
    // Validation
    let error = '';
    if (field === 'temperature') {
      if (numValue < -50 || numValue > 150) {
        error = 'Temperature must be between -50°C and 150°C';
      }
    } else if (field === 'setpoint') {
      if (numValue < 0) {
        error = 'Setpoint must be positive';
      }
    }
    
    setErrors(prev => ({ ...prev, [field]: error }));
    setOperationalData(prev => ({ ...prev, [field]: numValue }));
  };

  const formatTimeRemaining = (minutes: number | null): string => {
    if (minutes === null) return '--';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  // Use real volume from tank table calibration data if available
  const currentVolume = (tank as Tank & { current_volume_liters?: number }).current_volume_liters || 0;
  const selectedProduct = products.find(p => p.id === selectedProductId);
  const getStatusColor = (status: Tank['status']) => {
    switch (status) {
      case 'normal': return 'bg-green-500';
      case 'low': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: Tank['status']) => {
    switch (status) {
      case 'normal': return 'Normal';
      case 'low': return 'Low Level';
      case 'high': return 'High Level';
      case 'critical': return 'Critical';
      default: return 'Unknown';
    }
  };

  const getTrendIcon = (trend: Tank['trend']) => {
    switch (trend) {
      case 'loading': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'unloading': return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'stable': return <Minus className="w-4 h-4 text-gray-500" />;
      default: return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTrendColor = (trend: Tank['trend']) => {
    switch (trend) {
      case 'loading': return 'text-green-600 bg-green-50';
      case 'unloading': return 'text-red-600 bg-red-50';
      case 'stable': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-500 bg-gray-50';
    }
  };

  const getTrendText = (trend: Tank['trend']) => {
    switch (trend) {
      case 'loading': return 'Loading';
      case 'unloading': return 'Unloading';
      case 'stable': return 'Stable';
      default: return 'Unknown';
    }
  };

  const percentage = ((tank.currentLevel ?? 0) / (tank.maxCapacity ?? 1)) * 100;
  const isAlarm = tank.status === 'low' || tank.status === 'high' || tank.status === 'critical';

  return (
    <div className={`bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${
      isAlarm ? 'border-red-300 shadow-red-100' : 'border-gray-200'
    }`}>
      {/* Header with tank name and status */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{tank.name}</h3>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor(tank.status)} ring-2 ring-white`}></div>
            <span className="text-sm font-medium text-blue-100">
              {getStatusText(tank.status)}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Main display section - always visible */}
        <div className="space-y-3">
          {/* Level and percentage */}
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-800 mb-1">
              {(tank.currentLevel ?? 0).toFixed(0)} <span className="text-lg text-gray-500">mm</span>
            </div>
            <div className="text-lg font-semibold text-blue-600">
              {(percentage ?? 0).toFixed(1)}%
            </div>
            {/* Add volume display */}
            <div className="text-sm font-medium text-green-600 mt-1">
              {((currentVolume ?? 0) / 1000).toFixed(2)} <span className="text-xs text-gray-500">m³</span>
            </div>
          </div>
          
          {/* Volume and metric tons display */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <div className="text-xs text-gray-600 font-medium">Volume</div>
              <div className="text-sm font-bold text-gray-700">
                {((currentVolume ?? 0) / 1000).toFixed(2)} m³
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <div className="text-xs text-gray-600 font-medium">Metric Tons</div>
              <div className="text-sm font-bold text-gray-700">
                {calculationResult ? calculationResult.metricTons.toFixed(2) : '--'}
              </div>
            </div>
          </div>
          
          {/* Product name display */}
          <div className="bg-blue-50 rounded-lg p-2 text-center">
            <div className="text-xs text-blue-600 font-medium">Product</div>
            <div className="text-sm font-semibold text-blue-700">
              {selectedProduct ? selectedProduct.name : 'No product selected'}
            </div>
          </div>
        </div>

        {/* Visual level indicator */}
        <div className="relative">
          <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden shadow-inner">
            <div
              className={`h-full transition-all duration-700 ease-out ${getStatusColor(tank.status)} relative`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white opacity-30"></div>
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0</span>
            <span>{tank.maxCapacity} mm</span>
          </div>
        </div>

        {/* Additional info grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {tank.temperature !== undefined && (
            <div className="bg-blue-50 rounded-lg p-2 text-center">
              <div className="text-xs text-blue-600 font-medium">Temperature</div>
              <div className="text-lg font-bold text-blue-700">
                {(tank.temperature ?? 0).toFixed(1)}°C
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <div className="text-xs text-gray-600 font-medium">Location</div>
            <div className="text-sm font-semibold text-gray-700">
              {tank.location}
            </div>
          </div>
        </div>

        {/* Trend indicator */}
        {tank.trend && (
          <div className={`flex items-center justify-center space-x-2 px-3 py-2 rounded-lg ${getTrendColor(tank.trend)}`}>
            {getTrendIcon(tank.trend)}
            <span className="text-sm font-medium">{getTrendText(tank.trend)}</span>
            {tank.trendValue && tank.trendValue > 0 && (
              <span className="text-xs opacity-75">
                {(tank.trendValue ?? 0).toFixed(1)} mm/min
              </span>
            )}
          </div>
        )}

        {/* Collapsible operational section */}
        <div className="border-t pt-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="text-sm font-medium text-gray-700">Operational Data</span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>
          
          {/* Expanded content with smooth transition */}
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isExpanded ? 'max-h-[500px] opacity-100 mt-3' : 'max-h-0 opacity-0'
          }`}>
            <div className="space-y-3">
              {/* Product selector */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Product
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">Select a product</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Temperature input */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Temperature (°C)
                </label>
                <input
                  type="number"
                  value={operationalData.temperature}
                  onChange={(e) => handleInputChange('temperature', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${
                    errors.temperature ? 'border-red-300' : 'border-gray-300'
                  }`}
                  step="0.1"
                />
                {errors.temperature && (
                  <p className="mt-1 text-xs text-red-600">{errors.temperature}</p>
                )}
              </div>
              
              {/* Setpoint input */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Setpoint (Liters)
                </label>
                <input
                  type="number"
                  value={operationalData.setpoint}
                  onChange={(e) => handleInputChange('setpoint', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${
                    errors.setpoint ? 'border-red-300' : 'border-gray-300'
                  }`}
                  step="100"
                />
                {errors.setpoint && (
                  <p className="mt-1 text-xs text-red-600">{errors.setpoint}</p>
                )}
              </div>
              
              {/* Flow rate input */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Flow Rate (L/min)
                </label>
                <input
                  type="number"
                  value={operationalData.flowRate}
                  onChange={(e) => handleInputChange('flowRate', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${
                    errors.flowRate ? 'border-red-300' : 'border-gray-300'
                  }`}
                  step="10"
                  placeholder="+ for filling, - for emptying"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Positive for filling, negative for emptying
                </p>
              </div>
              
              {/* Calculation results */}
              {calculationResult && selectedProduct && (
                <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                  <div className="text-xs font-medium text-blue-700">Calculation Results</div>
                  
                  {/* VCF display */}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">VCF:</span>
                    <span className="font-medium text-gray-800">
                      {(calculationResult.vcf ?? 0).toFixed(4)}
                    </span>
                  </div>
                  
                  {/* Time remaining */}
                  {operationalData.flowRate !== 0 && calculationResult.remainingTime !== null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Time to Setpoint:</span>
                      <span className="font-medium text-gray-800">
                        {formatTimeRemaining(calculationResult.remainingTime)}
                      </span>
                    </div>
                  )}
                  
                  {/* Time to empty */}
                  {operationalData.flowRate < 0 && calculationResult.timeToEmpty !== null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Time to Empty:</span>
                      <span className="font-medium text-orange-600">
                        {formatTimeRemaining(calculationResult.timeToEmpty)}
                      </span>
                    </div>
                  )}
                  
                  {/* Time to full */}
                  {operationalData.flowRate > 0 && calculationResult.timeToFull !== null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Time to Full:</span>
                      <span className="font-medium text-orange-600">
                        {formatTimeRemaining(calculationResult.timeToFull)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Last update */}
        <div className="flex items-center justify-center space-x-1 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          <span>{new Date(tank.lastUpdated).toLocaleTimeString()}</span>
        </div>

        {/* Alarm indicator */}
        {isAlarm && (
          <div className="flex items-center justify-center space-x-2 p-2 bg-red-100 border border-red-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-sm font-medium text-red-700">Attention Required</span>
          </div>
        )}
      </div>
    </div>
  );
};