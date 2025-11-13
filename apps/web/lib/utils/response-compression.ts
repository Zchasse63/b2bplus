import { NextResponse } from 'next/server';
import { gzip, brotliCompress } from 'zlib';
import { promisify } from 'util';

/**
 * Response Compression Utilities
 * Compresses API responses to reduce bandwidth usage
 * Especially important for large AI responses
 */

const gzipAsync = promisify(gzip);
const brotliAsync = promisify(brotliCompress);

export interface CompressionOptions {
  // Minimum size to compress (bytes)
  minSize?: number;

  // Compression level (1-11 for brotli, 1-9 for gzip)
  level?: number;

  // Preferred compression algorithm
  algorithm?: 'gzip' | 'brotli' | 'auto';

  // Content types to compress
  compressibleTypes?: string[];
}

/**
 * Default compression options
 */
const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  minSize: 1024, // 1KB
  level: 6,
  algorithm: 'auto',
  compressibleTypes: [
    'application/json',
    'application/javascript',
    'text/plain',
    'text/html',
    'text/css',
    'text/xml',
    'application/xml',
    'application/xml+rss',
    'application/atom+xml',
  ],
};

/**
 * Check if content type should be compressed
 */
function shouldCompress(contentType: string, compressibleTypes: string[]): boolean {
  return compressibleTypes.some(type => contentType.includes(type));
}

/**
 * Compress data with gzip
 */
export async function compressGzip(data: Buffer | string, level: number = 6): Promise<Buffer> {
  const buffer = typeof data === 'string' ? Buffer.from(data) : data;
  return gzipAsync(buffer, { level });
}

/**
 * Compress data with brotli
 */
export async function compressBrotli(data: Buffer | string, level: number = 6): Promise<Buffer> {
  const buffer = typeof data === 'string' ? Buffer.from(data) : data;
  return brotliAsync(buffer, { params: { [11]: level } });
}

/**
 * Compress data with best algorithm
 */
export async function compressAuto(
  data: Buffer | string,
  level: number = 6
): Promise<{ compressed: Buffer; algorithm: 'gzip' | 'brotli' }> {
  // Try brotli first (better compression)
  try {
    const compressed = await compressBrotli(data, level);
    return { compressed, algorithm: 'brotli' };
  } catch {
    // Fall back to gzip
    const compressed = await compressGzip(data, level);
    return { compressed, algorithm: 'gzip' };
  }
}

/**
 * Compress response body
 */
export async function compressResponse(
  body: any,
  contentType: string,
  options: CompressionOptions = {}
): Promise<{
  compressed: Buffer;
  algorithm: 'gzip' | 'brotli' | null;
  originalSize: number;
  compressedSize: number;
}> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Convert body to string
  const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
  const bodyBuffer = Buffer.from(bodyString);

  // Check if compression is needed
  if (
    bodyBuffer.length < opts.minSize ||
    !shouldCompress(contentType, opts.compressibleTypes)
  ) {
    return {
      compressed: bodyBuffer,
      algorithm: null,
      originalSize: bodyBuffer.length,
      compressedSize: bodyBuffer.length,
    };
  }

  // Compress
  let compressed: Buffer;
  let algorithm: 'gzip' | 'brotli';

  if (opts.algorithm === 'auto') {
    const result = await compressAuto(bodyBuffer, opts.level);
    compressed = result.compressed;
    algorithm = result.algorithm;
  } else if (opts.algorithm === 'brotli') {
    compressed = await compressBrotli(bodyBuffer, opts.level);
    algorithm = 'brotli';
  } else {
    compressed = await compressGzip(bodyBuffer, opts.level);
    algorithm = 'gzip';
  }

  return {
    compressed,
    algorithm,
    originalSize: bodyBuffer.length,
    compressedSize: compressed.length,
  };
}

/**
 * Create compressed response
 */
export async function createCompressedResponse(
  body: any,
  contentType: string = 'application/json',
  options: CompressionOptions = {}
): Promise<NextResponse> {
  const { compressed, algorithm, originalSize, compressedSize } = await compressResponse(
    body,
    contentType,
    options
  );

  const response = new NextResponse(compressed as any, {
    headers: {
      'Content-Type': contentType,
      'Content-Length': compressedSize.toString(),
      'X-Original-Size': originalSize.toString(),
      'X-Compression-Ratio': ((1 - compressedSize / originalSize) * 100).toFixed(2) + '%',
    },
  });

  if (algorithm) {
    response.headers.set('Content-Encoding', algorithm);
  }

  return response;
}

/**
 * Compression statistics
 */
export interface CompressionStats {
  totalRequests: number;
  compressedRequests: number;
  totalOriginalSize: number;
  totalCompressedSize: number;
  averageCompressionRatio: number;
  bandwidthSaved: number;
}

/**
 * Compression statistics tracker
 */
export class CompressionStatsTracker {
  private stats: CompressionStats = {
    totalRequests: 0,
    compressedRequests: 0,
    totalOriginalSize: 0,
    totalCompressedSize: 0,
    averageCompressionRatio: 0,
    bandwidthSaved: 0,
  };

  /**
   * Record compression
   */
  record(originalSize: number, compressedSize: number, compressed: boolean): void {
    this.stats.totalRequests++;

    if (compressed) {
      this.stats.compressedRequests++;
    }

    this.stats.totalOriginalSize += originalSize;
    this.stats.totalCompressedSize += compressedSize;

    this.updateStats();
  }

  /**
   * Update calculated statistics
   */
  private updateStats(): void {
    if (this.stats.totalOriginalSize === 0) return;

    this.stats.averageCompressionRatio =
      ((this.stats.totalOriginalSize - this.stats.totalCompressedSize) /
        this.stats.totalOriginalSize) *
      100;

    this.stats.bandwidthSaved = this.stats.totalOriginalSize - this.stats.totalCompressedSize;
  }

  /**
   * Get statistics
   */
  getStats(): CompressionStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  reset(): void {
    this.stats = {
      totalRequests: 0,
      compressedRequests: 0,
      totalOriginalSize: 0,
      totalCompressedSize: 0,
      averageCompressionRatio: 0,
      bandwidthSaved: 0,
    };
  }
}

/**
 * Global compression statistics tracker
 */
export const compressionStats = new CompressionStatsTracker();

/**
 * Middleware for automatic response compression
 */
export async function compressionMiddleware(
  response: NextResponse,
  options: CompressionOptions = {}
): Promise<NextResponse> {
  const contentType = response.headers.get('Content-Type') || 'application/json';
  const body = await response.text();

  const { compressed, algorithm, originalSize, compressedSize } = await compressResponse(
    body,
    contentType,
    options
  );

  compressionStats.record(originalSize, compressedSize, algorithm !== null);

  const compressedResponse = new NextResponse(compressed as any, {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers(response.headers),
  });

  compressedResponse.headers.set('Content-Type', contentType);
  compressedResponse.headers.set('Content-Length', compressedSize.toString());
  compressedResponse.headers.set('X-Original-Size', originalSize.toString());
  compressedResponse.headers.set(
    'X-Compression-Ratio',
    ((1 - compressedSize / originalSize) * 100).toFixed(2) + '%'
  );

  if (algorithm) {
    compressedResponse.headers.set('Content-Encoding', algorithm);
  }

  return compressedResponse;
}

