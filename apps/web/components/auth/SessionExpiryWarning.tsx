'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Alert } from '@/components/b2b/Alert';
import { Button } from '@/components/b2b';

/**
 * Warning toast for session expiry
 * Displays countdown and allows session extension
 */
export function SessionExpiryWarning() {
  const { sessionExpiryWarning, secondsUntilExpiry, extendSession } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (sessionExpiryWarning) {
      setDismissed(false);
    }
  }, [sessionExpiryWarning]);

  if (!sessionExpiryWarning || dismissed || !secondsUntilExpiry) return null;

  const minutes = Math.floor(secondsUntilExpiry / 60);
  const seconds = secondsUntilExpiry % 60;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md animate-slide-in">
      <Alert
        variant="warning"
        dismissible
        onClose={() => setDismissed(true)}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <p className="font-semibold text-sm mb-1">Session Expiring Soon</p>
            <p className="text-sm mb-3">
              Your session will expire in {minutes > 0 ? `${minutes}m ` : ''}{seconds}s.
              Extend your session to stay logged in.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={async () => {
                await extendSession();
                setDismissed(true);
              }}
            >
              Extend Session
            </Button>
          </div>
        </div>
      </Alert>
    </div>
  );
}
