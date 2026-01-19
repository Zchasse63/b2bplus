'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Alert } from '@/components/b2b/Alert';

/**
 * Toast notification for auth errors
 * Displays error messages from AuthContext with retry options
 */
export function AuthErrorToast() {
  const { error, clearError, refetch } = useAuth();

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        if (!error.retryable) {
          clearError();
        }
      }, 10000); // Auto-dismiss after 10 seconds for non-retryable errors

      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  if (!error) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md animate-slide-in">
      <Alert
        variant="error"
        dismissible
        onClose={clearError}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <p className="font-semibold text-sm mb-1">Authentication Error</p>
            <p className="text-sm">{error.message}</p>
          </div>
          {error.retryable && (
            <button
              onClick={() => {
                clearError();
                refetch();
              }}
              className="text-sm font-medium underline hover:no-underline whitespace-nowrap"
            >
              Retry
            </button>
          )}
        </div>
      </Alert>
    </div>
  );
}
