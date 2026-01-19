'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export enum AuthErrorType {
  SessionExpired = 'SESSION_EXPIRED',
  NetworkError = 'NETWORK_ERROR',
  InvalidCredentials = 'INVALID_CREDENTIALS',
  Unknown = 'UNKNOWN',
}

export interface AuthError {
  type: AuthErrorType;
  message: string;
  retryable: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  cartCount: number;
  isAdmin: boolean;
  error: AuthError | null;
  sessionExpiryWarning: boolean;
  secondsUntilExpiry: number | null;
  refetch: () => Promise<void>;
  updateCartCount: (count: number) => void;
  refreshUser: () => Promise<void>;
  clearError: () => void;
  extendSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const [sessionExpiryWarning, setSessionExpiryWarning] = useState(false);
  const [secondsUntilExpiry, setSecondsUntilExpiry] = useState<number | null>(null);
  const supabase = createClient();

  // Helper to create typed errors
  const createError = useCallback((type: AuthErrorType, message: string, retryable: boolean = false): AuthError => {
    return { type, message, retryable };
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Fetch user and related data
  const fetchAuthData = useCallback(async (retryCount = 0) => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser();

      // Handle auth errors
      if (userError) {
        // AuthSessionMissingError is expected when not logged in
        if (userError.name === 'AuthSessionMissingError') {
          setUser(null);
          setCartCount(0);
          setIsAdmin(false);
          return;
        }

        // Session expired
        if (userError.message?.includes('expired') || userError.message?.includes('refresh')) {
          setError(createError(
            AuthErrorType.SessionExpired,
            'Your session has expired. Please log in again.',
            false
          ));
          setUser(null);
          setCartCount(0);
          setIsAdmin(false);
          return;
        }

        // Network error - retryable
        if (userError.message?.includes('fetch') || userError.message?.includes('network')) {
          setError(createError(
            AuthErrorType.NetworkError,
            'Network error. Please check your connection.',
            true
          ));
          // Retry logic for transient failures
          if (retryCount < 2) {
            setTimeout(() => fetchAuthData(retryCount + 1), 1000 * (retryCount + 1));
            return;
          }
          throw userError;
        }

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
      setError(createError(
        AuthErrorType.Unknown,
        err instanceof Error ? err.message : 'Failed to fetch authentication data',
        true
      ));
    } finally {
      setLoading(false);
    }
  }, [supabase, createError]);

  // Initial fetch
  useEffect(() => {
    fetchAuthData();

    // Set up auth state change listener (guarded for tests/mocks)
    let subscription: { unsubscribe?: () => void } | null = null;

    try {
      if (supabase?.auth && typeof (supabase.auth as any).onAuthStateChange === 'function') {
        const result = (supabase.auth as any).onAuthStateChange(async (event: any, session: any) => {
          setUser(session?.user || null);
          if (event === 'SIGNED_OUT') {
            setCartCount(0);
            setIsAdmin(false);
          } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            // Refresh all data on sign in or token refresh
            await fetchAuthData();
          }
        });
        // Supabase returns an object with .data.subscription OR the subscription directly
        subscription = (result && result.data && result.data.subscription) ? result.data.subscription : result;
      } else {
        // Provide a no-op subscription for environments where auth listener isn't available (unit tests)
        subscription = { unsubscribe: () => {} };
      }
    } catch (err) {
      // If anything unexpected happens, ensure we still have a no-op subscription
      console.error('Failed to setup auth state listener (non-fatal in test):', err);
      subscription = { unsubscribe: () => {} };
    }

    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, [fetchAuthData, supabase]);

  // Subscribe to cart changes using realtime (guarded for tests/mocks)
  useEffect(() => {
    if (!user) return;

    let subscription: { unsubscribe?: () => void } = { unsubscribe: () => {} };

    try {
      if (supabase && typeof (supabase as any).channel === 'function') {
        // Use real realtime subscription when available
        subscription = supabase
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
      } else {
        // If realtime is not available in the test environment, fall back to polling
        const interval = setInterval(async () => {
          try {
            const { count } = await supabase
              .from('cart_items')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id);

            if (count !== null) {
              setCartCount(count);
            }
          } catch (err) {
            // ignore in tests
          }
        }, 5000);

        subscription.unsubscribe = () => clearInterval(interval);
      }
    } catch (err) {
      console.error('Failed to setup realtime subscription (non-fatal in test):', err);
      subscription = { unsubscribe: () => {} };
    }

    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, [user, supabase]);

  const updateCartCount = useCallback((count: number) => {
    setCartCount(count);
  }, []);

  const refreshUser = useCallback(async () => {
    await fetchAuthData();
  }, [fetchAuthData]);

  const extendSession = useCallback(async () => {
    try {
      const { error } = await supabase.auth.refreshSession();
      if (error) throw error;
      setSessionExpiryWarning(false);
      setSecondsUntilExpiry(null);
    } catch (err) {
      console.error('Failed to extend session:', err);
    }
  }, [supabase]);

  // Session expiry warning effect
  useEffect(() => {
    if (!user) {
      setSessionExpiryWarning(false);
      setSecondsUntilExpiry(null);
      return;
    }

    const checkExpiry = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const expiresAt = session.expires_at;
      if (!expiresAt) return;

      const expiryTime = expiresAt * 1000;
      const now = Date.now();
      const timeUntilExpiry = expiryTime - now;
      const secondsRemaining = Math.floor(timeUntilExpiry / 1000);

      if (secondsRemaining <= 60 && secondsRemaining > 0) {
        setSessionExpiryWarning(true);
        setSecondsUntilExpiry(secondsRemaining);
      } else {
        setSessionExpiryWarning(false);
        setSecondsUntilExpiry(null);
      }
    };

    checkExpiry();
    const interval = setInterval(checkExpiry, 5000);

    return () => clearInterval(interval);
  }, [user, supabase]);

  const value: AuthContextType = {
    user,
    loading,
    cartCount,
    isAdmin,
    error,
    sessionExpiryWarning,
    secondsUntilExpiry,
    refetch: fetchAuthData,
    updateCartCount,
    refreshUser,
    clearError,
    extendSession,
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
