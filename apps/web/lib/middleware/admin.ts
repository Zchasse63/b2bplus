import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export interface AdminUser {
  id: string;
  email: string;
  role: 'customer' | 'admin' | 'super_admin';
  organizationId?: string;
}

export interface AdminCheckResult {
  user: AdminUser | null;
  error: NextResponse | null;
}

/**
 * Standard admin role checking middleware
 * Validates both platform-level and organization-level admin permissions
 *
 * @param requireSuperAdmin - If true, only super_admin role is allowed
 * @param organizationId - Optional organization ID to validate membership in
 * @returns Object with user info or error response
 */
export async function checkAdminRole(
  requireSuperAdmin: boolean = false,
  organizationId?: string
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

  // Check platform-level role from profiles table
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

  const platformRole = profile.role || 'customer';

  // Super admin has access to everything
  if (platformRole === 'super_admin') {
    return {
      user: {
        id: user.id,
        email: profile.email || user.email || '',
        role: 'super_admin'
      },
      error: null
    };
  }

  // For super_admin requirement, fail if not super_admin
  if (requireSuperAdmin) {
    return {
      user: null,
      error: NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    };
  }

  // Platform admin
  if (platformRole === 'admin') {
    return {
      user: {
        id: user.id,
        email: profile.email || user.email || '',
        role: 'admin'
      },
      error: null
    };
  }

  // Not a platform admin, check for organization admin role
  if (organizationId) {
    const { data: orgMember, error: orgError } = await supabase
      .from('organization_members')
      .select('role, organization_id')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .single();

    if (!orgError && orgMember && ['admin', 'owner'].includes(orgMember.role)) {
      return {
        user: {
          id: user.id,
          email: profile.email || user.email || '',
          role: 'admin',
          organizationId: orgMember.organization_id
        },
        error: null
      };
    }
  }

  // No admin privileges
  return {
    user: null,
    error: NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    )
  };
}

/**
 * Check if user is member of an organization and has specific role
 *
 * @param userId - User ID to check
 * @param organizationId - Organization ID
 * @param requiredRole - Required role ('member', 'admin', 'owner')
 * @returns true if user has the required role in the organization
 */
export async function checkOrganizationRole(
  userId: string,
  organizationId: string,
  requiredRole: 'member' | 'admin' | 'owner' = 'member'
): Promise<boolean> {
  const supabase = await createClient();

  const { data: member, error } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .single();

  if (error || !member) {
    return false;
  }

  const roleHierarchy: Record<string, number> = {
    member: 0,
    admin: 1,
    owner: 2
  };

  const userRoleLevel = roleHierarchy[member.role] || -1;
  const requiredLevel = roleHierarchy[requiredRole] || 0;

  return userRoleLevel >= requiredLevel;
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

/**
 * Get user's organization ID with validation
 *
 * @param userId - User ID
 * @returns Organization ID or null if not found
 */
export async function getUserOrganizationId(userId: string): Promise<string | null> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('current_organization_id')
    .eq('id', userId)
    .single();

  return profile?.current_organization_id || null;
}

/**
 * Validate admin access to a specific organization
 * Ensures user is admin of the organization they're trying to manage
 *
 * @param userId - User ID to check
 * @param organizationId - Organization ID to validate access to
 * @returns true if user is admin of the organization
 */
export async function isOrganizationAdmin(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const supabase = await createClient();

  // Check if user is platform admin (they have access to everything)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (profile?.role === 'super_admin' || profile?.role === 'admin') {
    return true;
  }

  // Check if user is organization admin
  return checkOrganizationRole(userId, organizationId, 'admin');
}
