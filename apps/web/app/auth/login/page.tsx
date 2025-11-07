'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, Input } from '@/components/b2b';
import { FiLogIn } from 'react-icons/fi';
import { loginSchema } from '@/lib/validation/schemas';
import { toast } from '@/hooks/use-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const validateForm = () => {
    // Validate with Zod
    const validation = loginSchema.safeParse({ email, password });

    if (!validation.success) {
      // Extract field-specific errors
      const fieldErrors = validation.error.flatten().fieldErrors;
      const newErrors: { email?: string; password?: string } = {};

      if (fieldErrors.email) {
        newErrors.email = fieldErrors.email[0];
      }
      if (fieldErrors.password) {
        newErrors.password = fieldErrors.password[0];
      }

      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!validateForm()) return;

    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      if (data.success) {
        router.push('/');
        router.refresh();
      }
    } catch (error) {
      setErrorMessage('An unexpected error occurred');
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setErrors({});
    setErrorMessage('');

    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: demoEmail, password: demoPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      if (data.success) {
        router.push('/');
        router.refresh();
      }
    } catch (error) {
      setErrorMessage('An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-b2b-gray-50 px-4 py-12">
      <div className="w-full max-w-md animate-slide-up">
        {/* Logo/Brand */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-b2b-dark">B2B+</h1>
          <p className="mt-2 text-lg text-b2b-gray-500">Welcome back</p>
        </div>

        {/* Login Card */}
        <Card padding="lg">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-b2b-dark">
              Sign In
            </h2>
            <p className="mt-1 text-sm text-b2b-gray-500">
              Enter your credentials to access your account
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {errorMessage && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600" role="alert" aria-live="polite">
                {errorMessage}
              </div>
            )}

            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors({ ...errors, email: undefined });
              }}
              error={errors.email}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors({ ...errors, password: undefined });
              }}
              error={errors.password}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-b2b-gray-300 text-b2b-yellow focus:ring-b2b-yellow"
                />
                <span className="text-b2b-gray-500">Remember me</span>
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-b2b-dark hover:text-b2b-yellow transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={loading}
              icon={<FiLogIn aria-hidden="true" />}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-b2b-gray-100"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-b2b-gray-500">
                  Or continue with
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => handleDemoLogin('customer@demo.com', 'demo123')}
                disabled={loading}
              >
                Demo Customer
              </Button>
              <Button
                variant="outline"
                onClick={() => handleDemoLogin('admin@demo.com', 'admin123')}
                disabled={loading}
              >
                Demo Admin
              </Button>
            </div>
          </div>

          <div className="mt-6 text-center text-sm text-b2b-gray-500">
            Don&apos;t have an account?{' '}
            <Link
              href="/auth/register"
              className="font-medium text-b2b-dark hover:text-b2b-yellow transition-colors"
            >
              Sign up
            </Link>
          </div>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-b2b-gray-500">
          <p>&copy; 2025 B2B+. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
