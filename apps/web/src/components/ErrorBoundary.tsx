'use client';

import React, { ReactNode } from 'react';
import { logger } from '@b2b-plus/shared/utils/logger';
import * as Sentry from '@sentry/nextjs';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId?: string;
}

/**
 * Error Boundary Component
 * Catches React errors and displays user-friendly error UI
 * Logs errors to Sentry for production monitoring
 */
class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: undefined,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log to Sentry with full context
    const errorId = Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });

    this.setState({ errorId });

    // Also log to our logger
    logger.error('React Error Boundary caught error', error, {
      component: 'ErrorBoundary',
      errorId,
      componentStack: errorInfo.componentStack,
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorId: undefined,
    });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-center mb-4">
                <div className="text-4xl">⚠️</div>
              </div>

              <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
                Something went wrong
              </h1>

              <p className="text-gray-600 text-center mb-4">
                We're sorry for the inconvenience. Our team has been notified of this error.
              </p>

              {process.env.NODE_ENV === 'development' && (
                <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                  <p className="text-sm font-mono text-red-700 whitespace-pre-wrap break-words">
                    {this.state.error.toString()}
                  </p>
                </div>
              )}

              {this.state.errorId && (
                <div className="text-xs text-gray-500 text-center mb-4">
                  Error ID: <code>{this.state.errorId}</code>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={this.handleReset}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition"
                >
                  Try Again
                </button>

                <button
                  onClick={() => (window.location.href = '/')}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium py-2 px-4 rounded transition"
                >
                  Go to Home
                </button>

                <a
                  href="mailto:support@b2b-plus.com"
                  className="block w-full text-center bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-2 px-4 rounded transition"
                >
                  Contact Support
                </a>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
