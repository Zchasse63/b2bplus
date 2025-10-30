'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DemoCredentials from '@/components/auth/DemoCredentials'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<{
    email?: string
    password?: string
  }>({})
  const router = useRouter()
  const supabase = createClient()

  const validateForm = () => {
    const errors: { email?: string; password?: string } = {}

    if (!email) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Invalid email address'
    }

    if (!password) {
      errors.password = 'Password is required'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleFillCredentials = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail)
    setPassword(demoPassword)
    setValidationErrors({})
    setError(null)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateForm()) {
      return
    }

    setLoading(true)

    console.log('Attempting login with:', email)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      console.log('Login response:', { data: !!data, error: error?.message })

      if (error) {
        console.error('Login error:', error)
        setError(error.message)
        setLoading(false)
      } else {
        console.log('Login successful, navigating to /products')
        router.push('/products')
        router.refresh()
      }
    } catch (err) {
      console.error('Unexpected login error:', err)
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-8 shadow">
        <div>
          <h2 className="text-center text-3xl font-bold">Sign in to B2B+</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Food service disposables ordering platform
          </p>
        </div>

        {/* Demo Credentials - Only show in development */}
        {process.env.NODE_ENV === 'development' && (
          <DemoCredentials onFillCredentials={handleFillCredentials} />
        )}

        {error && (
          <div className="rounded bg-red-50 p-4 text-sm text-red-600" role="alert" aria-live="polite">
            {error}
          </div>
        )}
        <form onSubmit={handleLogin} className="space-y-6" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email <span className="text-red-600" aria-label="required">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              data-testid="login-email"
              required
              aria-required="true"
              aria-invalid={!!validationErrors.email}
              aria-describedby={validationErrors.email ? 'email-error' : undefined}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (validationErrors.email) {
                  setValidationErrors({ ...validationErrors, email: undefined })
                }
              }}
              className={`mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                validationErrors.email
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`}
            />
            {validationErrors.email && (
              <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">
                {validationErrors.email}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password <span className="text-red-600" aria-label="required">*</span>
            </label>
            <input
              id="password"
              name="password"
              type="password"
              data-testid="login-password"
              required
              aria-required="true"
              aria-invalid={!!validationErrors.password}
              aria-describedby={validationErrors.password ? 'password-error' : undefined}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (validationErrors.password) {
                  setValidationErrors({ ...validationErrors, password: undefined })
                }
              }}
              className={`mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                validationErrors.password
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`}
            />
            {validationErrors.password && (
              <p id="password-error" className="mt-1 text-sm text-red-600" role="alert">
                {validationErrors.password}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link href="/auth/register" className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}

