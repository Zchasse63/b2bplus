import { NextResponse } from 'next/server'

/**
 * SECURITY NOTICE: This endpoint has been disabled for security reasons.
 *
 * Database migrations should ONLY be applied through:
 * 1. Supabase CLI: `supabase db push`
 * 2. Supabase Dashboard
 * 3. CI/CD pipelines with proper authentication
 *
 * Never expose migration execution through public API endpoints.
 */
export async function POST(request: Request) {
  return NextResponse.json(
    {
      error: 'This endpoint has been disabled for security reasons. Use Supabase CLI for migrations.'
    },
    { status: 403 }
  )
}

export async function GET(request: Request) {
  return NextResponse.json(
    {
      error: 'This endpoint has been disabled for security reasons. Use Supabase CLI for migrations.'
    },
    { status: 403 }
  )
}
