import { createClient } from '@/lib/supabase/server';

/**
 * Standard admin role checking middleware
 * Use this in all admin API endpoints for consistent authorization
 *
 * @param minRole - Minimum role required ('admin' or 'super_admin')
 * @returns Object with authorized status and user/profile info or error details
 */
export async function checkAdminRole(minRole: 'admin' | 'super_admin' = 'admin') {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { authorized: false, error: 'Unauthorized', status: 401 };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return { authorized: false, error: 'Profile not found', status: 404 };
  }

  const validRoles = minRole === 'super_admin'
    ? ['super_admin']
    : ['admin', 'super_admin'];

  if (!validRoles.includes(profile.role)) {
    return { authorized: false, error: 'Forbidden', status: 403 };
  }

  return { authorized: true, user, profile };
}

/**
 * Helper to check if current user is an admin (for client-side checks)
 * This is a simpler check that just returns boolean
 */
export async function isAdmin(): Promise<boolean> {
  const result = await checkAdminRole();
  return result.authorized;
}

/**
 * Helper to check if current user is a super admin
 */
export async function isSuperAdmin(): Promise<boolean> {
  const result = await checkAdminRole('super_admin');
  return result.authorized;
}
