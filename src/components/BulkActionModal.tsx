import React, { useState, useMemo, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Package, Thermometer, Target, Activity } from 'lucide-react';
import { EnhancedTank } from '../types/tankTable';
import { Product } from '../types/product';
import { ProductService } from '../services/ProductService';

export interface BulkOperationalUpdate {
  targetGroup: 'all' | 'BB' | 'SB' | 'CENTER';
  productId?: string;
  temperature?: number;
  setpoint?: number;
}

interface BulkActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  tanks: EnhancedTank[];
  onApply: (updates: BulkOperationalUpdate) => void;
}

export const BulkActionModal: React.FC<BulkActionModalProps> = ({
  isOpen,
  onClose,
  tanks,
  onApply
}) => {
  const [targetGroup, setTargetGroup] = useState<BulkOperationalUpdate['targetGroup']>('all');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [temperature, setTemperature] = useState<string>('');
  const [setpoint, setSetpoint] = useState<string>('');
  
  // Checkboxes for which fields to apply
  const [applyProduct, setApplyProduct] = useState(false);
  const [applyTemperature, setApplyTemperature] = useState(false);
  const [applySetpoint, setApplySetpoint] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const productService = useMemo(() => ProductService.getInstance(), []);

  // Load products on mount and listen for updates
  useEffect(() => {
    const loadProducts = () => {
      const loadedProducts = productService.getProducts();
      setProducts(loadedProducts);
    };

    if (isOpen) {
      loadProducts();
      
      // Listen for product updates while modal is open
      const handleProductUpdate = () => {
        loadProducts();
      };

      window.addEventListener('productUpdated', handleProductUpdate);
      return () => {
        window.removeEventListener('productUpdated', handleProductUpdate);
      };
    }
  }, [isOpen, productService]);

  // Calculate affected tanks based on target group
  const affectedTanks = useMemo(() => {
    switch (targetGroup) {
      case 'BB':
        return tanks.filter(tank => tank.group === 'BB');
      case 'SB':
        return tanks.filter(tank => tank.group === 'SB');
      case 'CENTER':
        return tanks.filter(tank => tank.group === 'CENTER');
      case 'all':
      default:
        return tanks;
    }
  }, [tanks, targetGroup]);

  // Validate inputs
  const validateInputs = (): boolean => {
    const errors: string[] = [];

    // Check if at least one field is selected
    if (!applyProduct && !applyTemperature && !applySetpoint) {
      errors.push('Please select at least one field to update');
    }

    // Validate product selection
    if (applyProduct && !selectedProductId) {
      errors.push('Please select a product');
    }

    // Validate temperature
    if (applyTemperature) {
      const tempValue = parseFloat(temperature);
      if (isNaN(tempValue)) {
        errors.push('Temperature must be a valid number');
      } else if (tempValue < -50 || tempValue > 150) {
        errors.push('Temperature must be between -50°C and 150°C');
      }
    }

    // Validate setpoint
    if (applySetpoint) {
      const setpointValue = parseFloat(setpoint);
      if (isNaN(setpointValue)) {
        errors.push('Setpoint must be a valid number');
      } else if (setpointValue < 0) {
        errors.push('Setpoint must be positive');
      }
    }



    // Check if there are tanks to update
    if (affectedTanks.length === 0) {
      errors.push('No tanks match the selected group');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleApply = () => {
    if (!validateInputs()) {
      return;
    }

    const updates: BulkOperationalUpdate = {
      targetGroup
    };

    if (applyProduct && selectedProductId) {
      updates.productId = selectedProductId;
    }

    if (applyTemperature && temperature) {
      updates.temperature = parseFloat(temperature);
    }

    if (applySetpoint && setpoint) {
      updates.setpoint = parseFloat(setpoint);
    }



    onApply(updates);
    handleClose();
  };

  const handleClose = () => {
    // Reset form
    setTargetGroup('all');
    setSelectedProductId('');
    setTemperature('');
    setSetpoint('');
    setApplyProduct(false);
    setApplyTemperature(false);
    setApplySetpoint(false);
    setValidationErrors([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Bulk Tank Operations</h2>
              <p className="text-gray-600 mt-1">
                Apply operational settings to multiple tanks at once
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Target Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Tanks
            </label>
            <select
              value={targetGroup}
              onChange={(e) => setTargetGroup(e.target.value as BulkOperationalUpdate['targetGroup'])}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Tanks ({tanks.length})</option>
              <option value="BB">BB Group ({tanks.filter(t => t.group === 'BB').length})</option>
              <option value="SB">SB Group ({tanks.filter(t => t.group === 'SB').length})</option>
              <option value="CENTER">CENTER Group ({tanks.filter(t => t.group === 'CENTER').length})</option>
            </select>
          </div>

          {/* Affected Tanks Preview */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center mb-2">
              <AlertCircle className="w-5 h-5 text-blue-600 mr-2" />
              <h3 className="text-sm font-medium text-blue-900">
                {affectedTanks.length} tanks will be updated
              </h3>
            </div>
            <div className="text-sm text-blue-700">
              {affectedTanks.slice(0, 5).map(tank => tank.name).join(', ')}
              {affectedTanks.length > 5 && ` and ${affectedTanks.length - 5} more...`}
            </div>
          </div>

          {/* Update Fields */}
          <div className="space-y-4">
            {/* Product Selection */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <input
                  type="checkbox"
                  id="apply-product"
                  checked={applyProduct}
                  onChange={(e) => setApplyProduct(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="apply-product" className="flex items-center cursor-pointer">
                  <Package className="w-4 h-4 mr-2 text-gray-600" />
                  <span className="font-medium">Update Product</span>
                </label>
              </div>
              {applyProduct && (
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!applyProduct}
                >
                  <option value="">Select a product</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Temperature */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <input
                  type="checkbox"
                  id="apply-temperature"
                  checked={applyTemperature}
                  onChange={(e) => setApplyTemperature(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="apply-temperature" className="flex items-center cursor-pointer">
                  <Thermometer className="w-4 h-4 mr-2 text-gray-600" />
                  <span className="font-medium">Update Temperature (°C)</span>
                </label>
              </div>
              {applyTemperature && (
                <input
                  type="number"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  placeholder="Enter temperature"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!applyTemperature}
                  step="0.1"
                />
              )}
            </div>

            {/* Setpoint */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <input
                  type="checkbox"
                  id="apply-setpoint"
                  checked={applySetpoint}
                  onChange={(e) => setApplySetpoint(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="apply-setpoint" className="flex items-center cursor-pointer">
                  <Target className="w-4 h-4 mr-2 text-gray-600" />
                  <span className="font-medium">Update Setpoint (liters)</span>
                </label>
              </div>
              {applySetpoint && (
                <input
                  type="number"
                  value={setpoint}
                  onChange={(e) => setSetpoint(e.target.value)}
                  placeholder="Enter setpoint volume"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!applySetpoint}
                  step="1"
                  min="0"
                />
              )}
            </div>


          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="mt-4 p-4 bg-red-50 rounded-lg">
              <div className="flex items-center mb-2">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <h3 className="text-red-900 font-medium">Please fix the following errors:</h3>
              </div>
              <ul className="text-red-800 list-disc list-inside text-sm">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer Actions */}
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Apply to {affectedTanks.length} Tanks
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};