'use client';

import React, { Component, ReactNode } from 'react';
import { AuthErrorType } from '@/contexts/AuthContext';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void, logout: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Error boundary for authentication-related errors
 * Catches errors in auth flow and provides recovery UI
 */
export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Auth error boundary caught error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    window.location.reload();
  };

  handleLogout = () => {
    // Clear only auth-related storage keys to preserve user preferences
    if (typeof window !== 'undefined') {
      // Clear Supabase auth tokens
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.startsWith('supabase.'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      // Clear sessionStorage auth keys
      const sessionKeysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.startsWith('sb-') || key.startsWith('supabase.'))) {
          sessionKeysToRemove.push(key);
        }
      }
      sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
    }
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      const { error } = this.state;

      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(error!, this.handleRetry, this.handleLogout);
      }

      // Default error UI
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
          <div className="w-full max-w-md space-y-8">
            <div>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
              </div>
              <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
                Authentication Error
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                {this.getErrorMessage(error)}
              </p>
            </div>

            <div className="mt-8 space-y-3">
              <button
                onClick={this.handleRetry}
                className="group relative flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Try Again
              </button>

              <button
                onClick={this.handleLogout}
                className="group relative flex w-full justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Return to Login
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && error && (
              <details className="mt-8 rounded-md bg-gray-100 p-4">
                <summary className="cursor-pointer text-sm font-medium text-gray-900">
                  Error Details (Development Only)
                </summary>
                <pre className="mt-2 overflow-auto text-xs text-gray-700">
                  {error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }

  private getErrorMessage(error: Error | null): string {
    if (!error) return 'An unknown error occurred';

    // Check for auth-specific errors
    if (error.message.includes('expired') || error.message.includes('session')) {
      return 'Your session has expired. Please log in again.';
    }

    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'Unable to connect. Please check your internet connection and try again.';
    }

    if (error.message.includes('credentials') || error.message.includes('unauthorized')) {
      return 'Invalid credentials. Please log in again.';
    }

    // Generic message for other errors
    return error.message || 'An error occurred during authentication. Please try again.';
  }
}

/**
 * Hook-based wrapper for functional components
 */
export function useAuthErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);

  const showError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  return { error, showError, clearError };
}
