# Performance Optimization Examples

Quick reference guide for implementing performance optimizations in the B2B+ platform.

## Virtual Scrolling Example

### Convert Existing List to Virtual Scrolling

**Before (using regular mapping):**
```tsx
<div className="space-y-4">
  {products.map((product) => (
    <ProductCard key={product.id} product={product} />
  ))}
</div>
```

**After (using VirtualList):**
```tsx
import { VirtualList } from '@/components/VirtualList';

<VirtualList
  items={products}
  height={600}
  itemHeight={120}
  renderItem={(product, index) => (
    <ProductCard key={product.id} product={product} />
  )}
/>
```

### With Custom Wrapper

```tsx
<VirtualList
  items={products}
  height={window.innerHeight - 200}
  itemHeight={100}
  className="custom-scroll"
  renderItem={(product, index) => (
    <div className="p-4 border-b">
      <ProductCard product={product} />
    </div>
  )}
/>
```

---

## Image Optimization Examples

### Product Card Image

```tsx
import Image from 'next/image';
import { STANDARD_DIMENSIONS, generateShimmerDataURL } from '@/lib/image-optimization';

<Image
  src={product.image_url}
  alt={product.name}
  {...STANDARD_DIMENSIONS.productCard}
  placeholder="blur"
  blurDataURL={generateShimmerDataURL(300, 300)}
  loading="lazy"
  className="rounded-lg object-cover"
/>
```

### Responsive Hero Image

```tsx
import Image from 'next/image';
import { RESPONSIVE_SIZES } from '@/lib/image-optimization';

<Image
  src="/hero.jpg"
  alt="Hero"
  fill
  priority // Load immediately for above-fold content
  sizes={RESPONSIVE_SIZES.hero}
  className="object-cover"
/>
```

### Thumbnail with Optimization

```tsx
import Image from 'next/image';
import { STANDARD_DIMENSIONS, getImageQuality } from '@/lib/image-optimization';

<Image
  src={product.thumbnail}
  alt={product.name}
  {...STANDARD_DIMENSIONS.tableThumbnail}
  quality={getImageQuality('thumbnail')}
  loading="lazy"
/>
```

---

## Code Splitting Examples

### Lazy Load Charts Page

**Before:**
```tsx
import { LineChart, Line, XAxis, YAxis } from 'recharts';

function ReportsPage() {
  return (
    <LineChart data={data}>
      <XAxis dataKey="date" />
      <YAxis />
      <Line dataKey="revenue" />
    </LineChart>
  );
}
```

**After:**
```tsx
import { lazy, Suspense } from 'react';
import { ChartLoadingFallback } from '@/components/lazy';

const RechartsComponents = lazy(() => import('recharts'));

function ReportsPage() {
  return (
    <Suspense fallback={<ChartLoadingFallback />}>
      <RechartsComponents.LineChart data={data}>
        <RechartsComponents.XAxis dataKey="date" />
        <RechartsComponents.YAxis />
        <RechartsComponents.Line dataKey="revenue" />
      </RechartsComponents.LineChart>
    </Suspense>
  );
}
```

**Or use pre-made lazy components:**
```tsx
import { LazyLineChart, Line, XAxis, YAxis } from '@/components/lazy';

function ReportsPage() {
  return (
    <LazyLineChart data={data} height={300}>
      <XAxis dataKey="date" />
      <YAxis />
      <Line type="monotone" dataKey="revenue" stroke="#8884d8" />
    </LazyLineChart>
  );
}
```

### Lazy Load Heavy Modal

```tsx
import { lazy, Suspense, useState } from 'react';
import { LoadingSpinner } from '@/components/LoadingState';

const HeavyModal = lazy(() => import('./HeavyModal'));

function ParentComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Open Modal</button>

      {isOpen && (
        <Suspense fallback={<LoadingSpinner />}>
          <HeavyModal onClose={() => setIsOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
```

### Lazy Load Product Recommendations

```tsx
import { LazyProductRecommendations } from '@/components/lazy';

function ProductDetailPage({ product }) {
  return (
    <div>
      {/* Product details */}
      <ProductInfo product={product} />

      {/* Lazy-loaded recommendations */}
      <LazyProductRecommendations
        productId={product.id}
        type="similar"
        title="You Might Also Like"
        limit={4}
      />
    </div>
  );
}
```

