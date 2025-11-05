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
