import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, Package } from 'lucide-react';
import { ProductFormModal } from './ProductFormModal';
import { ProductService } from '../services/ProductService';
import { Product } from '../types/product';

export const ProductManagement: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const productService = useMemo(() => ProductService.getInstance(), []);

  const loadProducts = React.useCallback(() => {
    const loadedProducts = productService.getProducts();
    setProducts(loadedProducts);
  }, [productService]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleAddProduct = () => {
    setEditingProduct(null);
    setShowFormModal(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowFormModal(true);
  };

  const handleDeleteProduct = (product: Product) => {
    if (confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
      try {
        productService.deleteProduct(product.id);
        loadProducts();
        setNotification({ type: 'success', message: `Product "${product.name}" deleted successfully` });
        
        // Notify other components that products have been updated
        window.dispatchEvent(new CustomEvent('productUpdated'));
      } catch (error) {
        setNotification({ type: 'error', message: `Failed to delete product: ${error.message}` });
      }
    }
  };

  const handleSaveProduct = (productData: Partial<Product>) => {
    try {
      if (editingProduct) {
        productService.updateProduct(editingProduct.id, productData);
        setNotification({ type: 'success', message: `Product "${productData.name}" updated successfully` });
      } else {
        const newProduct: Product = {
          ...productData as Product,
          id: crypto.randomUUID(),
          created_at: new Date(),
          updated_at: new Date()
        };
        productService.saveProduct(newProduct);
        setNotification({ type: 'success', message: `Product "${productData.name}" added successfully` });
      }
      loadProducts();
      setShowFormModal(false);
      setEditingProduct(null);
      
      // Notify other components that products have been updated
      window.dispatchEvent(new CustomEvent('productUpdated'));
    } catch (error) {
      setNotification({ type: 'error', message: error.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Package className="w-6 h-6 mr-2" />
            Product Management
          </h2>
          <p className="text-gray-600 mt-1">
            Manage products and their density properties
          </p>
        </div>
        <button
          onClick={handleAddProduct}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </button>
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`p-4 rounded-lg ${
            notification.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">All Products</h3>
        </div>

        {products.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No products added yet</p>
            <p className="text-sm mt-1">Click "Add Product" to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Density (15°C Vacuum)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {product.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(product.density_15c_vacuum ?? 0).toFixed(1)} kg/m³
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.product_type || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                        title="Edit product"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Product Form Modal */}
      {showFormModal && (
        <ProductFormModal
          product={editingProduct}
          onSave={handleSaveProduct}
          onClose={() => {
            setShowFormModal(false);
            setEditingProduct(null);
          }}
        />
      )}
    </div>
  );
};