'use client';

/**
 * Sentry Client Provider
 * Initializes Sentry on the client-side for browser error tracking
 *
 * This component should be placed near the root of the application
 * to ensure Sentry is initialized early in the client-side lifecycle.
 */

import { useEffect, useRef } from 'react';
import { initSentryClient } from '@/sentry.client.config';

interface SentryProviderProps {
  children: React.ReactNode;
}

export function SentryProvider({ children }: SentryProviderProps) {
  const initialized = useRef(false);

  useEffect(() => {
    // Only initialize once
    if (initialized.current) return;
    initialized.current = true;

    // Initialize Sentry client
    initSentryClient();
  }, []);

  return <>{children}</>;
}
