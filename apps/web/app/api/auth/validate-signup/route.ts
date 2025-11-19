/**
 * User Signup Validation
 * 
 * POST /api/auth/validate-signup
 * Validates signup data before creating account
 */

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

interface SignupValidationRequest {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
}

interface ValidationError {
  field: string;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SignupValidationRequest = await request.json();
    const { email, password, confirmPassword, fullName } = body;

    const errors: ValidationError[] = [];

    // Validate email
    if (!email) {
      errors.push({ field: 'email', message: 'Email is required' });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ field: 'email', message: 'Invalid email format' });
    }

    // Validate password
    if (!password) {
      errors.push({ field: 'password', message: 'Password is required' });
    } else if (password.length < 8) {
      errors.push({ field: 'password', message: 'Password must be at least 8 characters' });
    } else if (!/[A-Z]/.test(password)) {
      errors.push({ field: 'password', message: 'Password must contain at least one uppercase letter' });
    } else if (!/[0-9]/.test(password)) {
      errors.push({ field: 'password', message: 'Password must contain at least one number' });
    } else if (!/[!@#$%^&*]/.test(password)) {
      errors.push({ field: 'password', message: 'Password must contain at least one special character (!@#$%^&*)' });
    }

    // Validate password confirmation
    if (!confirmPassword) {
      errors.push({ field: 'confirmPassword', message: 'Password confirmation is required' });
    } else if (password !== confirmPassword) {
      errors.push({ field: 'confirmPassword', message: 'Passwords do not match' });
    }

    // Validate full name
    if (!fullName) {
      errors.push({ field: 'fullName', message: 'Full name is required' });
    } else if (fullName.trim().length < 2) {
      errors.push({ field: 'fullName', message: 'Full name must be at least 2 characters' });
    }

    // If validation errors exist, return them
    if (errors.length > 0) {
      return NextResponse.json(
        { valid: false, errors },
        { status: 400 }
      );
    }

    // Check if email already exists
    const adminClient = createAdminClient();
    const { data: { users }, error: usersError } = await adminClient.auth.admin.listUsers();

    if (usersError) {
      return NextResponse.json(
        { error: 'Failed to validate email' },
        { status: 500 }
      );
    }

    const emailExists = users?.some(u => u.email?.toLowerCase() === email.toLowerCase());

    if (emailExists) {
      return NextResponse.json(
        { valid: false, errors: [{ field: 'email', message: 'Email already registered' }] },
        { status: 400 }
      );
    }

    // All validations passed
    return NextResponse.json({
      valid: true,
      message: 'Signup data is valid',
    });

  } catch (error: any) {
    console.error('Signup validation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

