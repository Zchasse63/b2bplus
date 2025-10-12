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
  })),
}))

describe('Supabase Client (Web)', () => {
  it('creates a browser client with correct configuration', () => {
    const client = createClient()

    expect(client).toBeDefined()
    expect(client.url).toBe(process.env.NEXT_PUBLIC_SUPABASE_URL)
    expect(client.key).toBe(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
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

