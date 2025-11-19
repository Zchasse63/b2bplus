'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { PageHeader, Card, Input, Button, Select } from '@/components/b2b';
import ProductCardWithPricing from '@/components/ProductCardWithPricing';
import { FiSearch, FiGrid, FiList } from 'react-icons/fi';
import type { Product } from '@b2b-plus/supabase';
import { fadeIn, fast } from '@/lib/animations';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [categories, setCategories] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  useEffect(() => {
    filterAndSortProducts();
  }, [products, searchQuery, selectedCategory, sortBy]);

  async function fetchProducts() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching products:', error);
        throw error;
      }

      if (data) {
        setProducts(data);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
      // You might want to set an error state here to show in the UI
    } finally {
      setLoading(false);
    }
  }

  async function fetchCategories() {
    const { data } = await supabase.from('categories').select('*');
    if (data) {
      setCategories(data);
    }
  }

  function filterAndSortProducts() {
    let filtered = [...products];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.sku.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price-asc':
          return a.base_price - b.base_price;
        case 'price-desc':
          return b.base_price - a.base_price;
        default:
          return 0;
      }
    });

    setFilteredProducts(filtered);
  }

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    ...categories.map((cat) => ({ value: cat.name, label: cat.name })),
  ];

  const sortOptions = [
    { value: 'name', label: 'Name (A-Z)' },
    { value: 'price-asc', label: 'Price (Low to High)' },
    { value: 'price-desc', label: 'Price (High to Low)' },
  ];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-b2b-gray-500">Loading products...</div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      transition={fast}
    >
      {/* Page Header */}
      <PageHeader
        title="Product Catalog"
        subtitle="Browse our complete selection of food service disposables"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'primary' : 'ghost'}
              size="sm"
              icon={<FiGrid />}
              onClick={() => setViewMode('grid')}
            />
            <Button
              variant={viewMode === 'list' ? 'primary' : 'ghost'}
              size="sm"
              icon={<FiList />}
              onClick={() => setViewMode('list')}
            />
          </div>
        }
      />

      {/* Filters */}
      <Card padding="lg">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<FiSearch />}
            iconPosition="left"
          />
          <Select
            options={categoryOptions}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          />
          <Select options={sortOptions} value={sortBy} onChange={(e) => setSortBy(e.target.value)} />
        </div>
      </Card>

      {/* Results Count */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-b2b-gray-500">
          Showing {filteredProducts.length} of {products.length} products
        </p>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <Card padding="lg" className="text-center">
          <div className="text-b2b-gray-500">
            <FiSearch className="mx-auto mb-4 h-16 w-16 opacity-30" />
            <h3 className="mb-2 text-lg font-semibold">No products found</h3>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
        </Card>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              : 'flex flex-col gap-4'
          }
        >
          {filteredProducts.map((product) => (
            <ProductCardWithPricing
              key={product.id}
              product={product}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
