'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, Input } from '@/components/b2b';
import { FiMail } from 'react-icons/fi';
import { slideUp, smooth } from '@/lib/animations';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const validateForm = () => {
    if (!email) {
      setError('Email is required');
      return false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Invalid email address');
      return false;
    }
    setError('');
    return true;
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError('');
    setSuccessMessage('');

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
    } else {
      setSuccessMessage('Password reset email sent! Check your inbox.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-b2b-blue/5 via-white to-b2b-yellow/5 px-4 py-12">
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
          <p className="mt-2 text-lg text-b2b-gray-500">Reset your password</p>
        </div>

        {/* Reset Password Card */}
        <Card padding="lg">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-b2b-dark">
              Forgot Password
            </h2>
            <p className="mt-1 text-sm text-b2b-gray-500">
              Enter your email address and we&apos;ll send you a password reset link
            </p>
          </div>

          <form onSubmit={handleResetPassword} noValidate className="space-y-5">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="rounded-lg bg-green-50 p-3 text-sm text-green-600">
                {successMessage}
              </div>
            )}

            <Input
              label="Email Address"
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              data-testid="email-input"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              icon={<FiMail />}
              iconPosition="left"
            >
              Send Reset Link
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <Link
              href="/auth/login"
              className="font-medium text-b2b-blue hover:text-b2b-blue/80"
            >
              Back to Sign In
            </Link>
          </div>
        </Card>

        <p className="mt-8 text-center text-sm text-b2b-gray-500">
          © 2025 B2B+. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}

