/**
 * Server-only Supabase admin client
 * 
 * SECURITY: This module uses the SUPABASE_SERVICE_ROLE_KEY and should ONLY be imported
 * in server-side code (API routes, server components, server actions).
 * 
 * NEVER import this in client-side code or components marked with 'use client'.
 * The service-role key must never be exposed to the browser.
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@b2b-plus/supabase'

let adminClient: ReturnType<typeof createClient<Database>> | null = null

/**
 * Create or return a cached Supabase admin client
 * 
 * This client uses the SUPABASE_SERVICE_ROLE_KEY and bypasses RLS.
 * Use this ONLY for privileged operations like:
 * - auth.admin.generateLink() for magic links
 * - auth.admin.createUser() for user creation
 * - Other admin-only operations
 * 
 * @returns Supabase admin client
 * @throws Error if SUPABASE_SERVICE_ROLE_KEY is not set
 */
export function createAdminClient() {
  // Validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is not set')
  }

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set')
  }

  // Return cached client if available
  if (adminClient) {
    return adminClient
  }

  // Create new admin client
  adminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  return adminClient
}

/**
 * Get the cached admin client or create a new one
 * Alias for createAdminClient() for convenience
 */
export function getAdminClient() {
  return createAdminClient()
}

/**
 * Reset the admin client (useful for testing)
 */
export function resetAdminClient() {
  adminClient = null
}

