/**
 * Cache Key Generator
 * Provides consistent, versioned cache keys across the application
 */

const VERSION = 'v1';

export const cacheKeys = {
    // Product cache keys
    product: (id: string) => `${VERSION}:product:${id}`,
    products: () => `${VERSION}:products:all`,
    productsByCategory: (categoryId: string) => `${VERSION}:products:category:${categoryId}`,

    // Pricing cache keys
    pricing: (productId: string, organizationId: string) =>
        `${VERSION}:pricing:product:${productId}:org:${organizationId}`,
    pricingRules: (organizationId: string) =>
        `${VERSION}:pricing-rules:org:${organizationId}`,
    pricingAll: () => `${VERSION}:pricing:all`,

    // Organization cache keys
    organization: (id: string) => `${VERSION}:organization:${id}`,
    organizationSettings: (id: string) =>
        `${VERSION}:organization:${id}:settings`,

    // Customer context cache keys
    customer: (id: string) => `${VERSION}:customer:${id}`,
    customerPreferences: (id: string) =>
        `${VERSION}:customer:${id}:preferences`,

    // Cart cache keys
    cart: (userId: string) => `${VERSION}:cart:user:${userId}`,
    cartItems: (userId: string) => `${VERSION}:cart:items:user:${userId}`,

    // Promotional code cache keys
    promotionalCode: (code: string) =>
        `${VERSION}:promo-code:${code.toLowerCase()}`,
    promotionalCodes: (organizationId: string) =>
        `${VERSION}:promo-codes:org:${organizationId}`,

    // Inventory cache keys
    inventory: (productId: string) => `${VERSION}:inventory:product:${productId}`,
    inventoryAll: () => `${VERSION}:inventory:all`,

    // Session cache keys
    session: (sessionId: string) => `${VERSION}:session:${sessionId}`,
    userSessions: (userId: string) => `${VERSION}:sessions:user:${userId}`,

    // Configuration cache keys
    config: () => `${VERSION}:config`,
    featureFlags: () => `${VERSION}:feature-flags`,

    // Invalidation patterns
    patterns: {
        products: `${VERSION}:product:*`,
        pricing: `${VERSION}:pricing:*`,
        organizations: `${VERSION}:organization:*`,
        customers: `${VERSION}:customer:*`,
        carts: `${VERSION}:cart:*`,
        promoCodes: `${VERSION}:promo-code*`,
        inventory: `${VERSION}:inventory:*`,
        sessions: `${VERSION}:session:*`,
        all: `${VERSION}:*`,
    },
};

export type CacheKey = ReturnType<typeof cacheKeys[Exclude<keyof typeof cacheKeys, 'patterns'>]>;
