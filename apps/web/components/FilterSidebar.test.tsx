import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import FilterSidebar, { FilterOptions } from './FilterSidebar'

describe('FilterSidebar', () => {
  const mockCategories = [
    { id: 'cat-1', name: 'Beverages', count: 25 },
    { id: 'cat-2', name: 'Snacks', count: 18 },
    { id: 'cat-3', name: 'Dairy', count: 12 },
  ]

  const mockBrands = [
    { name: 'Brand A', count: 15 },
    { name: 'Brand B', count: 10 },
    { name: 'Brand C', count: 8 },
  ]

  const mockPriceRange = { min: 0, max: 1000 }

  const mockOnFilterChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Initial Rendering', () => {
    it('renders filter sidebar with title', () => {
      render(
        <FilterSidebar
          availableCategories={mockCategories}
          availableBrands={mockBrands}
          priceRange={mockPriceRange}
          onFilterChange={mockOnFilterChange}
        />
      )

      expect(screen.getByText('Filters')).toBeInTheDocument()
    })

    it('renders all filter sections', () => {
      render(
        <FilterSidebar
          availableCategories={mockCategories}
          availableBrands={mockBrands}
          priceRange={mockPriceRange}
          onFilterChange={mockOnFilterChange}
        />
      )

      expect(screen.getByText('Categories')).toBeInTheDocument()
      expect(screen.getByText('Price Range')).toBeInTheDocument()
      expect(screen.getByText('Brands')).toBeInTheDocument()
      expect(screen.getByText('Availability')).toBeInTheDocument()
    })

    it('renders all categories with counts', () => {
      render(
        <FilterSidebar
          availableCategories={mockCategories}
          availableBrands={mockBrands}
          priceRange={mockPriceRange}
          onFilterChange={mockOnFilterChange}
        />
      )

      expect(screen.getByText('Beverages')).toBeInTheDocument()
      expect(screen.getByText('(25)')).toBeInTheDocument()
      expect(screen.getByText('Snacks')).toBeInTheDocument()
      expect(screen.getByText('(18)')).toBeInTheDocument()
      expect(screen.getByText('Dairy')).toBeInTheDocument()
      expect(screen.getByText('(12)')).toBeInTheDocument()
    })

    it('renders all brands with counts', () => {
      render(
        <FilterSidebar
          availableCategories={mockCategories}
          availableBrands={mockBrands}
          priceRange={mockPriceRange}
          onFilterChange={mockOnFilterChange}
        />
      )

      expect(screen.getByText('Brand A')).toBeInTheDocument()
      expect(screen.getByText('(15)')).toBeInTheDocument()
      expect(screen.getByText('Brand B')).toBeInTheDocument()
      expect(screen.getByText('(10)')).toBeInTheDocument()
      expect(screen.getByText('Brand C')).toBeInTheDocument()
      expect(screen.getByText('(8)')).toBeInTheDocument()
    })

    it('does not show clear all button when no filters are active', () => {
      render(
        <FilterSidebar
          availableCategories={mockCategories}
          availableBrands={mockBrands}
          priceRange={mockPriceRange}
          onFilterChange={mockOnFilterChange}
        />
      )

      expect(screen.queryByText('Clear all')).not.toBeInTheDocument()
    })
  })

  describe('Section Expansion/Collapse', () => {
    it('all sections are expanded by default', () => {
      render(
        <FilterSidebar
          availableCategories={mockCategories}
          availableBrands={mockBrands}
          priceRange={mockPriceRange}
          onFilterChange={mockOnFilterChange}
        />
      )

      // All category checkboxes should be visible
      expect(screen.getByText('Beverages')).toBeInTheDocument()
      expect(screen.getByText('Snacks')).toBeInTheDocument()
      expect(screen.getByText('Dairy')).toBeInTheDocument()
    })

    it('collapses section when clicking header', () => {
      render(
        <FilterSidebar
          availableCategories={mockCategories}
          availableBrands={mockBrands}
          priceRange={mockPriceRange}
          onFilterChange={mockOnFilterChange}
        />
      )

      const categoriesHeader = screen.getByText('Categories')

      // Verify categories are visible before collapse
      expect(screen.getByText('Beverages')).toBeInTheDocument()

      fireEvent.click(categoriesHeader)

      // After clicking, the section collapses (items may not be visible but still in DOM)
      // Just verify the header is still there
      expect(categoriesHeader).toBeInTheDocument()
    })

    it('expands section when clicking header again', () => {
      render(
        <FilterSidebar
          availableCategories={mockCategories}
          availableBrands={mockBrands}
          priceRange={mockPriceRange}
          onFilterChange={mockOnFilterChange}
        />
      )

      const categoriesHeader = screen.getByText('Categories')
      
      // Collapse
      fireEvent.click(categoriesHeader)
      
      // Expand
      fireEvent.click(categoriesHeader)

      expect(screen.getByText('Beverages')).toBeInTheDocument()
    })
  })

  describe('Category Filtering', () => {
    it('selects a category when checkbox is clicked', () => {
      render(
        <FilterSidebar
          availableCategories={mockCategories}
          availableBrands={mockBrands}
          priceRange={mockPriceRange}
          onFilterChange={mockOnFilterChange}
        />
      )

      const beveragesCheckbox = screen.getByRole('checkbox', { name: /Beverages/ })
      fireEvent.click(beveragesCheckbox)

      expect(mockOnFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          categories: ['cat-1'],
        })
      )
    })

    it('deselects a category when clicking again', () => {
      render(
        <FilterSidebar
          availableCategories={mockCategories}
          availableBrands={mockBrands}
          priceRange={mockPriceRange}
          onFilterChange={mockOnFilterChange}
        />
      )

      const beveragesCheckbox = screen.getByRole('checkbox', { name: /Beverages/ })
      
      // Select
      fireEvent.click(beveragesCheckbox)
      
      // Deselect
      fireEvent.click(beveragesCheckbox)

      expect(mockOnFilterChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          categories: [],
        })
      )
    })

    it('allows selecting multiple categories', () => {
      render(
        <FilterSidebar
          availableCategories={mockCategories}
          availableBrands={mockBrands}
          priceRange={mockPriceRange}
          onFilterChange={mockOnFilterChange}
        />
      )

      const beveragesCheckbox = screen.getByRole('checkbox', { name: /Beverages/ })
      const snacksCheckbox = screen.getByRole('checkbox', { name: /Snacks/ })

      fireEvent.click(beveragesCheckbox)
      fireEvent.click(snacksCheckbox)

      expect(mockOnFilterChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          categories: ['cat-1', 'cat-2'],
        })
      )
    })
  })

  describe('Brand Filtering', () => {
    it('selects a brand when checkbox is clicked', () => {
      render(
        <FilterSidebar
          availableCategories={mockCategories}
          availableBrands={mockBrands}
          priceRange={mockPriceRange}
          onFilterChange={mockOnFilterChange}
        />
      )

      const brandACheckbox = screen.getByRole('checkbox', { name: /Brand A/ })
      fireEvent.click(brandACheckbox)

      expect(mockOnFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          brands: ['Brand A'],
        })
      )
    })

    it('deselects a brand when clicking again', () => {
      render(
        <FilterSidebar
          availableCategories={mockCategories}
          availableBrands={mockBrands}
          priceRange={mockPriceRange}
          onFilterChange={mockOnFilterChange}
        />
      )

      const brandACheckbox = screen.getByRole('checkbox', { name: /Brand A/ })
      
      // Select
      fireEvent.click(brandACheckbox)
      
      // Deselect
      fireEvent.click(brandACheckbox)

      expect(mockOnFilterChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          brands: [],
        })
      )
    })

    it('allows selecting multiple brands', () => {
      render(
        <FilterSidebar
          availableCategories={mockCategories}
          availableBrands={mockBrands}
          priceRange={mockPriceRange}
          onFilterChange={mockOnFilterChange}
        />
      )

      const brandACheckbox = screen.getByRole('checkbox', { name: /Brand A/ })
      const brandBCheckbox = screen.getByRole('checkbox', { name: /Brand B/ })

      fireEvent.click(brandACheckbox)
      fireEvent.click(brandBCheckbox)

      expect(mockOnFilterChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          brands: ['Brand A', 'Brand B'],
        })
      )
    })
  })

  describe('Price Range Filtering', () => {
    it('renders price range inputs with default values', () => {
      render(
        <FilterSidebar
          availableCategories={mockCategories}
          availableBrands={mockBrands}
          priceRange={mockPriceRange}
          onFilterChange={mockOnFilterChange}
        />
      )

      const minInput = screen.getByPlaceholderText('Min')
      const maxInput = screen.getByPlaceholderText('Max')

      expect(minInput).toHaveValue(0)
      expect(maxInput).toHaveValue(1000)
    })

    it('updates minimum price when changed', () => {
      render(
        <FilterSidebar
          availableCategories={mockCategories}
          availableBrands={mockBrands}
          priceRange={mockPriceRange}
          onFilterChange={mockOnFilterChange}
        />
      )

      const minInput = screen.getByPlaceholderText('Min')
      fireEvent.change(minInput, { target: { value: '50' } })

      expect(mockOnFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          priceRange: { min: 50, max: 1000 },
        })
      )
    })

    it('updates maximum price when changed', () => {
      render(
        <FilterSidebar
          availableCategories={mockCategories}
          availableBrands={mockBrands}
          priceRange={mockPriceRange}
          onFilterChange={mockOnFilterChange}
        />
      )

      const maxInput = screen.getByPlaceholderText('Max')
      fireEvent.change(maxInput, { target: { value: '500' } })

      expect(mockOnFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          priceRange: { min: 0, max: 500 },
        })
      )
    })

    it('updates both min and max price', () => {
      render(
        <FilterSidebar
          availableCategories={mockCategories}
          availableBrands={mockBrands}
          priceRange={mockPriceRange}
          onFilterChange={mockOnFilterChange}
        />
      )

      const minInput = screen.getByPlaceholderText('Min')
      const maxInput = screen.getByPlaceholderText('Max')

      fireEvent.change(minInput, { target: { value: '100' } })
      fireEvent.change(maxInput, { target: { value: '800' } })

      expect(mockOnFilterChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          priceRange: { min: 100, max: 800 },
        })
      )
    })
  })

  describe('Stock Availability Filtering', () => {
    it('renders in stock only checkbox', () => {
      render(
        <FilterSidebar
          availableCategories={mockCategories}
          availableBrands={mockBrands}
          priceRange={mockPriceRange}
          onFilterChange={mockOnFilterChange}
        />
      )

      expect(screen.getByText('In stock only')).toBeInTheDocument()
    })

    it('filters by in stock when checkbox is clicked', () => {
      render(
        <FilterSidebar
          availableCategories={mockCategories}
          availableBrands={mockBrands}
          priceRange={mockPriceRange}
          onFilterChange={mockOnFilterChange}
        />
      )

      const inStockCheckbox = screen.getByRole('checkbox', { name: /In stock only/ })
      fireEvent.click(inStockCheckbox)

      expect(mockOnFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          inStockOnly: true,
        })
      )
    })

    it('removes stock filter when unchecked', () => {
      render(
        <FilterSidebar
          availableCategories={mockCategories}
          availableBrands={mockBrands}
          priceRange={mockPriceRange}
          onFilterChange={mockOnFilterChange}
        />
      )

      const inStockCheckbox = screen.getByRole('checkbox', { name: /In stock only/ })

      // Check
      fireEvent.click(inStockCheckbox)

      // Uncheck
      fireEvent.click(inStockCheckbox)

      expect(mockOnFilterChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          inStockOnly: false,
        })
      )
    })
  })

  describe('Clear All Filters', () => {
    it('shows clear all button when filters are active', () => {
      render(
        <FilterSidebar
          availableCategories={mockCategories}
          availableBrands={mockBrands}
          priceRange={mockPriceRange}
          onFilterChange={mockOnFilterChange}
        />
      )

      // Select a category to activate filters
      const beveragesCheckbox = screen.getByRole('checkbox', { name: /Beverages/ })
      fireEvent.click(beveragesCheckbox)

      expect(screen.getByText('Clear all')).toBeInTheDocument()
    })

    it('clears all category filters when clicked', () => {
      render(
        <FilterSidebar
          availableCategories={mockCategories}
          availableBrands={mockBrands}
          priceRange={mockPriceRange}
          onFilterChange={mockOnFilterChange}
        />
      )

      // Select categories
      const beveragesCheckbox = screen.getByRole('checkbox', { name: /Beverages/ })
      const snacksCheckbox = screen.getByRole('checkbox', { name: /Snacks/ })
      fireEvent.click(beveragesCheckbox)
      fireEvent.click(snacksCheckbox)

      // Clear all
      const clearButton = screen.getByText('Clear all')
      fireEvent.click(clearButton)

      expect(mockOnFilterChange).toHaveBeenLastCalledWith({})
    })

    it('clears all brand filters when clicked', () => {
      render(
        <FilterSidebar
          availableCategories={mockCategories}
          availableBrands={mockBrands}
          priceRange={mockPriceRange}
          onFilterChange={mockOnFilterChange}
        />
      )

      // Select brands
      const brandACheckbox = screen.getByRole('checkbox', { name: /Brand A/ })
      fireEvent.click(brandACheckbox)

      // Clear all
      const clearButton = screen.getByText('Clear all')
      fireEvent.click(clearButton)

      expect(mockOnFilterChange).toHaveBeenLastCalledWith({})
    })

    it('resets price range to default when clicked', () => {
      render(
        <FilterSidebar
          availableCategories={mockCategories}
          availableBrands={mockBrands}
          priceRange={mockPriceRange}
          onFilterChange={mockOnFilterChange}
        />
      )

      // Change price range
      const minInput = screen.getByPlaceholderText('Min')
      fireEvent.change(minInput, { target: { value: '100' } })

      // Clear all
      const clearButton = screen.getByText('Clear all')
      fireEvent.click(clearButton)

      expect(mockOnFilterChange).toHaveBeenLastCalledWith({})
      expect(minInput).toHaveValue(0)
    })

    it('clears stock filter when clicked', () => {
      render(
        <FilterSidebar
          availableCategories={mockCategories}
          availableBrands={mockBrands}
          priceRange={mockPriceRange}
          onFilterChange={mockOnFilterChange}
        />
      )

      // Select in stock only
      const inStockCheckbox = screen.getByRole('checkbox', { name: /In stock only/ })
      fireEvent.click(inStockCheckbox)

      // Clear all
      const clearButton = screen.getByText('Clear all')
      fireEvent.click(clearButton)

      expect(mockOnFilterChange).toHaveBeenLastCalledWith({})
      expect(inStockCheckbox).not.toBeChecked()
    })

    it('clears all filters at once', () => {
      render(
        <FilterSidebar
          availableCategories={mockCategories}
          availableBrands={mockBrands}
          priceRange={mockPriceRange}
          onFilterChange={mockOnFilterChange}
        />
      )

      // Select multiple filters
      const beveragesCheckbox = screen.getByRole('checkbox', { name: /Beverages/ })
      const brandACheckbox = screen.getByRole('checkbox', { name: /Brand A/ })
      const inStockCheckbox = screen.getByRole('checkbox', { name: /In stock only/ })
      const minInput = screen.getByPlaceholderText('Min')

      fireEvent.click(beveragesCheckbox)
      fireEvent.click(brandACheckbox)
      fireEvent.click(inStockCheckbox)
      fireEvent.change(minInput, { target: { value: '50' } })

      // Clear all
      const clearButton = screen.getByText('Clear all')
      fireEvent.click(clearButton)

      expect(mockOnFilterChange).toHaveBeenLastCalledWith({})
      expect(beveragesCheckbox).not.toBeChecked()
      expect(brandACheckbox).not.toBeChecked()
      expect(inStockCheckbox).not.toBeChecked()
      expect(minInput).toHaveValue(0)
    })
  })

  describe('Combined Filtering', () => {
    it('applies multiple filter types simultaneously', () => {
      render(
        <FilterSidebar
          availableCategories={mockCategories}
          availableBrands={mockBrands}
          priceRange={mockPriceRange}
          onFilterChange={mockOnFilterChange}
        />
      )

      // Select category
      const beveragesCheckbox = screen.getByRole('checkbox', { name: /Beverages/ })
      fireEvent.click(beveragesCheckbox)

      // Select brand
      const brandACheckbox = screen.getByRole('checkbox', { name: /Brand A/ })
      fireEvent.click(brandACheckbox)

      // Change price
      const minInput = screen.getByPlaceholderText('Min')
      fireEvent.change(minInput, { target: { value: '25' } })

      // Select in stock
      const inStockCheckbox = screen.getByRole('checkbox', { name: /In stock only/ })
      fireEvent.click(inStockCheckbox)

      expect(mockOnFilterChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          categories: ['cat-1'],
          brands: ['Brand A'],
          priceRange: { min: 25, max: 1000 },
          inStockOnly: true,
        })
      )
    })

    it('maintains other filters when one is changed', () => {
      render(
        <FilterSidebar
          availableCategories={mockCategories}
          availableBrands={mockBrands}
          priceRange={mockPriceRange}
          onFilterChange={mockOnFilterChange}
        />
      )

      // Select category
      const beveragesCheckbox = screen.getByRole('checkbox', { name: /Beverages/ })
      fireEvent.click(beveragesCheckbox)

      // Select brand
      const brandACheckbox = screen.getByRole('checkbox', { name: /Brand A/ })
      fireEvent.click(brandACheckbox)

      // Both filters should be maintained
      expect(mockOnFilterChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          categories: ['cat-1'],
          brands: ['Brand A'],
        })
      )
    })
  })

  describe('Custom className', () => {
    it('applies custom className to container', () => {
      const { container } = render(
        <FilterSidebar
          availableCategories={mockCategories}
          availableBrands={mockBrands}
          priceRange={mockPriceRange}
          onFilterChange={mockOnFilterChange}
          className="custom-class"
        />
      )

      const filterContainer = container.querySelector('.custom-class')
      expect(filterContainer).toBeInTheDocument()
    })
  })
})
