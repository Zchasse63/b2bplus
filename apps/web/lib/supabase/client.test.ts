import { createClient } from './client'

// Mock the Supabase client
jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn((url, key) => ({
    url,
    key,
    auth: {
      getUser: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(),
    rpc: jest.fn(),
  })),
}))

describe('Supabase Client (Web)', () => {
  it('creates a browser client with correct configuration', () => {
    const client = createClient()

    expect(client).toBeDefined()
    expect(client).toHaveProperty('auth')
    expect(client).toHaveProperty('from')
    expect(client).toHaveProperty('rpc')
  })

  it('has auth methods available', () => {
    const client = createClient()

    expect(client.auth).toBeDefined()
    expect(client.auth.getUser).toBeDefined()
    expect(client.auth.signInWithPassword).toBeDefined()
    expect(client.auth.signUp).toBeDefined()
    expect(client.auth.signOut).toBeDefined()
  })

  it('has database query methods available', () => {
    const client = createClient()

    expect(client.from).toBeDefined()
    expect(typeof client.from).toBe('function')
  })
})

