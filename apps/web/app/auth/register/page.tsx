'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, Input } from '@/components/b2b';
import { FiUserPlus } from 'react-icons/fi';
import { slideUp, smooth } from '@/lib/animations';

export default function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!validateForm()) return;

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: formData.fullName,
        },
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      setSuccessMessage('Account created successfully! Redirecting...');
      setTimeout(() => {
        router.push('/chat');
        router.refresh();
      }, 2000);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    const newErrors = { ...errors };
    delete newErrors[field];
    setErrors(newErrors);
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
          <p className="mt-2 text-lg text-b2b-gray-500">Create your account</p>
        </div>

        {/* Register Card */}
        <Card padding="lg">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-b2b-dark">
              Sign Up
            </h2>
            <p className="mt-1 text-sm text-b2b-gray-500">
              Get started with your B2B+ account
            </p>
          </div>

          <form onSubmit={handleRegister} noValidate className="space-y-5">
            {errorMessage && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="rounded-lg bg-green-50 p-3 text-sm text-green-600">
                {successMessage}
              </div>
            )}

            <Input
              label="Full Name"
              type="text"
              value={formData.fullName}
              onChange={(e) => updateField('fullName', e.target.value)}
              error={errors.fullName}
              placeholder="John Doe"
              required
              data-testid="register-fullName"
            />

            <Input
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              error={errors.email}
              placeholder="you@company.com"
              required
              data-testid="register-email"
            />

            <Input
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => updateField('password', e.target.value)}
              error={errors.password}
              placeholder="••••••••"
              required
              data-testid="register-password"
            />

            <Input
              label="Confirm Password"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => updateField('confirmPassword', e.target.value)}
              error={errors.confirmPassword}
              placeholder="••••••••"
              required
              data-testid="register-confirmPassword"
            />

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                required
                className="mt-1 h-4 w-4 rounded border-b2b-gray-300 text-b2b-yellow focus:ring-b2b-yellow"
              />
              <label className="text-sm text-b2b-gray-500">
                I agree to the{' '}
                <Link href="/terms" className="text-b2b-dark hover:text-b2b-yellow transition-colors">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-b2b-dark hover:text-b2b-yellow transition-colors">
                  Privacy Policy
                </Link>
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={loading}
              icon={<FiUserPlus />}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-b2b-gray-500">
            Already have an account?{' '}
            <Link
              href="/auth/login"
              className="font-medium text-b2b-dark hover:text-b2b-yellow transition-colors"
            >
              Sign in
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
