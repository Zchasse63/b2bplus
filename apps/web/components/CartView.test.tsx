import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import CartView from './CartView'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'

// Mock dependencies
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

const mockToast = jest.fn()
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(() => ({
    toast: mockToast,
  })),
}))

jest.mock('next/link', () => {
  const MockLink = ({ children, href }: any) => <a href={href}>{children}</a>
  MockLink.displayName = 'MockLink'
  return MockLink
})

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // Remove Next.js-specific props that aren't valid HTML attributes
    const { fill, priority, quality, ...imgProps } = props;
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...imgProps} />
  },
}))

// Always override global.fetch in these tests to ensure pricing calls resolve deterministically
const originalFetch = global.fetch;
beforeAll(() => {
  (global as any).fetch = jest.fn(async (url: any, opts?: any) => {
    const urlStr = typeof url === 'string' ? url : url?.href || '';
    try {
      if (urlStr.includes('/api/pricing/calculate')) {
        const body = opts && typeof opts.body === 'string' ? JSON.parse(opts.body) : opts?.body || {};
        // Single item pricing path
        if (body?.product_id) {
          const unitMap: Record<string, number> = { 'prod-1': 50, 'prod-2': 75 };
          const unit = unitMap[body.product_id] ?? 10;
          const qty = body.quantity ?? 1;
          return {
            ok: true,
            json: async () => ({
              success: true,
              pricing: {
                unit_price: unit,
                line_total: unit * qty,
                base_price: unit,
                discount_amount: 0,
                discount_percentage: 0,
                pricing_source: 'base',
              },
            }),
          } as any;
        }
        // Bulk items path (not used directly by CartView but kept for completeness)
        if (Array.isArray(body?.items)) {
          const results = body.items.map((it: any) => {
            const unit = Number(it.basePrice ?? 10);
            const qty = Number(it.quantity ?? 1);
            return {
              productId: it.productId,
              unit_price: unit,
              line_total: unit * qty,
              base_price: unit,
              discount_amount: 0,
              discount_percentage: 0,
              pricing_source: 'base',
            };
          });
          return {
            ok: true,
            json: async () => ({ success: true, pricing: results }),
          } as any;
        }
        // Default success response
        return {
          ok: true,
          json: async () => ({
            success: true,
            pricing: {
              unit_price: 0,
              line_total: 0,
              base_price: 0,
              discount_amount: 0,
              discount_percentage: 0,
              pricing_source: 'base',
            },
          }),
        } as any;
      }
    } catch (err) {
      return { ok: false, json: async () => ({ error: String(err) }) } as any;
    }
    return { ok: false, json: async () => ({}) } as any;
  });
});

afterAll(() => {
  (global as any).fetch = originalFetch;
});

// Provide a lightweight mock for global.fetch used by components (pricing API).
// This returns deterministic pricing data for the test products so CartView tests render correctly.
if (typeof global.fetch === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const jestMock = require('jest-mock');
  global.fetch = jestMock.fn(async (url: any, opts?: any) => {
    const urlStr = typeof url === 'string' ? url : url?.href || '';
    try {
      if (urlStr.includes('/api/pricing/calculate')) {
        // Parse request body if present
        const body = opts && typeof opts.body === 'string' ? JSON.parse(opts.body) : opts?.body || {};
        // If product_id provided (single-item pricing)
        if (body.product_id) {
          const pid = body.product_id;
          // Map known test products to pricing
          const priceMap: Record<string, any> = {
            'prod-1': {
              unit_price: 50,
              line_total: 50 * (body.quantity || 1),
              base_price: 50,
              discount_amount: 0,
              discount_percentage: 0,
              pricing_source: 'base',
            },
            'prod-2': {
              unit_price: 75,
              line_total: 75 * (body.quantity || 1),
              base_price: 75,
              discount_amount: 0,
              discount_percentage: 0,
              pricing_source: 'base',
            },
          };
          const pricing = priceMap[pid] || {
            unit_price: body.quantity ? 10 : 0,
            line_total: (body.quantity || 1) * (body.base_price || 10),
            base_price: body.base_price || 10,
            discount_amount: 0,
            discount_percentage: 0,
            pricing_source: 'base',
          };
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, pricing }),
          });
        }
        // If items array provided (bulk), compute simple totals per item
        if (Array.isArray(body.items)) {
          const results = body.items.map((it: any) => ({
            productId: it.productId,
            unit_price: it.basePrice,
            line_total: it.basePrice * (it.quantity || 1),
            base_price: it.basePrice,
            discount_amount: 0,
            discount_percentage: 0,
            pricing_source: 'base',
          }));
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, pricing: results }),
          });
        }
        // Default fallback
        return Promise.resolve({ ok: true, json: async () => ({ success: true, pricing: { unit_price: 0, line_total: 0, base_price: 0, discount_amount: 0, discount_percentage: 0, pricing_source: 'base' } }) });
      }
    } catch (err) {
      // On parse or other error, return non-ok so components fallback
      return Promise.resolve({ ok: false, json: async () => ({ error: String(err) }) });
    }
    // Default response for other URLs
    return Promise.resolve({ ok: false, json: async () => ({}) });
  });
}

