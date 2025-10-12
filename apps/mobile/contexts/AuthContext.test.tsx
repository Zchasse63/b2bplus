import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react-native'
import { AuthProvider, useAuth } from './AuthContext'
import { supabase } from '@/lib/supabase'

// Mock the supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    },
  },
}))

describe('AuthContext', () => {
  let mockUnsubscribe: jest.Mock

  beforeEach(() => {
    mockUnsubscribe = jest.fn()
    ;(supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  )

  it('initializes with loading state', async () => {
    ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.loading).toBe(true)
    expect(result.current.session).toBe(null)
    expect(result.current.user).toBe(null)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
  })

  it('loads existing session on mount', async () => {
    const mockSession = {
      user: { id: 'user-123', email: 'test@example.com' },
      access_token: 'token',
    }

    ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: mockSession },
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.session).toEqual(mockSession)
      expect(result.current.user).toEqual(mockSession.user)
    })
  })

  it('signs in user successfully', async () => {
    ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
    })
    ;(supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: {
        user: { id: 'user-123', email: 'test@example.com' },
        session: { access_token: 'token' },
      },
      error: null,
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    let signInResult: any
    await act(async () => {
      signInResult = await result.current.signIn('test@example.com', 'password123')
    })

    expect(signInResult.error).toBe(null)
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    })
  })

  it('returns error on failed sign in', async () => {
    ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
    })
    ;(supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid credentials' },
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    let signInResult: any
    await act(async () => {
      signInResult = await result.current.signIn('test@example.com', 'wrongpassword')
    })

    expect(signInResult.error).toEqual({ message: 'Invalid credentials' })
  })

  it('signs up user successfully', async () => {
    ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
    })
    ;(supabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: {
        user: { id: 'user-123', email: 'newuser@example.com' },
        session: { access_token: 'token' },
      },
      error: null,
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    let signUpResult: any
    await act(async () => {
      signUpResult = await result.current.signUp(
        'newuser@example.com',
        'password123',
        'New User'
      )
    })

    expect(signUpResult.error).toBe(null)
    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'newuser@example.com',
      password: 'password123',
      options: {
        data: {
          full_name: 'New User',
        },
      },
    })
  })

  it('signs out user successfully', async () => {
    const mockSession = {
      user: { id: 'user-123', email: 'test@example.com' },
      access_token: 'token',
    }

    ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: mockSession },
    })
    ;(supabase.auth.signOut as jest.Mock).mockResolvedValue({
      error: null,
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.user).toEqual(mockSession.user)
    })

    await act(async () => {
      await result.current.signOut()
    })

    expect(supabase.auth.signOut).toHaveBeenCalled()
  })

  it('updates state on auth state change', async () => {
    let authStateCallback: any

    ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
    })
    ;(supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
      authStateCallback = callback
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } }
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const newSession = {
      user: { id: 'user-456', email: 'updated@example.com' },
      access_token: 'new-token',
    }

    act(() => {
      authStateCallback('SIGNED_IN', newSession)
    })

    await waitFor(() => {
      expect(result.current.session).toEqual(newSession)
      expect(result.current.user).toEqual(newSession.user)
    })
  })

  it('unsubscribes from auth changes on unmount', async () => {
    ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
    })

    const { unmount } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(supabase.auth.onAuthStateChange).toHaveBeenCalled()
    })

    unmount()

    expect(mockUnsubscribe).toHaveBeenCalled()
  })

  it('throws error when useAuth is used outside AuthProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      renderHook(() => useAuth())
    }).toThrow('useAuth must be used within an AuthProvider')

    consoleSpy.mockRestore()
  })
})

