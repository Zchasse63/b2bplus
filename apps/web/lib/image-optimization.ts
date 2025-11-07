/**
 * Image Optimization Utilities
 * Provides helpers for optimizing images with Next.js Image component
 */

/**
 * Generate a blur data URL for image placeholders
 * Creates a tiny 1x1 pixel transparent image in base64 format
 */
export function generateBlurDataURL(): string {
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
}

/**
 * Generate a shimmer blur data URL for loading states
 * Creates a more sophisticated shimmer effect
 */
export function generateShimmerDataURL(width: number, height: number): string {
  const shimmer = (w: number, h: number) => `
    <svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>
        <linearGradient id="g">
          <stop stop-color="#f6f7f8" offset="0%" />
          <stop stop-color="#edeef1" offset="20%" />
          <stop stop-color="#f6f7f8" offset="40%" />
          <stop stop-color="#f6f7f8" offset="100%" />
        </linearGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="#f6f7f8" />
      <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
      <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1s" repeatCount="indefinite"  />
    </svg>`;

  const toBase64 = (str: string) =>
    typeof window === 'undefined'
      ? Buffer.from(str).toString('base64')
      : window.btoa(str);

  return `data:image/svg+xml;base64,${toBase64(shimmer(width, height))}`;
}

/**
 * Standard image sizes for responsive images
 * These can be used with Next.js Image `sizes` prop
 */
export const IMAGE_SIZES = {
  thumbnail: '64px',
  small: '128px',
  medium: '256px',
  large: '512px',
  xlarge: '1024px',
};

/**
 * Responsive image sizes configuration for different use cases
 */
export const RESPONSIVE_SIZES = {
  // Product cards in grid
  productCard: '(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw',

  // Product detail images
  productDetail: '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw',

  // Full width hero images
  hero: '100vw',

  // Thumbnails and avatars
  thumbnail: '64px',

  // Admin table images
  tableImage: '48px',
};

/**
 * Get optimized image dimensions based on original size and max constraints
 */
export function getOptimizedDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight?: number
): { width: number; height: number } {
  const aspectRatio = originalWidth / originalHeight;

  let width = originalWidth;
  let height = originalHeight;

  // Scale down if width exceeds max
  if (width > maxWidth) {
    width = maxWidth;
    height = Math.round(width / aspectRatio);
  }

  // Scale down if height exceeds max (if specified)
  if (maxHeight && height > maxHeight) {
    height = maxHeight;
    width = Math.round(height * aspectRatio);
  }

  return { width, height };
}

/**
 * Image quality settings for different contexts
 */
export const IMAGE_QUALITY = {
  low: 50,
  medium: 75,
  high: 85,
  max: 95,
};

/**
 * Get the appropriate image quality based on context
 */
export function getImageQuality(context: 'thumbnail' | 'card' | 'detail' | 'hero'): number {
  switch (context) {
    case 'thumbnail':
      return IMAGE_QUALITY.medium;
    case 'card':
      return IMAGE_QUALITY.high;
    case 'detail':
      return IMAGE_QUALITY.high;
    case 'hero':
      return IMAGE_QUALITY.max;
    default:
      return IMAGE_QUALITY.high;
  }
}

/**
 * Check if an image URL is external (requires domains configuration)
 */
export function isExternalImage(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Get loader for external images (Supabase, CDN, etc.)
 */
export function getImageLoader(src: string): string | undefined {
  if (src.includes('supabase')) {
    return 'custom';
  }
  return undefined;
}

/**
 * Standard image dimensions for common use cases
 */
export const STANDARD_DIMENSIONS = {
  productCard: { width: 300, height: 300 },
  productThumbnail: { width: 100, height: 100 },
  productDetail: { width: 600, height: 600 },
  tableThumbnail: { width: 48, height: 48 },
  avatar: { width: 40, height: 40 },
  avatarLarge: { width: 80, height: 80 },
  logo: { width: 200, height: 60 },
  hero: { width: 1920, height: 600 },
};
