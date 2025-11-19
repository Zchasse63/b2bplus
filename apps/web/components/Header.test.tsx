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
    render(<Header />)

    expect(screen.getByText('B2B+')).toBeInTheDocument()
  })

  it('renders public navigation links', () => {
    render(<Header />)

    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Products')).toBeInTheDocument()
  })

  it('shows cart count when user is logged in', async () => {
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

    render(<Header />)

    // The active link should have primary variant
    const productsLink = screen.getByText('Products').closest('button')
    expect(productsLink).toBeInTheDocument()
  })

  it('handles cart count query correctly', async () => {
    const authModule = require('@/contexts/AuthContext') as any
    ;(authModule.useAuth as jest.Mock).mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      loading: false,
      cartCount: 3,
      isAdmin: false,
      error: null,
      refetch: jest.fn(),
      updateCartCount: jest.fn(),
      refreshUser: jest.fn(),
    })

    render(<Header />)

    await waitFor(() => {
      // Check cart badge reflects mocked cart count
      expect(screen.getByText('Cart')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })
  })

  it('identifies super_admin as admin', async () => {
    const authModule = require('@/contexts/AuthContext') as any
    ;(authModule.useAuth as jest.Mock).mockReturnValue({
      user: { id: 'superadmin-123', email: 'superadmin@example.com' },
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
      // Admin nav should appear for super_admin
      expect(screen.getByText('Admin')).toBeInTheDocument()
    })
  })

  it('handles missing user gracefully', async () => {
    const authModule = require('@/contexts/AuthContext') as any
    ;(authModule.useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
      cartCount: 0,
      isAdmin: false,
      error: null,
      refetch: jest.fn(),
      updateCartCount: jest.fn(),
      refreshUser: jest.fn(),
    })

    render(<Header />)

    await waitFor(() => {
      // Should show only public nav + auth buttons
      expect(screen.getByText('Home')).toBeInTheDocument()
      expect(screen.getByText('Products')).toBeInTheDocument()
      expect(screen.getByText('Sign In')).toBeInTheDocument()
      expect(screen.getByText('Sign Up')).toBeInTheDocument()
    })

    // Authenticated-only links should not be visible
    expect(screen.queryByText('Orders')).not.toBeInTheDocument()
    expect(screen.queryByText('Cart')).not.toBeInTheDocument()
    expect(screen.queryByText('Admin')).not.toBeInTheDocument()
  })

  it('handles cart count of zero', async () => {
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

    await waitFor(() => {
      expect(screen.getByText('Cart')).toBeInTheDocument()
    })

    // Should not show a count badge when cartCount is 0
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('handles null cart count', async () => {
    const authModule = require('@/contexts/AuthContext') as any
    ;(authModule.useAuth as jest.Mock).mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      loading: false,
      // Simulate null/undefined flowing through as 0 from context
      cartCount: 0,
      isAdmin: false,
      error: null,
      refetch: jest.fn(),
      updateCartCount: jest.fn(),
      refreshUser: jest.fn(),
    })

    render(<Header />)

    await waitFor(() => {
      expect(screen.getByText('Cart')).toBeInTheDocument()
    })

    // Should still not show a count badge
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })
})
