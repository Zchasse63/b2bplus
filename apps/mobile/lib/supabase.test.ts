import { supabase } from './supabase'

// Mock dependencies
jest.mock('react-native-url-polyfill/auto', () => ({}))
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}))
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}))

describe('Supabase Client (Mobile)', () => {
  it('creates a Supabase client instance', () => {
    expect(supabase).toBeDefined()
  })

  it('has auth methods available', () => {
    expect(supabase.auth).toBeDefined()
    expect(supabase.auth.getSession).toBeDefined()
    expect(supabase.auth.signInWithPassword).toBeDefined()
    expect(supabase.auth.signUp).toBeDefined()
    expect(supabase.auth.signOut).toBeDefined()
  })

  it('has database query methods available', () => {
    expect(supabase.from).toBeDefined()
    expect(typeof supabase.from).toBe('function')
  })

  it('is configured with correct URL', () => {
    // The client should be configured with the Supabase URL
    expect(supabase).toHaveProperty('supabaseUrl')
  })
})