---

## Service Worker Examples

### Check Online Status

```tsx
'use client';

import { useEffect, useState } from 'react';

function OnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            ⚠️
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              You are currently offline. Some features may be limited.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
```

### Clear Service Worker Cache

```tsx
async function clearServiceWorkerCache() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CLEAR_CACHE'
    });

    // Reload after clearing
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }
}

// In your settings component
<button onClick={clearServiceWorkerCache}>
  Clear Cache
</button>
```

---

## Bundle Optimization Examples

### Tree-Shaking Friendly Exports

**Create index.ts files with named exports:**

```tsx
// components/index.ts
export { Button } from './Button';
export { Card } from './Card';
export { Input } from './Input';

// Then import only what you need
import { Button, Card } from '@/components';
```

### Analyze and Optimize Heavy Imports

**Before:**
```tsx
import _ from 'lodash'; // Imports entire lodash library
```

**After:**
```tsx
import debounce from 'lodash/debounce'; // Imports only debounce
```

### Dynamic Import for Route-Specific Code

```tsx
// app/admin/page.tsx
import dynamic from 'next/dynamic';

const AdminDashboard = dynamic(() => import('@/components/AdminDashboard'), {
  loading: () => <div>Loading dashboard...</div>,
  ssr: false, // Client-side only
});

export default function AdminPage() {
  return <AdminDashboard />;
}
```

---

## Complete Example: Optimized Product List Page

```tsx
'use client';

import { useState, useEffect } from 'react';
import { VirtualList } from '@/components/VirtualList';
import Image from 'next/image';
import { STANDARD_DIMENSIONS, generateShimmerDataURL } from '@/lib/image-optimization';
import { Card } from '@/components/b2b';

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
}

export default function OptimizedProductListPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    const response = await fetch('/api/products');
    const data = await response.json();
    setProducts(data);
    setLoading(false);
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Products</h1>

      {/* Virtual scrolling for performance */}
      <VirtualList
        items={products}
        height={600}
        itemHeight={120}
        renderItem={(product, index) => (
          <Card key={product.id} className="p-4 mb-2">
            <div className="flex gap-4">
              {/* Optimized image loading */}
              <div className="flex-shrink-0">
                <Image
                  src={product.image_url}
                  alt={product.name}
                  {...STANDARD_DIMENSIONS.productThumbnail}
                  placeholder="blur"
                  blurDataURL={generateShimmerDataURL(100, 100)}
                  loading="lazy"
                  className="rounded-lg"
                />
              </div>

              <div className="flex-1">
                <h3 className="font-semibold">{product.name}</h3>
                <p className="text-green-600 font-bold">
                  ${product.price.toFixed(2)}
                </p>
              </div>
            </div>
          </Card>
        )}
      />
    </div>
  );
}
```

---

## Testing Performance

### Measure Performance

```tsx
'use client';

import { useEffect } from 'react';

export function PerformanceMonitor() {
  useEffect(() => {
    // Measure page load performance
    if (typeof window !== 'undefined' && 'performance' in window) {
      window.addEventListener('load', () => {
        const perfData = window.performance.timing;
        const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;

        console.log('Page Load Time:', pageLoadTime, 'ms');

        // Send to analytics
        // trackPerformance('page_load', pageLoadTime);
      });
    }
  }, []);

  return null;
}
```

### Lighthouse in Development

```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run Lighthouse audit
lighthouse http://localhost:3000 --view

# Or use Chrome DevTools > Lighthouse tab
```

---

## Quick Wins Checklist

- [ ] Add VirtualList to pages with 500+ items
- [ ] Use lazy loading for charts and heavy components
- [ ] Implement image optimization with blur placeholders
- [ ] Enable service worker in production
- [ ] Run bundle analyzer and remove unused dependencies
- [ ] Add loading states for lazy components
- [ ] Test offline functionality
- [ ] Monitor Core Web Vitals
- [ ] Optimize database queries
- [ ] Add Redis caching for frequently accessed data

---

## Need Help?

Refer to the main [PERFORMANCE_OPTIMIZATIONS.md](../PERFORMANCE_OPTIMIZATIONS.md) document for detailed explanations and troubleshooting.