const mockCartItems = [
  {
    id: 'cart-1',
    organization_id: 'org-123',
    user_id: 'user-123',
    product_id: 'prod-1',
    quantity: 2,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    products: {
      id: 'prod-1',
      organization_id: 'org-123',
      sku: 'SKU-001',
      name: 'Test Product 1',
      description: 'Description 1',
      category: 'Category 1',
      subcategory: null,
      brand: 'Brand 1',
      base_price: 50.0,
      unit_of_measure: 'case',
      units_per_case: 100,
      weight_lbs: 10,
      dimensions_inches: null,
      in_stock: true,
      image_url: 'https://example.com/image1.jpg',
      additional_images: null,
      specifications: null,
      allergens: null,
      nutritional_info: null,
      search_vector: null,
      embedding: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  },
  {
    id: 'cart-2',
    organization_id: 'org-123',
    user_id: 'user-123',
    product_id: 'prod-2',
    quantity: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    products: {
      id: 'prod-2',
      organization_id: 'org-123',
      sku: 'SKU-002',
      name: 'Test Product 2',
      description: 'Description 2',
      category: 'Category 2',
      subcategory: null,
      brand: 'Brand 2',
      base_price: 75.0,
      unit_of_measure: 'case',
      units_per_case: 50,
      weight_lbs: 15,
      dimensions_inches: null,
      in_stock: true,
      image_url: null,
      additional_images: null,
      specifications: null,
      allergens: null,
      nutritional_info: null,
      search_vector: null,
      embedding: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  },
]

describe('CartView', () => {
  let mockSupabase: any
  let mockRouter: any

  beforeEach(() => {
    mockSupabase = {
      auth: {
        // default mocked authenticated user for CartView tests; individual tests can override
        getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'user-123', email: 'test@example.com' } }, error: null })),
      },
      from: jest.fn(() => mockSupabase),
      update: jest.fn(() => mockSupabase),
      delete: jest.fn(() => mockSupabase),
      eq: jest.fn(() => Promise.resolve({ error: null })),
    }
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)

    mockRouter = {
      push: jest.fn(),
    }
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    mockToast.mockClear()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders empty cart message when no items', () => {
    render(<CartView initialCartItems={[]} />)

    expect(screen.getByText('Your cart is empty')).toBeInTheDocument()
    expect(screen.getByText('Add some products to get started')).toBeInTheDocument()
    expect(screen.getByText('Browse Products')).toBeInTheDocument()
  })

  it('renders cart items correctly', async () => {
    render(<CartView initialCartItems={mockCartItems} />)

    // Wait for pricing to load and items to render
    expect(await screen.findByText('Test Product 1')).toBeInTheDocument()
    expect(await screen.findByText('Test Product 2')).toBeInTheDocument()
    expect(await screen.findByText(/SKU: SKU-001/)).toBeInTheDocument()
    expect(await screen.findByText(/SKU: SKU-002/)).toBeInTheDocument()
  })

  it('calculates total correctly', async () => {
    render(<CartView initialCartItems={mockCartItems} />)

    // Product 1: $50 x 2 = $100
    // Product 2: $75 x 1 = $75
    // Total: $175
    expect(await screen.findByText('$175.00')).toBeInTheDocument()
  })

  it('displays individual line totals correctly', async () => {
    render(<CartView initialCartItems={mockCartItems} />)

    expect(await screen.findByText('$100.00')).toBeInTheDocument() // Product 1: $50 x 2
    expect(await screen.findByText('$75.00')).toBeInTheDocument() // Product 2: $75 x 1
  })

  it('increases quantity when + button clicked', async () => {
    mockSupabase.eq.mockResolvedValue({ error: null })

    render(<CartView initialCartItems={mockCartItems} />)
    const increaseButtons = await screen.findAllByText('+')

    fireEvent.click(increaseButtons[0])

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('cart_items')
      expect(mockSupabase.update).toHaveBeenCalledWith({ quantity: 3 })
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'cart-1')
    })
  })

  it('decreases quantity when - button clicked', async () => {
    mockSupabase.eq.mockResolvedValue({ error: null })

    render(<CartView initialCartItems={mockCartItems} />)
    const decreaseButtons = await screen.findAllByText('−')

    fireEvent.click(decreaseButtons[0])

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('cart_items')
      expect(mockSupabase.update).toHaveBeenCalledWith({ quantity: 1 })
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'cart-1')
    })
  })

  it('does not decrease quantity below 1', async () => {
    render(<CartView initialCartItems={mockCartItems} />)
    const decreaseButtons = await screen.findAllByText('−')

    // Try to decrease Product 2 (quantity = 1)
    fireEvent.click(decreaseButtons[1])

    await waitFor(() => {
      expect(mockSupabase.update).not.toHaveBeenCalled()
    })
  })

  it('removes item when Remove button clicked', async () => {
    mockSupabase.eq.mockResolvedValue({ error: null })

    render(<CartView initialCartItems={mockCartItems} />)
    const removeButtons = await screen.findAllByText('Remove')

    fireEvent.click(removeButtons[0])

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('cart_items')
      expect(mockSupabase.delete).toHaveBeenCalled()
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'cart-1')
    })

    // Item should be removed from UI
    await waitFor(() => {
      expect(screen.queryByText('Test Product 1')).not.toBeInTheDocument()
    })
  })

  it('shows alert on remove error', async () => {
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})
    mockSupabase.eq.mockResolvedValue({ error: { message: 'Delete failed' } })

    render(<CartView initialCartItems={mockCartItems} />)
    const removeButtons = await screen.findAllByText('Remove')

    fireEvent.click(removeButtons[0])

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Failed to remove item')
      alertSpy.mockRestore()
    })
  })

  it('shows alert on remove error', async () => {
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})
    mockSupabase.eq.mockResolvedValue({ error: { message: 'Delete failed' } })

    render(<CartView initialCartItems={mockCartItems} />)
    const removeButtons = await screen.findAllByText('Remove')

    fireEvent.click(removeButtons[0])

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Failed to remove item')
    })

    alertSpy.mockRestore()
  })

  it('navigates to checkout when Proceed to Checkout clicked', async () => {
    render(<CartView initialCartItems={mockCartItems} />)
    const checkoutButton = await screen.findByText('Proceed to Checkout')

    fireEvent.click(checkoutButton)

    expect(mockRouter.push).toHaveBeenCalledWith('/checkout')
  })

  it('disables buttons while loading', async () => {
    let resolveUpdate: any
    mockSupabase.eq.mockImplementation(
      () => new Promise((resolve) => { resolveUpdate = resolve })
    )

    render(<CartView initialCartItems={mockCartItems} />)
    const increaseButtons = screen.getAllByText('+')

    // Click the button to start loading
    fireEvent.click(increaseButtons[0])

    // Button should be disabled while loading
    await waitFor(() => {
      expect(increaseButtons[0]).toBeDisabled()
    })

    // Resolve the promise to finish loading
    resolveUpdate({ error: null })

    // Button should be enabled again after loading
    await waitFor(() => {
      expect(increaseButtons[0]).not.toBeDisabled()
    })
  })
})
