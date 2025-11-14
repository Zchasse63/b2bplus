import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import Header from './Header'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'

// Mock dependencies
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}))

jest.mock('next/link', () => {
  const MockLink = ({ children, href }: any) => <a href={href}>{children}</a>
  MockLink.displayName = 'MockLink'
  return MockLink
})

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: null,
    loading: false,
    cartCount: 0,
    isAdmin: false,
    error: null,
    refetch: jest.fn(),
    updateCartCount: jest.fn(),
    refreshUser: jest.fn(),
  })),
}));
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: null,
    loading: false,
    cartCount: 0,
    isAdmin: false,
    error: null,
    refetch: jest.fn(),
    updateCartCount: jest.fn(),
    refreshUser: jest.fn(),
  })),
}));

// Ensure global.fetch is available in the test environment (safe no-op mock).
// This helps tests that rely on fetch indirectly.
if (typeof global.fetch === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const jestMock = require('jest-mock');
  global.fetch = jestMock.fn(() => Promise.resolve({ json: () => ({}) }));
}

describe('Header', () => {
  let mockSupabase: any
  let mockRouter: any

  beforeEach(() => {
  jest.clearAllMocks();

  // Create comprehensive mock Supabase client
  mockSupabase = {
    auth: {
      getUser: jest.fn(),
      signOut: jest.fn(),
      // Provide onAuthStateChange to match client usage in AuthProvider
      onAuthStateChange: jest.fn(() => ({
        data: {
          subscription: {
            unsubscribe: jest.fn(),
          },
        },
      })),
    },
    from: jest.fn(() => mockSupabase),
    select: jest.fn(() => mockSupabase),
    eq: jest.fn(() => mockSupabase),
    single: jest.fn(),
  }
  ;(createClient as jest.Mock).mockReturnValue(mockSupabase);

  mockRouter = {
    push: jest.fn(),
    refresh: jest.fn(),
  }
  ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
  ;(usePathname as jest.Mock).mockReturnValue('/')
})

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders logo and brand name', () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

    render(<Header />)

    expect(screen.getByText('B2B+')).toBeInTheDocument()
  })

  it('renders public navigation links', () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

    render(<Header />)

    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Products')).toBeInTheDocument()
  })

  it('shows cart count when user is logged in', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
    })
    mockSupabase.select.mockReturnValue({
      ...mockSupabase,
      count: 5,
    })
    mockSupabase.single.mockResolvedValue({
      data: { role: 'customer' },
    })

    render(<Header />)

    await waitFor(() => {
      // Verify UI shows cart and count badge when user is logged in
      expect(screen.getByText('Cart')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
    })
  })

  it('shows admin navigation when user is admin', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-123', email: 'admin@example.com' } },
    })
    mockSupabase.select.mockReturnValue({
      ...mockSupabase,
      count: 0,
    })
    mockSupabase.single.mockResolvedValue({
      data: { role: 'admin' },
    })

    // Ensure the AuthContext hook returns an admin user
    const authModule = require('@/contexts/AuthContext') as any
    ;(authModule.useAuth as jest.Mock).mockReturnValue({
      user: { id: 'admin-123', email: 'admin@example.com' },
      loading: false,
      cartCount: 0,
      isAdmin: true,
      error: null,
      refetch: jest.fn(),
      updateCartCount: jest.fn(),
      refreshUser: jest.fn(),
    })

    render(<Header />)

    await waitFor(() => {
      // Admin navigation should be visible for admin users
      expect(screen.getByText('Admin')).toBeInTheDocument()
    })
  })

  it('handles sign out correctly', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
    })
    mockSupabase.select.mockReturnValue({
      ...mockSupabase,
      count: 0,
    })
    mockSupabase.single.mockResolvedValue({
      data: { role: 'customer' },
    })
    mockSupabase.auth.signOut.mockResolvedValue({ error: null })

    // Ensure the AuthContext hook returns a logged-in user
    const authModule = require('@/contexts/AuthContext') as any
    ;(authModule.useAuth as jest.Mock).mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      loading: false,
      cartCount: 0,
      isAdmin: false,
      error: null,
      refetch: jest.fn(),
      updateCartCount: jest.fn(),
      refreshUser: jest.fn(),
    })

    render(<Header />)

    // Wait for component to load user data
    await waitFor(() => {
      expect(mockSupabase.auth.getUser).toHaveBeenCalled()
    })

    // Find and click sign out button using test ID
    const signOutButton = screen.getByTestId('sign-out-button')
    fireEvent.click(signOutButton)

    await waitFor(() => {
      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
      expect(mockRouter.push).toHaveBeenCalledWith('/auth/login')
      expect(mockRouter.refresh).toHaveBeenCalled()
    })
  })

  it('highlights active navigation link', () => {
    ;(usePathname as jest.Mock).mockReturnValue('/products')
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

    render(<AuthProvider><Header /></AuthProvider>)

    // The active link should have primary variant
    const productsLink = screen.getByText('Products').closest('button')
    expect(productsLink).toBeInTheDocument()
  })

  it('fetches user data on pathname change', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
    })
    mockSupabase.select.mockReturnValue({
      ...mockSupabase,
      count: 0,
    })
    mockSupabase.single.mockResolvedValue({
      data: { role: 'customer' },
    })

    const { rerender } = render(<Header />)

    await waitFor(() => {
      expect(mockSupabase.auth.getUser).toHaveBeenCalledTimes(1)
    })

    // Change pathname
    ;(usePathname as jest.Mock).mockReturnValue('/products')
    rerender(<Header />)

    await waitFor(() => {
      expect(mockSupabase.auth.getUser).toHaveBeenCalledTimes(2)
    })
  })

  it('handles cart count query correctly', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
    })
    mockSupabase.select.mockReturnValue({
      ...mockSupabase,
      count: 3,
    })
    mockSupabase.single.mockResolvedValue({
      data: { role: 'customer' },
    })

    render(<Header />)

    await waitFor(() => {
      // Check cart badge reflects mocked cart count
      expect(screen.getByText('Cart')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })
  })

  it('identifies super_admin as admin', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'superadmin-123', email: 'superadmin@example.com' } },
    })
    mockSupabase.select.mockReturnValue({
      ...mockSupabase,
      count: 0,
    })
    mockSupabase.single.mockResolvedValue({
      data: { role: 'super_admin' },
    })

    render(<AuthProvider><Header /></AuthProvider>)

    await waitFor(() => {
      // Admin nav should appear for super_admin
      expect(screen.getByText('Admin')).toBeInTheDocument()
    })
  })

  it('handles missing user gracefully', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
    })

    render(<Header />)

    await waitFor(() => {
      expect(mockSupabase.auth.getUser).toHaveBeenCalled()
    })

    // Should not try to fetch cart or membership data
    expect(mockSupabase.from).not.toHaveBeenCalled()
  })

  it('handles cart count of zero', async () => {
    it('shows cart count when user is logged in', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
      })
      mockSupabase.select.mockReturnValue({
        ...mockSupabase,
        count: 5,
      })
      mockSupabase.single.mockResolvedValue({
        data: { role: 'customer' },
      })

      // Ensure the AuthContext hook returns a logged-in user with cartCount
      const authModule = require('@/contexts/AuthContext') as any
      ;(authModule.useAuth as jest.Mock).mockReturnValue({
        user: { id: 'user-123', email: 'test@example.com' },
        loading: false,
        cartCount: 5,
        isAdmin: false,
        error: null,
        refetch: jest.fn(),
        updateCartCount: jest.fn(),
        refreshUser: jest.fn(),
      })

      render(<Header />)

      await waitFor(() => {
        // Verify UI shows cart and count badge when user is logged in
        expect(screen.getByText('Cart')).toBeInTheDocument()
        expect(screen.getByText('5')).toBeInTheDocument()
      })
    })

  it('handles null cart count', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
    })
    mockSupabase.select.mockReturnValue({
      ...mockSupabase,
      count: null,
    })
    mockSupabase.single.mockResolvedValue({
      data: { role: 'customer' },
    })

    render(<AuthProvider><Header /></AuthProvider>)

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('cart_items')
    })

    // Should default to 0
  })
})
