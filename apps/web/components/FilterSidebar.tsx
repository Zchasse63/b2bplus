'use client'

import { useState } from 'react'

export interface FilterOptions {
  categories?: string[]
  priceRange?: { min: number; max: number }
  brands?: string[]
  inStockOnly?: boolean
}

interface FilterSidebarProps {
  availableCategories: Array<{ id: string; name: string; count: number }>
  availableBrands: Array<{ name: string; count: number }>
  priceRange: { min: number; max: number }
  onFilterChange: (filters: FilterOptions) => void
  className?: string
}

export default function FilterSidebar({
  availableCategories,
  availableBrands,
  priceRange,
  onFilterChange,
  className = ''
}: FilterSidebarProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [selectedPriceRange, setSelectedPriceRange] = useState(priceRange)
  const [inStockOnly, setInStockOnly] = useState(false)
  const [expandedSections, setExpandedSections] = useState({
    categories: true,
    price: true,
    brands: true,
    stock: true,
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleCategoryChange = (categoryId: string) => {
    const newCategories = selectedCategories.includes(categoryId)
      ? selectedCategories.filter(id => id !== categoryId)
      : [...selectedCategories, categoryId]
    
    setSelectedCategories(newCategories)
    applyFilters({ categories: newCategories })
  }

  const handleBrandChange = (brand: string) => {
    const newBrands = selectedBrands.includes(brand)
      ? selectedBrands.filter(b => b !== brand)
      : [...selectedBrands, brand]
    
    setSelectedBrands(newBrands)
    applyFilters({ brands: newBrands })
  }

  const handlePriceChange = (min: number, max: number) => {
    const newPriceRange = { min, max }
    setSelectedPriceRange(newPriceRange)
    applyFilters({ priceRange: newPriceRange })
  }

  const handleStockChange = (checked: boolean) => {
    setInStockOnly(checked)
    applyFilters({ inStockOnly: checked })
  }

  const applyFilters = (partialFilters: Partial<FilterOptions>) => {
    onFilterChange({
      categories: partialFilters.categories ?? selectedCategories,
      brands: partialFilters.brands ?? selectedBrands,
      priceRange: partialFilters.priceRange ?? selectedPriceRange,
      inStockOnly: partialFilters.inStockOnly ?? inStockOnly,
    })
  }

  const clearAllFilters = () => {
    setSelectedCategories([])
    setSelectedBrands([])
    setSelectedPriceRange(priceRange)
    setInStockOnly(false)
    onFilterChange({})
  }

  const hasActiveFilters = selectedCategories.length > 0 || 
                          selectedBrands.length > 0 || 
                          inStockOnly ||
                          selectedPriceRange.min !== priceRange.min ||
                          selectedPriceRange.max !== priceRange.max

  return (
    <div className={`rounded-lg bg-white p-4 shadow ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Categories Filter */}
      <div className="mb-6 border-b border-gray-200 pb-4">
        <button
          onClick={() => toggleSection('categories')}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="font-medium text-gray-900">Categories</span>
          <svg
            className={`h-5 w-5 transform transition-transform ${
              expandedSections.categories ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {expandedSections.categories && (
          <div className="mt-3 space-y-2">
            {availableCategories.map(category => (
              <label key={category.id} className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(category.id)}
                  onChange={() => handleCategoryChange(category.id)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  {category.name}
                  <span className="ml-1 text-gray-500">({category.count})</span>
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Price Range Filter */}
      <div className="mb-6 border-b border-gray-200 pb-4">
        <button
          onClick={() => toggleSection('price')}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="font-medium text-gray-900">Price Range</span>
          <svg
            className={`h-5 w-5 transform transition-transform ${
              expandedSections.price ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {expandedSections.price && (
          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={selectedPriceRange.min}
                onChange={(e) => handlePriceChange(Number(e.target.value), selectedPriceRange.max)}
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                placeholder="Min"
              />
              <span className="text-gray-500">-</span>
              <input
                type="number"
                value={selectedPriceRange.max}
                onChange={(e) => handlePriceChange(selectedPriceRange.min, Number(e.target.value))}
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                placeholder="Max"
              />
            </div>
          </div>
        )}
      </div>

      {/* Brands Filter */}
      <div className="mb-6 border-b border-gray-200 pb-4">
        <button
          onClick={() => toggleSection('brands')}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="font-medium text-gray-900">Brands</span>
          <svg
            className={`h-5 w-5 transform transition-transform ${
              expandedSections.brands ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {expandedSections.brands && (
          <div className="mt-3 space-y-2">
            {availableBrands.map(brand => (
              <label key={brand.name} className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedBrands.includes(brand.name)}
                  onChange={() => handleBrandChange(brand.name)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  {brand.name}
                  <span className="ml-1 text-gray-500">({brand.count})</span>
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Stock Filter */}
      <div>
        <button
          onClick={() => toggleSection('stock')}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="font-medium text-gray-900">Availability</span>
          <svg
            className={`h-5 w-5 transform transition-transform ${
              expandedSections.stock ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {expandedSections.stock && (
          <div className="mt-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => handleStockChange(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">In stock only</span>
            </label>
          </div>
        )}
      </div>
    </div>
  )
}
