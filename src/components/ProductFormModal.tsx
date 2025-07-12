import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Product } from '../types/product';

interface ProductFormModalProps {
  product: Product | null;
  onSave: (productData: Partial<Product>) => void;
  onClose: () => void;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  product,
  onSave,
  onClose,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    density_15c_vacuum: '',
    product_type: '',
  });

  const [errors, setErrors] = useState<{
    name?: string;
    density_15c_vacuum?: string;
  }>({});

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        density_15c_vacuum: product.density_15c_vacuum.toString(),
        product_type: product.product_type || '',
      });
    }
  }, [product]);

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }

    if (!formData.density_15c_vacuum) {
      newErrors.density_15c_vacuum = 'Density is required';
    } else {
      const density = parseFloat(formData.density_15c_vacuum);
      if (isNaN(density) || density <= 0) {
        newErrors.density_15c_vacuum = 'Density must be a positive number';
      } else if (density > 2000) {
        newErrors.density_15c_vacuum = 'Density seems too high. Please check the value';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSave({
        name: formData.name.trim(),
        density_15c_vacuum: parseFloat(formData.density_15c_vacuum),
        product_type: formData.product_type.trim() || undefined,
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {product ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Product Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g., Marine Gas Oil"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Density */}
            <div>
              <label htmlFor="density" className="block text-sm font-medium text-gray-700 mb-1">
                Density at 15°C Vacuum (kg/m³) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="density"
                value={formData.density_15c_vacuum}
                onChange={(e) => handleInputChange('density_15c_vacuum', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.density_15c_vacuum ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g., 850.0"
                step="0.1"
              />
              {errors.density_15c_vacuum && (
                <p className="mt-1 text-sm text-red-600">{errors.density_15c_vacuum}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Standard reference density used in maritime calculations
              </p>
            </div>

            {/* Product Type */}
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                Product Type (Optional)
              </label>
              <input
                type="text"
                id="type"
                value={formData.product_type}
                onChange={(e) => handleInputChange('product_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., fuel, lubricant, cargo"
              />
              <p className="mt-1 text-xs text-gray-500">
                Used for categorization and reporting
              </p>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {product ? 'Update' : 'Save'} Product
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};