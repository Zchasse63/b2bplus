'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  cartCount: number;
  isAdmin: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateCartCount: (count: number) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  // Fetch user and related data
  const fetchAuthData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      setUser(currentUser);

      if (currentUser) {
        // Fetch cart count
        const { count, error: cartError } = await supabase
          .from('cart_items')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', currentUser.id);

        if (!cartError && count !== null) {
          setCartCount(count);
        }

        // Check if user is admin
        const { data: membership, error: memberError } = await supabase
          .from('organization_members')
          .select('role')
          .eq('user_id', currentUser.id)
          .single();

        if (!memberError && membership) {
          setIsAdmin(
            membership.role === 'admin' ||
            membership.role === 'super_admin'
          );
        }
      } else {
        setCartCount(0);
        setIsAdmin(false);
      }
    } catch (err) {
      console.error('Error fetching auth data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch auth data');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Initial fetch
  useEffect(() => {
    fetchAuthData();

    // Set up auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user || null);
      if (event === 'SIGNED_OUT') {
        setCartCount(0);
        setIsAdmin(false);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Refresh all data on sign in or token refresh
        await fetchAuthData();
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [fetchAuthData, supabase.auth]);

  // Subscribe to cart changes using realtime
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel(`cart:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cart_items',
          filter: `user_id=eq.${user.id}`,
        },
        async () => {
          // Refetch cart count when changes detected
          const { count } = await supabase
            .from('cart_items')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

          if (count !== null) {
            setCartCount(count);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, supabase]);

  const updateCartCount = useCallback((count: number) => {
    setCartCount(count);
  }, []);

  const refreshUser = useCallback(async () => {
    await fetchAuthData();
  }, [fetchAuthData]);

  const value: AuthContextType = {
    user,
    loading,
    cartCount,
    isAdmin,
    error,
    refetch: fetchAuthData,
    updateCartCount,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
