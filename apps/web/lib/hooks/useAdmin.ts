import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface AdminStatus {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
  role: 'customer' | 'admin' | 'super_admin' | null;
}

export function useAdmin(): AdminStatus {
  const [status, setStatus] = useState<AdminStatus>({
    isAdmin: false,
    isSuperAdmin: false,
    loading: true,
    role: null,
  });

  useEffect(() => {
    const checkAdminStatus = async () => {
      const supabase = createClient();
      
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setStatus({
            isAdmin: false,
            isSuperAdmin: false,
            loading: false,
            role: null,
          });
          return;
        }

        // Get user profile with role
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching admin status:', error);
          setStatus({
            isAdmin: false,
            isSuperAdmin: false,
            loading: false,
            role: null,
          });
          return;
        }

        const role = profile?.role || 'customer';
        const isAdmin = role === 'admin' || role === 'super_admin';
        const isSuperAdmin = role === 'super_admin';

        setStatus({
          isAdmin,
          isSuperAdmin,
          loading: false,
          role,
        });
      } catch (error) {
        console.error('Error checking admin status:', error);
        setStatus({
          isAdmin: false,
          isSuperAdmin: false,
          loading: false,
          role: null,
        });
      }
    };

    checkAdminStatus();
  }, []);

  return status;
}

// Server-side admin check
export async function isAdminServer(): Promise<boolean> {
  const supabase = createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role || 'customer';
    return role === 'admin' || role === 'super_admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}
