'use client';

/**
 * Route Error Boundary
 * Catches errors in route segments and provides a recovery UI
 *
 * This component catches errors at the route level (not in the root layout).
 * It preserves the layout context, allowing users to navigate away.
 */

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
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
        errorBoundary: 'route',
      },
      extra: {
        digest: error.digest,
      },
    });
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <svg
            className="mx-auto h-12 w-12 text-amber-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-3">
          Something went wrong
        </h2>

        <p className="text-gray-600 mb-6">
          We encountered an error while loading this page.
          Please try again or navigate to a different page.
        </p>

        {error.digest && (
          <p className="text-sm text-gray-500 mb-6">
            Error ID: <code className="bg-gray-100 px-2 py-1 rounded text-xs">{error.digest}</code>
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try again
          </button>

          <Link
            href="/"
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Go to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
