'use client';

/**
 * Global Error Boundary
 * Catches errors in the root layout and provides a recovery UI
 *
 * This component is required to be a Client Component and must
 * define its own <html> and <body> tags since it replaces the root layout.
 */

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Report error to Sentry
    Sentry.captureException(error, {
      tags: {
        errorBoundary: 'global',
      },
      extra: {
        digest: error.digest,
      },
    });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full text-center">
            <div className="mb-8">
              <svg
                className="mx-auto h-16 w-16 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Something went wrong
            </h1>

            <p className="text-gray-600 mb-6">
              We apologize for the inconvenience. An unexpected error has occurred.
              Our team has been notified and is working to fix the issue.
            </p>

            {error.digest && (
              <p className="text-sm text-gray-500 mb-6">
                Error ID: <code className="bg-gray-100 px-2 py-1 rounded">{error.digest}</code>
              </p>
            )}

            <div className="space-y-4">
              <button
                onClick={reset}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try again
              </button>

              <a
                href="/"
                className="block w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Go to homepage
              </a>
            </div>

            <p className="mt-8 text-sm text-gray-500">
              If this problem persists, please contact{' '}
              <a href="mailto:support@b2bplus.com" className="text-blue-600 hover:underline">
                support@b2bplus.com
              </a>
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
