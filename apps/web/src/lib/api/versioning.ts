/**
 * API Versioning System
 * Supports multiple API versions with deprecation warnings
 * TASK-033: Implement API Versioning
 */

export const API_VERSIONS = {
  V1: 'v1',
  V2: 'v2', // Future version
} as const;

export const CURRENT_VERSION = API_VERSIONS.V1;
export const DEPRECATED_VERSIONS = [] as string[];

/**
 * API Version Info
 */
export interface APIVersion {
  version: string;
  deprecated: boolean;
  deprecationDate?: string;
  sunsetDate?: string; // When version stops working
  replacementVersion?: string;
}

export const VERSION_INFO: Record<string, APIVersion> = {
  [API_VERSIONS.V1]: {
    version: API_VERSIONS.V1,
    deprecated: false,
  },
};

/**
 * Extract version from request headers or URL
 */
export function getAPIVersion(headers: Headers | Record<string, string>): string {
  // Check header: Accept: application/vnd.b2bplus+json;version=1
  let acceptHeader = '';
  if (headers instanceof Headers) {
    acceptHeader = headers.get('accept') || headers.get('Accept') || '';
  } else {
    acceptHeader = (headers as any)['accept'] || (headers as any)['Accept'] || '';
  }
  const versionMatch = acceptHeader.match(/version=(\d+)/);
  if (versionMatch) {
    return `v${versionMatch[1]}`;
  }

  // Default to current version
  return CURRENT_VERSION;
}

/**
 * Build versioned API URL
 */
export function getVersionedUrl(path: string, version: string = CURRENT_VERSION): string {
  if (path.startsWith('/api/')) {
    return path.replace('/api/', `/api/${version}/`);
  }
  return `/api/${version}${path}`;
}

/**
 * Check if version is deprecated
 */
export function isVersionDeprecated(version: string): boolean {
  const info = VERSION_INFO[version];
  return info?.deprecated || DEPRECATED_VERSIONS.includes(version);
}

/**
 * Get deprecation warning
 */
export function getDeprecationWarning(version: string): string | null {
  const info = VERSION_INFO[version];
  if (!info?.deprecated) return null;

  let warning = `API version ${version} is deprecated.`;
  if (info.replacementVersion) {
    warning += ` Please migrate to ${info.replacementVersion}.`;
  }
  if (info.sunsetDate) {
    warning += ` This version will be retired on ${info.sunsetDate}.`;
  }
  return warning;
}

/**
 * API response with versioning metadata
 */
export interface VersionedResponse<T> {
  data: T;
  apiVersion: string;
  deprecated?: boolean;
  deprecationWarning?: string;
  timestamp: string;
}

/**
 * Create versioned response
 */
export function createVersionedResponse<T>(
  data: T,
  version: string = CURRENT_VERSION
): VersionedResponse<T> {
  const deprecated = isVersionDeprecated(version);
  const warning = deprecated ? getDeprecationWarning(version) : undefined;

  return {
    data,
    apiVersion: version,
    deprecated,
    deprecationWarning: warning || undefined,
    timestamp: new Date().toISOString(),
  };
}

/**
 * API Endpoint Metadata
 */
export interface APIEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  description: string;
  version: string;
  deprecated?: boolean;
  replacedBy?: string;
}

/**
 * Endpoint registry for documentation
 */
export const ENDPOINT_REGISTRY: APIEndpoint[] = [
  // Auth endpoints
  {
    path: '/auth/login',
    method: 'POST',
    description: 'User login',
    version: API_VERSIONS.V1,
  },
  {
    path: '/auth/signup',
    method: 'POST',
    description: 'User registration',
    version: API_VERSIONS.V1,
  },
  {
    path: '/auth/logout',
    method: 'POST',
    description: 'User logout',
    version: API_VERSIONS.V1,
  },

  // Orders
  {
    path: '/orders',
    method: 'GET',
    description: 'List user orders',
    version: API_VERSIONS.V1,
  },
  {
    path: '/orders',
    method: 'POST',
    description: 'Create new order',
    version: API_VERSIONS.V1,
  },
  {
    path: '/orders/:id',
    method: 'GET',
    description: 'Get order details',
    version: API_VERSIONS.V1,
  },
  {
    path: '/orders/:id/status',
    method: 'PATCH',
    description: 'Update order status',
    version: API_VERSIONS.V1,
  },

  // Products
  {
    path: '/products',
    method: 'GET',
    description: 'List products',
    version: API_VERSIONS.V1,
  },
  {
    path: '/products/:id',
    method: 'GET',
    description: 'Get product details',
    version: API_VERSIONS.V1,
  },

  // Cart
  {
    path: '/cart',
    method: 'GET',
    description: 'Get cart contents',
    version: API_VERSIONS.V1,
  },
  {
    path: '/cart/items',
    method: 'POST',
    description: 'Add item to cart',
    version: API_VERSIONS.V1,
  },
  {
    path: '/cart/items/:id',
    method: 'DELETE',
    description: 'Remove item from cart',
    version: API_VERSIONS.V1,
  },
];

/**
 * Get all endpoints for a specific version
 */
export function getEndpointsForVersion(version: string): APIEndpoint[] {
  return ENDPOINT_REGISTRY.filter(ep => ep.version === version && !ep.deprecated);
}

/**
 * Get deprecated endpoints
 */
export function getDeprecatedEndpoints(): APIEndpoint[] {
  return ENDPOINT_REGISTRY.filter(ep => ep.deprecated);
}
