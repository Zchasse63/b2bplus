'use client';

import { useAuth } from '@/contexts/AuthContext';

/**
 * Loading spinner overlay during auth operations
 * Shows when AuthContext.loading is true
 */
export function AuthLoadingSpinner() {
  const { loading } = useAuth();

  if (!loading) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-40">
      <div className="bg-white rounded-lg p-6 shadow-xl flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-b2b-yellow border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-b2b-gray-500">Authenticating...</p>
      </div>
    </div>
  );
}
