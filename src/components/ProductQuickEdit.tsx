import React, { useState, useEffect } from 'react';
import { Product } from '../types/product';
import { ProductService } from '../services/ProductService';

interface ProductQuickEditProps {
  products: Product[];
  onProductUpdate: () => void;
}

export const ProductQuickEdit: React.FC<ProductQuickEditProps> = ({ products, onProductUpdate }) => {
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [editingDensity, setEditingDensity] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [productService] = useState(() => ProductService.getInstance());

  // Load first product by default
  useEffect(() => {
    if (products.length > 0 && !selectedProductId) {
      setSelectedProductId(products[0].id);
      setEditingDensity(products[0].density_15c_vacuum.toString());
    }
  }, [products, selectedProductId]);

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId);
    const product = products.find(p => p.id === productId);
    if (product) {
      setEditingDensity(product.density_15c_vacuum.toString());
    }
    setIsEditing(false);
  };

  const handleDensityUpdate = () => {
    if (!selectedProduct) return;
    
    const newDensity = parseFloat(editingDensity);
    if (isNaN(newDensity) || newDensity <= 0) {
      alert('Please enter a valid density value');
      return;
    }

    try {
      productService.updateProduct(selectedProduct.id, {
        density_15c_vacuum: newDensity
      });
      setIsEditing(false);
      onProductUpdate();
    } catch (error) {
      alert(`Failed to update density: ${error.message}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleDensityUpdate();
    } else if (e.key === 'Escape') {
      setEditingDensity(selectedProduct?.density_15c_vacuum.toString() || '');
      setIsEditing(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded p-2">
      <div className="text-xs font-bold text-gray-700 mb-1">PRODUCT INFO</div>
      
      {/* Product Selector */}
      <select
        value={selectedProductId}
        onChange={(e) => handleProductChange(e.target.value)}
        className="w-full text-xs border border-gray-300 rounded px-2 py-1 mb-2"
      >
        <option value="">Select Product</option>
        {products.map(product => (
          <option key={product.id} value={product.id}>
            {product.name}
          </option>
        ))}
      </select>

      {selectedProduct && (
        <div className="space-y-1">
          {/* Product Name */}
          <div className="text-xs">
            <span className="text-gray-600">Name:</span>
            <span className="font-medium ml-1">{selectedProduct.name}</span>
          </div>
          
          {/* Density Editor */}
          <div className="text-xs">
            <span className="text-gray-600">Density:</span>
            {isEditing ? (
              <div className="flex items-center space-x-1 mt-1">
                <input
                  type="number"
                  value={editingDensity}
                  onChange={(e) => setEditingDensity(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="flex-1 text-xs border border-blue-300 rounded px-1 py-0.5"
                  step="0.1"
                  autoFocus
                />
                <button
                  onClick={handleDensityUpdate}
                  className="text-xs bg-green-600 text-white px-2 py-0.5 rounded hover:bg-green-700"
                >
                  ✓
                </button>
                <button
                  onClick={() => {
                    setEditingDensity(selectedProduct.density_15c_vacuum.toString());
                    setIsEditing(false);
                  }}
                  className="text-xs bg-gray-500 text-white px-2 py-0.5 rounded hover:bg-gray-600"
                >
                  ✗
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between mt-1">
                <span className="font-medium">
                  {selectedProduct.density_15c_vacuum.toFixed(1)} kg/m³
                </span>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};