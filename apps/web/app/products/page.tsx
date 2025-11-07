'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { PageHeader, Card, Input, Button, Select } from '@/components/b2b';
import ProductCardWithPricing from '@/components/ProductCardWithPricing';
import { FiSearch, FiGrid, FiList } from 'react-icons/fi';
import type { Product } from '@b2b-plus/supabase';
import { fadeIn, fast } from '@/lib/animations';

const PRODUCTS_PER_PAGE = 24;

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [categories, setCategories] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [currentPage, searchQuery, selectedCategory, sortBy]);

  async function fetchProducts() {
    setLoading(true);

    // Calculate pagination
    const from = (currentPage - 1) * PRODUCTS_PER_PAGE;
    const to = from + PRODUCTS_PER_PAGE - 1;

    // Build query
    let query = supabase
      .from('products')
      .select('*', { count: 'exact' });

    // Apply category filter
    if (selectedCategory !== 'all') {
      query = query.eq('category', selectedCategory);
    }

    // Apply search filter
    if (searchQuery) {
      query = query.or(
        `name.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%`
      );
    }

    // Apply sorting
    switch (sortBy) {
      case 'name':
        query = query.order('name', { ascending: true });
        break;
      case 'price-asc':
        query = query.order('base_price', { ascending: true });
        break;
      case 'price-desc':
        query = query.order('base_price', { ascending: false });
        break;
    }

    // Apply pagination
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (!error && data) {
      setProducts(data);
      setTotalCount(count || 0);
    }
    setLoading(false);
  }

  async function fetchCategories() {
    const { data } = await supabase.from('categories').select('*');
    if (data) {
      setCategories(data);
    }
  }

  // Reset to page 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setCurrentPage(1);
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalCount / PRODUCTS_PER_PAGE);
  const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE + 1;
  const endIndex = Math.min(currentPage * PRODUCTS_PER_PAGE, totalCount);

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
            onChange={(e) => handleSearchChange(e.target.value)}
            icon={<FiSearch />}
            iconPosition="left"
          />
          <Select
            options={categoryOptions}
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
          />
          <Select options={sortOptions} value={sortBy} onChange={(e) => handleSortChange(e.target.value)} />
        </div>
      </Card>

      {/* Results Count & Pagination Info */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-b2b-gray-500">
          {totalCount > 0 ? (
            <>
              Showing {startIndex}-{endIndex} of {totalCount} products
            </>
          ) : (
            'No products found'
          )}
        </p>
        {totalPages > 1 && (
          <p className="text-sm text-b2b-gray-500">
            Page {currentPage} of {totalPages}
          </p>
        )}
      </div>

      {/* Products Grid */}
      {products.length === 0 && !loading ? (
        <Card padding="lg" className="text-center">
          <div className="text-b2b-gray-500">
            <FiSearch className="mx-auto mb-4 h-16 w-16 opacity-30" />
            <h3 className="mb-2 text-lg font-semibold">No products found</h3>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
        </Card>
      ) : (
        <>
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                : 'flex flex-col gap-4'
            }
          >
            {products.map((product) => (
              <ProductCardWithPricing
                key={product.id}
                product={product}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <Card padding="lg" className="mt-6">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>

                <div className="flex items-center gap-2">
                  {/* Show first page */}
                  {currentPage > 3 && (
                    <>
                      <Button
                        variant={currentPage === 1 ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => setCurrentPage(1)}
                      >
                        1
                      </Button>
                      {currentPage > 4 && (
                        <span className="text-b2b-gray-400">...</span>
                      )}
                    </>
                  )}

                  {/* Show pages around current page */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (page) =>
                        page === currentPage ||
                        page === currentPage - 1 ||
                        page === currentPage + 1 ||
                        page === currentPage - 2 ||
                        page === currentPage + 2
                    )
                    .map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    ))}

                  {/* Show last page */}
                  {currentPage < totalPages - 2 && (
                    <>
                      {currentPage < totalPages - 3 && (
                        <span className="text-b2b-gray-400">...</span>
                      )}
                      <Button
                        variant={currentPage === totalPages ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </Card>
          )}
        </>
      )}
    </motion.div>
  );
}
