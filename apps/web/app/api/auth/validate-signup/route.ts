/**
 * User Signup Validation
 *
 * POST /api/auth/validate-signup
 * Validates signup data before creating account
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { validateRequestBody } from '@/lib/middleware/validation';
import { SignupValidationSchema } from '@/lib/validation/schemas';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { handleError } from '@/lib/middleware/error-handler';
import { ValidationError, DatabaseError, ConflictError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting (sensitive - prevents enumeration attacks)
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'sensitive');
    if (!allowed) return rateLimitResponse!;

    // Validate request body with centralized schema
    const validation = await validateRequestBody(request, SignupValidationSchema);
    if (!validation.valid) {
      return validation.response!;
    }

    const { email } = validation.data!;

    // Check if email already exists
    const adminClient = createAdminClient();
    const { data: { users }, error: usersError } = await adminClient.auth.admin.listUsers();

    if (usersError) {
      throw new DatabaseError('Failed to validate email', 'listUsers', 'auth.users');
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

  } catch (error) {
    return handleError(error);
  }
}
