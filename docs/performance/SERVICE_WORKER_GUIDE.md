# Service Worker Implementation Guide

## Overview

Service Workers enable:
- **Offline Support**: App works without internet
- **Caching**: Faster page loads
- **Background Sync**: Sync data when online
- **Push Notifications**: Send notifications to users

## Benefits

1. **Performance**: Cached assets load instantly
2. **Reliability**: Works offline
3. **Engagement**: Push notifications
4. **User Experience**: Faster, more responsive app

## Implementation Strategy

### Phase 1: Basic Service Worker
- Cache static assets
- Enable offline support
- Cache API responses

### Phase 2: Advanced Features
- Background sync
- Push notifications
- Periodic sync

### Phase 3: Monitoring
- Track cache hits/misses
- Monitor service worker errors
- Measure performance improvements

## Service Worker Setup

### 1. Create Service Worker File

File: `public/sw.js`

```javascript
const CACHE_NAME = 'b2b-plus-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/_next/static/chunks/main.js',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) return response;

      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200) {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      });
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
```

### 2. Register Service Worker

File: `app/layout.tsx`

```typescript
'use client';

import { useEffect } from 'react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        console.log('Service Worker registered:', registration);
      }).catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
    }
  }, []);

  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
```

### 3. Create Manifest File

File: `public/manifest.json`

```json
{
  "name": "B2B Plus",
  "short_name": "B2B Plus",
  "description": "B2B e-commerce platform",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### 4. Add Manifest Link

File: `app/layout.tsx`

```typescript
<head>
  <link rel="manifest" href="/manifest.json" />
  <meta name="theme-color" content="#000000" />
</head>
```

## Caching Strategies

### 1. Cache First
- Check cache first
- If not found, fetch from network
- Good for: Static assets, images

### 2. Network First
- Try network first
- If fails, use cache
- Good for: API responses, dynamic content

### 3. Stale While Revalidate
- Serve from cache immediately
- Update cache in background
- Good for: API responses, frequently updated data

## Cache Invalidation

### Version-Based
```javascript
const CACHE_NAME = 'b2b-plus-v2'; // Increment version
```

### Time-Based
```javascript
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

function isCacheExpired(timestamp) {
  return Date.now() - timestamp > CACHE_EXPIRY;
}
```

### Event-Based
```javascript
// Invalidate cache on user action
async function invalidateCache() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(name => caches.delete(name))
  );
}
```

## Performance Targets

### Caching Goals
- **Cache hit rate**: > 80%
- **Offline availability**: 100%
- **Load time improvement**: 50-70% faster

### Metrics to Track
- Cache hit/miss ratio
- Offline usage percentage
- Service Worker errors
- Cache size

## Testing

### Test Offline Mode
1. Open DevTools
2. Go to Application > Service Workers
3. Check "Offline"
4. Verify app still works

### Test Cache
1. Open DevTools
2. Go to Application > Cache Storage
3. Verify cached assets
4. Check cache size

## Monitoring

### Sentry Integration
```typescript
Sentry.captureMessage('Service Worker registered', {
  level: 'info',
  contexts: {
    service_worker: {
      status: 'active',
      cache_size: cacheSize,
    },
  },
});
```

## Rollback Plan

If service workers cause issues:
1. Unregister service worker
2. Clear all caches
3. Revert to previous version
4. Monitor for errors

## Related Documentation

- [MDN Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web.dev Service Workers](https://web.dev/service-workers-cache-storage/)
- [Next.js PWA](https://nextjs.org/docs/advanced-features/progressive-web-apps)

