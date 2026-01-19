import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { rateLimit } from '@/lib/middleware/rate-limit'
import { handleError, ValidationError, NotFoundError, DatabaseError } from '@/lib/middleware/error-handler'

/**
 * SECURITY WARNING: This endpoint is for local development only.
 * In production and shared environments, all schema changes must go through
 * Supabase CLI migrations (supabase db push / supabase db reset).
 *
 * This endpoint is disabled in non-development environments to prevent
 * unauthorized SQL execution via the service-role key.
 */
export async function POST(request: NextRequest) {
  // CRITICAL: Disable this endpoint in production and non-dev environments
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Not found' },
      { status: 404 }
    )
  }

  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'sensitive')
    if (!allowed) return rateLimitResponse!
    const { migrationName } = await request.json()

    if (!migrationName) {
      throw new ValidationError('Migration name required', {
        migrationName: ['Migration name is required'],
      })
    }

    // Read migration file
    const migrationPath = path.join(process.cwd(), '../../supabase/migrations', migrationName)

    if (!fs.existsSync(migrationPath)) {
      throw new NotFoundError('Migration file', migrationName)
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

    // Create Supabase client with service role key (bypasses RLS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseServiceKey) {
      throw new ValidationError('SUPABASE_SERVICE_ROLE_KEY not set. Cannot apply migrations without service role key.', {
        configuration: ['SUPABASE_SERVICE_ROLE_KEY environment variable is required'],
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Execute migration SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL })

    if (error) {
      throw DatabaseError.queryFailed('migrations', 'execute')
    }

    return NextResponse.json({
      success: true,
      message: `Migration ${migrationName} applied successfully`,
      data
    })

  } catch (error) {
    return handleError(error)
  }
}
