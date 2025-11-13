/**
 * Service Worker Registration Component
 * 
 * Registers the service worker and handles updates
 */

'use client';

import { useEffect, useState } from 'react';

export function ServiceWorkerRegister() {
  const [isReady, setIsReady] = useState(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!('serviceWorker' in navigator)) {
      console.log('[Service Worker] Not supported in this browser');
      return;
    }

    // Register service worker
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      console.log('[Service Worker] Registered successfully:', registration);
      setIsReady(true);

      // Check for updates periodically
      setInterval(() => {
        registration.update();
      }, 60000); // Check every minute

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;

        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker is ready
            console.log('[Service Worker] Update available');
            setIsUpdateAvailable(true);

            // Show update notification
            showUpdateNotification();
          }
        });
      });
    }).catch((error) => {
      console.error('[Service Worker] Registration failed:', error);
    });

    // Handle service worker messages
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('[Service Worker] Message received:', event.data);
    });

    // Handle controller change
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[Service Worker] Controller changed');
      window.location.reload();
    });
  }, []);

  const handleUpdate = () => {
    if (!navigator.serviceWorker.controller) return;

    navigator.serviceWorker.controller.postMessage({
      type: 'SKIP_WAITING',
    });

    setIsUpdateAvailable(false);
  };

  const handleClearCache = () => {
    if (!navigator.serviceWorker.controller) return;

    navigator.serviceWorker.controller.postMessage({
      type: 'CLEAR_CACHE',
    });

    console.log('[Service Worker] Cache cleared');
  };

  const showUpdateNotification = () => {
    // You can replace this with a toast notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('B2B Plus Update Available', {
        body: 'A new version is available. Click to update.',
        icon: '/icon-192.png',
      });
    }
  };

  if (!isReady) {
    return null;
  }

  return (
    <>
      {isUpdateAvailable && (
        <div className="fixed bottom-4 right-4 bg-blue-500 text-white p-4 rounded-lg shadow-lg z-50">
          <p className="mb-2">A new version is available!</p>
          <div className="flex gap-2">
            <button
              onClick={handleUpdate}
              className="bg-white text-blue-500 px-4 py-2 rounded hover:bg-gray-100"
            >
              Update
            </button>
            <button
              onClick={() => setIsUpdateAvailable(false)}
              className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
            >
              Later
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default ServiceWorkerRegister;

