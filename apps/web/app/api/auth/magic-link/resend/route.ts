import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { validateRequestBody } from '@/lib/middleware/validation';
import { MagicLinkResendSchema } from '@/lib/validation/schemas';
import { handleError } from '@/lib/middleware/error-handler';
import { ExternalServiceError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting for sensitive operations
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'sensitive');
    if (!allowed) return rateLimitResponse!;

    // Validate request body
    const validation = await validateRequestBody(request, MagicLinkResendSchema);
    if (!validation.valid) return validation.response!;

    const { email } = validation.data!;

    // Simply call the request endpoint again
    const requestUrl = new URL('/api/auth/magic-link/request', request.url);

    const response = await fetch(requestUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      message: 'Magic link resent successfully',
    });

  } catch (error) {
    return handleError(error);
  }
}
