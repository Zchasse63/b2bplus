'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import SearchBar from '@/components/SearchBar'
import FilterSidebar, { FilterOptions } from '@/components/FilterSidebar'
import ProductCardWithPricing from '@/components/ProductCardWithPricing'
import type { Product, Category } from '@b2b-plus/supabase'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<FilterOptions>({})
  const [availableCategories, setAvailableCategories] = useState<any[]>([])
  const [availableBrands, setAvailableBrands] = useState<any[]>([])
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000 })
  const supabase = createClient()

  useEffect(() => {
    fetchProductsAndFacets()
  }, [searchQuery, filters])

  const fetchProductsAndFacets = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/auth/login'
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('current_organization_id')
        .eq('id', user.id)
        .single()

      if (!profile?.current_organization_id) {
        throw new Error('No organization found')
      }

      // Build query
      let query = supabase
        .from('products')
        .select('*, categories (*)', { count: 'exact' })
        .eq('organization_id', profile.current_organization_id)

      // Search
      if (searchQuery) {
        query = query.textSearch('name', searchQuery, { type: 'websearch' })
      }

      // Filters
      if (filters.inStockOnly) {
        query = query.eq('in_stock', true)
      }
      if (filters.categories && filters.categories.length > 0) {
        query = query.in('category_id', filters.categories)
      }
      if (filters.brands && filters.brands.length > 0) {
        query = query.in('brand', filters.brands)
      }
      if (filters.priceRange) {
        query = query.gte('base_price', filters.priceRange.min).lte('base_price', filters.priceRange.max)
      }

      // Execute query
      const { data, error, count } = await query.order('name', { ascending: true })

      if (error) throw error
      setProducts(data || [])

      // Fetch facets
      const { data: categoryFacets } = await supabase.rpc('get_category_facets', { org_id: profile.current_organization_id })
      const { data: brandFacets } = await supabase.rpc('get_brand_facets', { org_id: profile.current_organization_id })
      const { data: priceRangeData } = await supabase.rpc('get_price_range', { org_id: profile.current_organization_id })

      setAvailableCategories(categoryFacets || [])
      setAvailableBrands(brandFacets || [])
      if (priceRangeData) {
        setPriceRange({ min: priceRangeData.min_price, max: priceRangeData.max_price })
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products')
      console.error('Error fetching products:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Product Catalog</h1>
          <p className="mt-2 text-gray-600">Browse our selection of food service disposables</p>
        </div>

        <div className="mb-8">
          <SearchBar onSearch={setSearchQuery} />
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          <aside className="lg:col-span-1">
            <FilterSidebar
              availableCategories={availableCategories}
              availableBrands={availableBrands}
              priceRange={priceRange}
              onFilterChange={setFilters}
            />
          </aside>

          <main className="lg:col-span-3">
            {loading ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-96 animate-pulse rounded-lg bg-gray-200"></div>
                ))}
              </div>
            ) : error ? (
              <div className="flex h-full items-center justify-center rounded-lg bg-white p-12 text-center shadow">
                <h2 className="text-xl font-semibold text-red-600">Error</h2>
                <p className="mt-2 text-gray-600">{error}</p>
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {products.map((product) => (
                  <ProductCardWithPricing key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center rounded-lg bg-white p-12 text-center shadow">
                <h2 className="text-xl font-semibold text-gray-900">No Products Found</h2>
                <p className="mt-2 text-gray-600">Try adjusting your search or filters.</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
