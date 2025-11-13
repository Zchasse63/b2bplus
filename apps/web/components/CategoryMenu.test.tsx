import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import CategoryMenu from './CategoryMenu'
import { createClient } from '@/lib/supabase/client'

// Mock dependencies
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

jest.mock('next/link', () => {
  const MockLink = ({ children, href }: any) => <a href={href}>{children}</a>
  MockLink.displayName = 'MockLink'
  return MockLink
})

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

describe('CategoryMenu', () => {
  let mockSupabase: any

  const mockCategories = [
    {
      id: 'cat-1',
      name: 'Beverages',
      slug: 'beverages',
      description: 'Drinks and beverages',
      parent_id: null,
      sort_order: 1,
      is_active: true,
    },
    {
      id: 'cat-2',
      name: 'Coffee',
      slug: 'coffee',
      description: 'Coffee products',
      parent_id: 'cat-1',
      sort_order: 1,
      is_active: true,
    },
    {
      id: 'cat-3',
      name: 'Tea',
      slug: 'tea',
      description: 'Tea products',
      parent_id: 'cat-1',
      sort_order: 2,
      is_active: true,
    },
    {
      id: 'cat-4',
      name: 'Snacks',
      slug: 'snacks',
      description: 'Snack items',
      parent_id: null,
      sort_order: 2,
      is_active: true,
    },
  ]

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn(() => mockSupabase),
      select: jest.fn(() => mockSupabase),
      eq: jest.fn(() => mockSupabase),
      order: jest.fn(() => Promise.resolve({ data: mockCategories, error: null })),
    }
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('shows loading skeleton initially', () => {
    render(<CategoryMenu />)

    // Should show 5 skeleton items
    const skeletons = screen.getAllByRole('generic').filter(el => 
      el.className.includes('bg-gray-200')
    )
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('fetches and displays categories', async () => {
    render(<CategoryMenu />)

    await waitFor(() => {
      expect(screen.getByText('Beverages')).toBeInTheDocument()
      expect(screen.getByText('Snacks')).toBeInTheDocument()
    })
  })

  it('organizes categories into hierarchy', async () => {
    render(<CategoryMenu />)

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('categories')
      expect(mockSupabase.eq).toHaveBeenCalledWith('is_active', true)
      expect(mockSupabase.order).toHaveBeenCalledWith('sort_order', { ascending: true })
    })
  })

  it('renders category links with correct href', async () => {
    render(<CategoryMenu />)

    await waitFor(() => {
      const beveragesLink = screen.getByText('Beverages').closest('a')
      expect(beveragesLink).toHaveAttribute('href', '/categories/beverages')

      const snacksLink = screen.getByText('Snacks').closest('a')
      expect(snacksLink).toHaveAttribute('href', '/categories/snacks')
    })
  })

  it('shows subcategories on hover', async () => {
    render(<CategoryMenu />)

    await waitFor(() => {
      expect(screen.getByText('Beverages')).toBeInTheDocument()
    })

    // Hover over Beverages category
    const beveragesItem = screen.getByText('Beverages').closest('li')
    if (beveragesItem) {
      fireEvent.mouseEnter(beveragesItem)
    }

    // Subcategories should be visible
    await waitFor(() => {
      expect(screen.getByText('Coffee')).toBeInTheDocument()
      expect(screen.getByText('Tea')).toBeInTheDocument()
    })
  })

  it('hides subcategories on mouse leave', async () => {
    render(<CategoryMenu />)

    await waitFor(() => {
      expect(screen.getByText('Beverages')).toBeInTheDocument()
    })

    // Hover over Beverages
    const beveragesItem = screen.getByText('Beverages').closest('li')
    if (beveragesItem) {
      fireEvent.mouseEnter(beveragesItem)
      
      await waitFor(() => {
        expect(screen.getByText('Coffee')).toBeInTheDocument()
      })

      // Mouse leave
      fireEvent.mouseLeave(beveragesItem)
    }
  })

  it('handles fetch error gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    mockSupabase.order.mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    })

    render(<CategoryMenu />)

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching categories:',
        expect.objectContaining({ message: 'Database error' })
      )
    })

    consoleErrorSpy.mockRestore()
  })

  it('renders only top-level categories in main menu', async () => {
    render(<CategoryMenu />)

    await waitFor(() => {
      // Top-level categories should be visible
      expect(screen.getByText('Beverages')).toBeInTheDocument()
      expect(screen.getByText('Snacks')).toBeInTheDocument()
    })

    // Subcategories should not be visible initially (before hover)
    expect(screen.queryByText('Coffee')).not.toBeInTheDocument()
    expect(screen.queryByText('Tea')).not.toBeInTheDocument()
  })

  it('renders categories in correct sort order', async () => {
    render(<CategoryMenu />)

    await waitFor(() => {
      expect(mockSupabase.order).toHaveBeenCalledWith('sort_order', { ascending: true })
    })
  })

  it('filters only active categories', async () => {
    render(<CategoryMenu />)

    await waitFor(() => {
      expect(mockSupabase.eq).toHaveBeenCalledWith('is_active', true)
    })
  })

  it('handles empty categories list', async () => {
    mockSupabase.order.mockResolvedValue({
      data: [],
      error: null,
    })

    render(<CategoryMenu />)

    await waitFor(() => {
      // Should not crash, just show empty menu
      const nav = screen.getByRole('navigation')
      expect(nav).toBeInTheDocument()
    })
  })

  it('renders subcategory links with correct href', async () => {
    render(<CategoryMenu />)

    await waitFor(() => {
      expect(screen.getByText('Beverages')).toBeInTheDocument()
    })

    // Hover to show subcategories
    const beveragesItem = screen.getByText('Beverages').closest('li')
    if (beveragesItem) {
      fireEvent.mouseEnter(beveragesItem)
    }

    await waitFor(() => {
      const coffeeLink = screen.getByText('Coffee').closest('a')
      expect(coffeeLink).toHaveAttribute('href', '/categories/coffee')

      const teaLink = screen.getByText('Tea').closest('a')
      expect(teaLink).toHaveAttribute('href', '/categories/tea')
    })
  })

  it('shows dropdown indicator for categories with subcategories', async () => {
    render(<CategoryMenu />)

    await waitFor(() => {
      expect(screen.getByText('Beverages')).toBeInTheDocument()
    })

    // Beverages has subcategories, should show dropdown indicator (SVG)
    const beveragesItem = screen.getByText('Beverages').closest('a')
    const svg = beveragesItem?.querySelector('svg')
    expect(svg).toBeInTheDocument()

    // Snacks has no subcategories, should not show dropdown indicator
    const snacksItem = screen.getByText('Snacks').closest('a')
    const snacksSvg = snacksItem?.querySelector('svg')
    expect(snacksSvg).not.toBeInTheDocument()
  })

  it('handles categories with no subcategories', async () => {
    render(<CategoryMenu />)

    await waitFor(() => {
      expect(screen.getByText('Snacks')).toBeInTheDocument()
    })

    // Hover over Snacks (no subcategories)
    const snacksItem = screen.getByText('Snacks').closest('li')
    if (snacksItem) {
      fireEvent.mouseEnter(snacksItem)
    }

    // Should not show any subcategories
    expect(screen.queryByText('Coffee')).not.toBeInTheDocument()
    expect(screen.queryByText('Tea')).not.toBeInTheDocument()
  })
})

