import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductDto {
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  imageUrl?: string;
}

export interface UpdateProductDto {
  name?: string;
  description?: string;
  price?: number;
  category?: string;
  stock?: number;
  imageUrl?: string;
}

@Injectable()
export class ProductsService {
  private products: Product[] = [
    {
      id: '1',
      name: 'Laptop',
      description: 'High-performance laptop for professionals',
      price: 1299.99,
      category: 'Electronics',
      stock: 50,
      imageUrl: 'https://example.com/laptop.jpg',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      name: 'Smartphone',
      description: 'Latest model smartphone with advanced features',
      price: 899.99,
      category: 'Electronics',
      stock: 100,
      imageUrl: 'https://example.com/phone.jpg',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '3',
      name: 'Coffee Mug',
      description: 'Ceramic coffee mug for daily use',
      price: 19.99,
      category: 'Home & Kitchen',
      stock: 200,
      imageUrl: 'https://example.com/mug.jpg',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  // Generate more products for testing
  constructor() {
    this.generateMoreProducts();
  }

  private generateMoreProducts() {
    const categories = ['Electronics', 'Home & Kitchen', 'Books', 'Clothing', 'Sports'];
    const productTypes = ['Widget', 'Gadget', 'Tool', 'Device', 'Accessory'];
    
    for (let i = 4; i <= 1000; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const type = productTypes[Math.floor(Math.random() * productTypes.length)];
      
      this.products.push({
        id: i.toString(),
        name: `${type} ${i}`,
        description: `Description for ${type} ${i}`,
        price: Math.round((Math.random() * 1000 + 10) * 100) / 100,
        category,
        stock: Math.floor(Math.random() * 500),
        imageUrl: `https://example.com/${type.toLowerCase()}-${i}.jpg`,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
    category?: string,
    minPrice?: number,
    maxPrice?: number,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<{
    products: Product[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    let filteredProducts = [...this.products];

    // Apply filters
    if (search) {
      filteredProducts = filteredProducts.filter(product =>
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.description.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (category) {
      filteredProducts = filteredProducts.filter(product =>
        product.category.toLowerCase() === category.toLowerCase()
      );
    }

    if (minPrice !== undefined) {
      filteredProducts = filteredProducts.filter(product => product.price >= minPrice);
    }

    if (maxPrice !== undefined) {
      filteredProducts = filteredProducts.filter(product => product.price <= maxPrice);
    }

    // Apply sorting
    filteredProducts.sort((a, b) => {
      const aValue = a[sortBy as keyof Product];
      const bValue = b[sortBy as keyof Product];
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    const total = filteredProducts.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const products = filteredProducts.slice(startIndex, endIndex);

    return { products, total, page, limit, totalPages };
  }

  async findOne(id: string): Promise<Product> {
    const product = this.products.find(p => p.id === id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const newProduct: Product = {
      id: uuidv4(),
      ...createProductDto,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.products.push(newProduct);
    return newProduct;
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    const productIndex = this.products.findIndex(p => p.id === id);
    if (productIndex === -1) {
      throw new NotFoundException('Product not found');
    }

    this.products[productIndex] = {
      ...this.products[productIndex],
      ...updateProductDto,
      updatedAt: new Date(),
    };

    return this.products[productIndex];
  }

  async remove(id: string): Promise<void> {
    const productIndex = this.products.findIndex(p => p.id === id);
    if (productIndex === -1) {
      throw new NotFoundException('Product not found');
    }

    this.products.splice(productIndex, 1);
  }

  async getCategories(): Promise<string[]> {
    const categories = [...new Set(this.products.map(p => p.category))];
    return categories.sort();
  }
}
