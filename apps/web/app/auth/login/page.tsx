'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, Input } from '@/components/b2b';
import { FiLogIn } from 'react-icons/fi';
import { slideUp, smooth } from '@/lib/animations';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!validateForm()) return;

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // Check user role to determine redirect
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      const role = profile?.role || 'customer';
      const isAdmin = role === 'admin' || role === 'super_admin';

      // Redirect based on role
      router.push(isAdmin ? '/admin' : '/chat');
      router.refresh();
    }
  };

  const handleDemoLogin = async (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setErrors({});
    setErrorMessage('');

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: demoEmail,
      password: demoPassword,
    });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // Check user role to determine redirect
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      const role = profile?.role || 'customer';
      const isAdmin = role === 'admin' || role === 'super_admin';

      // Redirect based on role
      router.push(isAdmin ? '/admin' : '/chat');
      router.refresh();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-b2b-gray-50 px-4 py-12">
      <motion.div
        className="w-full max-w-md"
        variants={slideUp}
        initial="hidden"
        animate="visible"
        transition={smooth}
      >
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

          <form onSubmit={handleLogin} noValidate className="space-y-5">
            {errorMessage && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
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
              data-testid="email-input"
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
              data-testid="password-input"
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
              icon={<FiLogIn />}
              data-testid="login-button"
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
                onClick={() => handleDemoLogin('customer@demo.com', 'customer123')}
                disabled={loading}
                data-testid="demo-customer-button"
              >
                Demo Customer
              </Button>
              <Button
                variant="outline"
                onClick={() => handleDemoLogin('admin@demo.com', 'admin123')}
                disabled={loading}
                data-testid="demo-admin-button"
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
      </motion.div>
    </div>
  );
}
