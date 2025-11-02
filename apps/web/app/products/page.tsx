'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Card from '@/components/horizon/card';
import ProductCard from '@/components/horizon/product/ProductCard';
import Input from '@/components/horizon/input/Input';
import Button from '@/components/horizon/button/Button';
import Select from '@/components/horizon/input/Select';
import { MdSearch, MdFilterList, MdGridView, MdViewList } from 'react-icons/md';
import type { Product } from '@b2b-plus/supabase';

export default function ProductsPage() {
  const router = useRouter();
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
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });

    if (!error && data) {
      setProducts(data);
    }
    setLoading(false);
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

  async function handleAddToCart(productId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push('/auth/login');
      return;
    }

    // Add to cart logic
    const { error } = await supabase.from('cart_items').insert({
      user_id: user.id,
      product_id: productId,
      quantity: 1,
    });

    if (!error) {
      // Show success notification (you can add a toast here)
      console.log('Added to cart');
    }
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
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading products...</div>
      </div>
    );
  }

  return (
    <div className="mt-3 animate-fadeIn">
      {/* Header */}
      <Card extra="mb-5 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy-700 dark:text-white">Product Catalog</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Browse our complete selection of food service disposables
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'primary' : 'ghost'}
              size="sm"
              icon={<MdGridView />}
              onClick={() => setViewMode('grid')}
            />
            <Button
              variant={viewMode === 'list' ? 'primary' : 'ghost'}
              size="sm"
              icon={<MdViewList />}
              onClick={() => setViewMode('list')}
            />
          </div>
        </div>
      </Card>

      {/* Filters */}
      <Card extra="mb-5 p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="relative">
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <MdSearch className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
          </div>
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
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredProducts.length} of {products.length} products
        </p>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <Card extra="p-12 text-center">
          <div className="text-gray-500 dark:text-gray-400">
            <MdSearch className="mx-auto mb-4 h-16 w-16 opacity-30" />
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
            <ProductCard key={product.id} product={product} onAddToCart={handleAddToCart} />
          ))}
        </div>
      )}
    </div>
  );
}
