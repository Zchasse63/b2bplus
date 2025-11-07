import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export interface AdminUser {
  id: string;
  email: string;
  role: 'customer' | 'admin' | 'super_admin';
}

export interface AdminCheckResult {
  user: AdminUser | null;
  error: NextResponse | null;
}

/**
 * Standard admin role checking middleware
 * Use this in all admin API endpoints for consistent authorization
 *
 * @param requireSuperAdmin - If true, only super_admin role is allowed
 * @returns Object with user info or error response
 */
export async function checkAdminRole(
  requireSuperAdmin: boolean = false
): Promise<AdminCheckResult> {
  const supabase = await createClient();

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    };
  }

  // Check role from profiles table (platform-level roles)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, email, full_name')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Profile not found' }, { status: 403 })
    };
  }

  const role = profile.role || 'customer';

  // Check if user has required admin privileges
  if (requireSuperAdmin) {
    if (role !== 'super_admin') {
      return {
        user: null,
        error: NextResponse.json(
          { error: 'Super admin access required' },
          { status: 403 }
        )
      };
    }
  } else {
    if (!['admin', 'super_admin'].includes(role)) {
      return {
        user: null,
        error: NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        )
      };
    }
  }

  return {
    user: {
      id: user.id,
      email: profile.email || user.email || '',
      role: role as 'customer' | 'admin' | 'super_admin'
    },
    error: null
  };
}

/**
 * Helper to check if current user is an admin (for client-side checks)
 * This is a simpler check that just returns boolean
 */
export async function isAdmin(): Promise<boolean> {
  const { user } = await checkAdminRole();
  return user !== null;
}

/**
 * Helper to check if current user is a super admin
 */
export async function isSuperAdmin(): Promise<boolean> {
  const { user } = await checkAdminRole(true);
  return user !== null;
}

/**
 * Check if user's organization is approved
 * Throws error if organization is pending or rejected
 * Phase 1, Task 1.3: Registration Approval System
 *
 * @param userId - User ID to check
 * @throws Error if organization is not approved
 */
export async function requireApprovedOrganization(userId: string): Promise<void> {
  const supabase = await createClient();

  const { data: member, error } = await supabase
    .from('organization_members')
    .select(`
      organization:organizations!inner(
        id,
        name,
        approval_status,
        rejection_reason
      )
    `)
    .eq('user_id', userId)
    .single();

  if (error || !member) {
    throw new Error('Organization membership not found');
  }

  const org = member.organization as any;

  if (org.approval_status === 'pending') {
    throw new Error('Organization pending approval. Please wait for admin review.');
  }

  if (org.approval_status === 'rejected') {
    const reason = org.rejection_reason
      ? `Organization registration was rejected: ${org.rejection_reason}`
      : 'Organization registration was rejected. Please contact support.';
    throw new Error(reason);
  }

  if (org.approval_status !== 'approved') {
    throw new Error('Organization is not approved');
  }
}

/**
 * Check if user's organization is approved (returns boolean)
 * Use this for non-throwing checks
 *
 * @param userId - User ID to check
 * @returns true if organization is approved, false otherwise
 */
export async function isOrganizationApproved(userId: string): Promise<boolean> {
  try {
    await requireApprovedOrganization(userId);
    return true;
  } catch {
    return false;
  }
}
