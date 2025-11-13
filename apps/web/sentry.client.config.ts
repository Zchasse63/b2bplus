/**
 * Sentry Client Configuration
 * Configures error tracking for browser-side errors
 */

import * as Sentry from '@sentry/nextjs';

export function initSentryClient() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    console.warn('Sentry DSN not configured, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    debug: process.env.NODE_ENV === 'development',

    // Capture unhandled promise rejections
    attachStacktrace: true,
    
    // Ignore certain errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      // Random plugins/extensions
      'chrome-extension://',
      'moz-extension://',
      // Network errors
      'NetworkError',
      'Network request failed',
      // User cancelled
      'AbortError',
    ],
    
    // Before sending to Sentry
    beforeSend(event, hint) {
      // Don't send errors in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Sentry event (not sent in dev):', event);
        return null;
      }
      
      return event;
    },
  });
}

