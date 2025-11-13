'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Hook to manage CSRF token fetching and caching
 * Automatically fetches token on mount and caches it
 */
export function useCSRFToken() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCSRFToken = async () => {
      try {
        const response = await fetch('/api/csrf-token');
        if (!response.ok) {
          throw new Error('Failed to fetch CSRF token');
        }
        const data = await response.json();
        setToken(data.token);
        setError(null);
      } catch (err) {
        console.error('Error fetching CSRF token:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchCSRFToken();
  }, []);

  return { token, loading, error };
}

/**
 * Fetch CSRF token and return it
 * Useful for non-React contexts
 */
export async function fetchCSRFToken(): Promise<string> {
  const response = await fetch('/api/csrf-token');
  if (!response.ok) {
    throw new Error('Failed to fetch CSRF token');
  }
  const data = await response.json();
  return data.token;
}

/**
 * Wrapper for fetch that automatically includes CSRF token
 * Usage: const response = await fetchWithCSRF('/api/endpoint', { method: 'POST', body: ... })
 */
export async function fetchWithCSRF(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Only add CSRF token for state-changing methods
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes((options.method || 'GET').toUpperCase())) {
    return fetch(url, options);
  }

  try {
    const token = await fetchCSRFToken();
    const headers = new Headers(options.headers || {});
    headers.set('x-csrf-token', token);

    return fetch(url, {
      ...options,
      headers,
    });
  } catch (error) {
    console.error('Error adding CSRF token to request:', error);
    // Fallback to regular fetch if token fetching fails
    return fetch(url, options);
  }
}
