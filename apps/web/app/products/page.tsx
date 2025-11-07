'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { PageHeader, Card, ProductCard, Input, Button, Select } from '@/components/b2b';
import { FiSearch, FiGrid, FiList } from 'react-icons/fi';
import type { Product } from '@b2b-plus/supabase';

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [categories, setCategories] = useState<any[]>([]);
  const supabase = createClient();

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });

    if (!error && data) {
      setProducts(data);
    }
    setLoading(false);
  }, [supabase]);

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase.from('categories').select('*');
    if (data) {
      setCategories(data);
    }
  }, [supabase]);

  // Memoized filtered and sorted products
  const filteredProducts = useMemo(() => {
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

    return filtered;
  }, [products, searchQuery, selectedCategory, sortBy]);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  async function handleAddToCart(productId: string) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/auth/login');
      return;
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_organization_id')
      .eq('id', user.id)
      .single();

    const organizationId = profile?.current_organization_id;

    if (!organizationId) {
      console.error('No organization found for user');
      return;
    }

    // ATOMIC: Use database function to handle race conditions
    // This atomically inserts or updates the cart item with quantity increment
    const { data, error } = await supabase.rpc('upsert_cart_item_atomic', {
      p_user_id: user.id,
      p_product_id: productId,
      p_quantity: 1,
      p_organization_id: organizationId
    });

    if (error) {
      console.error('Error adding to cart:', error);
      return;
    }

    if (data?.[0]?.success) {
      const wasInsert = data[0].was_insert;
      console.log(wasInsert ? 'Added to cart' : 'Cart updated - quantity increased');
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
        <div className="text-lg text-b2b-gray-500">Loading products...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
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
              aria-label="Grid view"
            />
            <Button
              variant={viewMode === 'list' ? 'primary' : 'ghost'}
              size="sm"
              icon={<FiList />}
              onClick={() => setViewMode('list')}
              aria-label="List view"
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
            <FiSearch className="mx-auto mb-4 h-16 w-16 opacity-30" aria-hidden="true" />
            <h2 className="mb-2 text-lg font-semibold">No products found</h2>
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
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              price={product.base_price}
              image={product.image_url || undefined}
              category={product.category || undefined}
              inStock={product.in_stock}
              onAddToCart={handleAddToCart}
              onClick={() => router.push(`/products/${product.id}`)}
              variant={viewMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}
