import { Product } from '../types/product';

export class ProductService {
  private static instance: ProductService;
  
  // Storage key
  private readonly PRODUCTS_KEY = 'tankmon_products';

  static getInstance(): ProductService {
    if (!ProductService.instance) {
      ProductService.instance = new ProductService();
    }
    return ProductService.instance;
  }

  private getItem<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Failed to read from localStorage (${key}):`, error);
      return null;
    }
  }

  private setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Failed to write to localStorage (${key}):`, error);
      throw error;
    }
  }

  // Validation methods
  private validateProduct(product: Partial<Product>): void {
    // Check required fields
    if (!product.name || typeof product.name !== 'string' || product.name.trim() === '') {
      throw new Error('Product name is required and must be a non-empty string');
    }

    if (product.density_15c_vacuum === undefined || product.density_15c_vacuum === null) {
      throw new Error('Product density at 15°C is required');
    }

    if (typeof product.density_15c_vacuum !== 'number' || product.density_15c_vacuum <= 0) {
      throw new Error('Product density must be a positive number');
    }
  }

  // CRUD operations
  getProducts(): Product[] {
    return this.getItem<Product[]>(this.PRODUCTS_KEY) || [];
  }

  getProduct(id: string): Product | null {
    const products = this.getProducts();
    return products.find(p => p.id === id) || null;
  }

  saveProduct(product: Product): void {
    // Validate product data
    this.validateProduct(product);

    const products = this.getProducts();
    const existingIndex = products.findIndex(p => p.id === product.id);
    
    const now = new Date();
    const updatedProduct: Product = {
      ...product,
      id: product.id || crypto.randomUUID(),
      updated_at: now,
      created_at: existingIndex >= 0 ? products[existingIndex].created_at : now
    };

    if (existingIndex >= 0) {
      products[existingIndex] = updatedProduct;
    } else {
      products.unshift(updatedProduct);
    }

    this.setItem(this.PRODUCTS_KEY, products);
  }

  deleteProduct(id: string): void {
    const products = this.getProducts();
    const filtered = products.filter(p => p.id !== id);
    this.setItem(this.PRODUCTS_KEY, filtered);
  }

  updateProduct(id: string, updates: Partial<Product>): void {
    const product = this.getProduct(id);
    if (!product) {
      throw new Error(`Product with id ${id} not found`);
    }

    const updatedProduct: Product = {
      ...product,
      ...updates,
      id: product.id, // Ensure ID cannot be changed
      created_at: product.created_at, // Preserve original creation date
      updated_at: new Date()
    };

    // Validate the updated product
    this.validateProduct(updatedProduct);

    // Save the updated product
    this.saveProduct(updatedProduct);
  }

  // Additional utility methods
  findProductByName(name: string): Product | null {
    const products = this.getProducts();
    return products.find(p => p.name.toLowerCase() === name.toLowerCase()) || null;
  }

  searchProducts(query: string): Product[] {
    const products = this.getProducts();
    const lowercaseQuery = query.toLowerCase();
    
    return products.filter(p => 
      p.name.toLowerCase().includes(lowercaseQuery) ||
      (p.product_type && p.product_type.toLowerCase().includes(lowercaseQuery))
    );
  }

  // Export/Import functionality
  exportProducts(): string {
    const products = this.getProducts();
    const exportData = {
      products,
      export_date: new Date().toISOString(),
      total_count: products.length
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  importProducts(data: string, replace: boolean = false): boolean {
    try {
      const parsed = JSON.parse(data);
      const importedProducts = parsed.products || parsed;

      if (!Array.isArray(importedProducts)) {
        throw new Error('Invalid import data: expected an array of products');
      }

      // Validate all products before importing
      importedProducts.forEach((product: Product) => {
        this.validateProduct(product);
      });

      if (replace) {
        // Replace all existing products
        this.setItem(this.PRODUCTS_KEY, importedProducts);
      } else {
        // Merge with existing products
        const existingProducts = this.getProducts();
        const productMap = new Map<string, Product>();
        
        // Add existing products to map
        existingProducts.forEach(p => productMap.set(p.id, p));
        
        // Add/update imported products
        importedProducts.forEach((p: Product) => {
          productMap.set(p.id || crypto.randomUUID(), {
            ...p,
            id: p.id || crypto.randomUUID(),
            created_at: p.created_at || new Date(),
            updated_at: new Date()
          });
        });
        
        this.setItem(this.PRODUCTS_KEY, Array.from(productMap.values()));
      }

      console.log(`✅ Successfully imported ${importedProducts.length} products`);
      return true;
    } catch (error) {
      console.error('❌ Failed to import products:', error);
      return false;
    }
  }

  // Clear all products (use with caution)
  clearAllProducts(): void {
    if (confirm('Are you sure you want to delete all products? This action cannot be undone.')) {
      this.setItem(this.PRODUCTS_KEY, []);
      console.log('✅ All products have been cleared');
    }
  }
}