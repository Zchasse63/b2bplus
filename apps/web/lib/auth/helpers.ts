/**
 * Centralized Authentication & Authorization Helpers
 * 
 * Provides consistent helpers for checking user roles, organization membership,
 * and authorization across all API routes.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { createLogger } from '@/lib/logging/logger'

const logger = createLogger('auth-helpers')

/**
 * Check if user is an admin
 * 
 * @param userId - User ID to check
 * @returns true if user has admin role
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const supabase = createAdminClient()
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (error || !profile) {
      logger.warn('Failed to check admin status', { userId, error })
      return false
    }

    return (profile as any).role === 'admin'
  } catch (error) {
    logger.error('Error checking admin status', { userId, error })
    return false
  }
}

/**
 * Check if user belongs to an organization
 * 
 * @param userId - User ID
 * @param organizationId - Organization ID
 * @returns true if user is a member of the organization
 */
export async function isUserInOrganization(
  userId: string,
  organizationId: string
): Promise<boolean> {
  try {
    const supabase = createAdminClient()
    const { data: membership, error } = await supabase
      .from('organization_members')
      .select('id')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single()

    if (error || !membership) {
      return false
    }

    return true
  } catch (error) {
    logger.error('Error checking organization membership', {
      userId,
      organizationId,
      error,
    })
    return false
  }
}

/**
 * Check if user is admin of an organization
 * 
 * @param userId - User ID
 * @param organizationId - Organization ID
 * @returns true if user is an admin member of the organization
 */
export async function isUserOrgAdmin(
  userId: string,
  organizationId: string
): Promise<boolean> {
  try {
    const supabase = createAdminClient()
    const { data: membership, error } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single()

    if (error || !membership) {
      return false
    }

    return (membership as any).role === 'admin' || (membership as any).role === 'owner'
  } catch (error) {
    logger.error('Error checking org admin status', {
      userId,
      organizationId,
      error,
    })
    return false
  }
}

/**
 * Get user's primary organization
 * 
 * @param userId - User ID
 * @returns Organization ID or null
 */
export async function getUserPrimaryOrganization(
  userId: string
): Promise<string | null> {
  try {
    const supabase = createAdminClient()
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('primary_organization_id')
      .eq('id', userId)
      .single()

    if (error || !profile) {
      return null
    }

    return (profile as any).primary_organization_id
  } catch (error) {
    logger.error('Error getting user primary organization', { userId, error })
    return null
  }
}

