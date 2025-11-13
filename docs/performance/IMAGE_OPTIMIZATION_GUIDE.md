# Image Optimization Guide

## Overview

Image optimization is critical for performance:
- Images typically account for 50-80% of page weight
- Unoptimized images can add 500KB+ to page load
- Proper optimization can reduce image size by 60-80%

## Current State

### Issues Identified
- Using `<img>` tags instead of Next.js `<Image>` component
- No WebP format support
- No responsive image sizes
- No lazy loading
- No image compression

### Files with Image Issues
- `components/Avatar.tsx` - Avatar images
- `components/ProductCard.tsx` - Product images
- `components/ProductDetail.tsx` - Product detail images
- `components/ProductRecommendations.tsx` - Recommendation images
- `components/ReorderNotificationCard.tsx` - Notification images
- `components/VisualSearch.tsx` - Search result images
- `components/admin/ImageUpload.tsx` - Upload preview images

## Optimization Strategy

### 1. Use Next.js Image Component

**Before:**
```typescript
<img src="/image.jpg" alt="Product" />
```

**After:**
```typescript
import Image from 'next/image';

<Image
  src="/image.jpg"
  alt="Product"
  width={400}
  height={300}
  priority={false}
  loading="lazy"
/>
```

**Benefits:**
- Automatic format conversion (WebP, AVIF)
- Responsive image sizes
- Lazy loading by default
- Built-in optimization

### 2. Image Sizes Configuration

Add to `next.config.js`:
```javascript
images: {
  deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  formats: ['image/webp', 'image/avif'],
}
```

### 3. Responsive Images

```typescript
<Image
  src="/image.jpg"
  alt="Product"
  width={800}
  height={600}
  sizes="(max-width: 640px) 100vw,
         (max-width: 1024px) 50vw,
         33vw"
  priority={false}
/>
```

### 4. Image Optimization Checklist

- [ ] Replace all `<img>` with `<Image>`
- [ ] Add `width` and `height` attributes
- [ ] Set `loading="lazy"` for below-fold images
- [ ] Set `priority={true}` for above-fold images
- [ ] Add `sizes` prop for responsive images
- [ ] Compress source images (max 1920px width)
- [ ] Use WebP format for source images
- [ ] Add alt text to all images

## Implementation Plan

### Phase 1: Avatar Component
- Update `components/Avatar.tsx`
- Replace `<img>` with `<Image>`
- Add responsive sizes
- Test build

### Phase 2: Product Images
- Update `components/ProductCard.tsx`
- Update `components/ProductDetail.tsx`
- Update `components/ProductRecommendations.tsx`
- Add responsive sizes

### Phase 3: Other Components
- Update `components/ReorderNotificationCard.tsx`
- Update `components/VisualSearch.tsx`
- Update `components/admin/ImageUpload.tsx`

### Phase 4: Verification
- Run Lighthouse audit
- Measure image load times
- Monitor Core Web Vitals

## Performance Targets

### Image Optimization Goals
- **Total image size**: < 500KB (from ~1.2MB)
- **Average image size**: < 50KB
- **LCP improvement**: 20-30% faster
- **CLS improvement**: Eliminate layout shift

### Metrics to Track
- Image load time
- Image file size
- Cumulative Layout Shift (CLS)
- Largest Contentful Paint (LCP)

## Tools & Resources

### Image Compression
- TinyPNG/TinyJPG - Online compression
- ImageOptim - Mac app
- ImageMagick - Command line

### Format Conversion
- ImageMagick: `convert image.jpg -quality 85 image.webp`
- FFmpeg: `ffmpeg -i image.jpg image.webp`

### Lighthouse Audit
```bash
lighthouse https://localhost:3000 --view
```

## Best Practices

1. **Always use Next.js Image component**
   - Automatic optimization
   - Format conversion
   - Responsive sizing

2. **Set priority for above-fold images**
   - Improves LCP
   - Preloads critical images

3. **Use lazy loading for below-fold images**
   - Reduces initial load
   - Improves FCP

4. **Provide width and height**
   - Prevents layout shift
   - Improves CLS

5. **Use responsive sizes**
   - Serves appropriate size for device
   - Reduces bandwidth

## Related Documentation

- [Next.js Image Optimization](https://nextjs.org/docs/basic-features/image-optimization)
- [Web.dev Image Optimization](https://web.dev/image-optimization/)
- [Performance Optimization Guide](./performance-optimization-guide.md)

