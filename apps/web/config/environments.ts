/**
 * Environment-Specific Configuration
 * Manages configuration for different environments (dev, staging, production)
 */

export type Environment = 'development' | 'staging' | 'production';

export interface EnvironmentConfig {
  // Environment
  env: Environment;
  isDevelopment: boolean;
  isStaging: boolean;
  isProduction: boolean;

  // API Configuration
  apiUrl: string;
  apiTimeout: number;
  apiRetries: number;

  // Supabase Configuration
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey?: string;

  // Feature Flags
  features: {
    aiInsights: boolean;
    emailCampaigns: boolean;
    advancedAnalytics: boolean;
    customPricing: boolean;
    inventoryTracking: boolean;
  };

  // Performance Configuration
  performance: {
    cacheTTL: number;
    requestTimeout: number;
    maxConnections: number;
    compressionEnabled: boolean;
  };

  // Security Configuration
  security: {
    csrfProtection: boolean;
    rateLimiting: boolean;
    rateLimitWindow: number;
    rateLimitMaxRequests: number;
    corsEnabled: boolean;
    corsOrigins: string[];
  };

  // Logging Configuration
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    sentryEnabled: boolean;
    sentryDSN?: string;
    structuredLogging: boolean;
  };

  // Monitoring Configuration
  monitoring: {
    enabled: boolean;
    apmEnabled: boolean;
    metricsEnabled: boolean;
    healthCheckInterval: number;
  };

  // External Services
  services: {
    geminiApiKey?: string;
    sendgridApiKey?: string;
    stripePublishableKey?: string;
    stripeSecretKey?: string;
  };

  // File Upload Configuration
  fileUpload: {
    maxSize: number; // bytes
    allowedTypes: string[];
    storageBackend: 'supabase' | 's3';
  };

  // Email Configuration
  email: {
    enabled: boolean;
    provider: 'sendgrid' | 'resend' | 'smtp';
    fromAddress: string;
    fromName: string;
  };

  // Database Configuration
  database: {
    poolSize: number;
    connectionTimeout: number;
    queryTimeout: number;
  };

  // UI Configuration
  ui: {
    theme: 'light' | 'dark' | 'auto';
    animationsEnabled: boolean;
    debugMode: boolean;
  };
}

/**
 * Development Configuration
 */
const developmentConfig: EnvironmentConfig = {
  env: 'development',
  isDevelopment: true,
  isStaging: false,
  isProduction: false,

  apiUrl: 'http://localhost:3000',
  apiTimeout: 30000,
  apiRetries: 3,

  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,

  features: {
    aiInsights: true,
    emailCampaigns: true,
    advancedAnalytics: true,
    customPricing: true,
    inventoryTracking: true,
  },

  performance: {
    cacheTTL: 300000, // 5 minutes
    requestTimeout: 30000,
    maxConnections: 5,
    compressionEnabled: false,
  },

  security: {
    csrfProtection: false,
    rateLimiting: false,
    rateLimitWindow: 60000,
    rateLimitMaxRequests: 100,
    corsEnabled: true,
    corsOrigins: ['http://localhost:3000', 'http://localhost:3001'],
  },

  logging: {
    level: 'debug',
    sentryEnabled: false,
    structuredLogging: true,
  },

  monitoring: {
    enabled: false,
    apmEnabled: false,
    metricsEnabled: false,
    healthCheckInterval: 60000,
  },

  services: {
    geminiApiKey: process.env.GEMINI_API_KEY,
    sendgridApiKey: process.env.SENDGRID_API_KEY,
  },

  fileUpload: {
    maxSize: 52428800, // 50MB
    allowedTypes: ['image/*', 'application/pdf', 'text/*'],
    storageBackend: 'supabase',
  },

  email: {
    enabled: true,
    provider: 'sendgrid',
    fromAddress: 'noreply@localhost',
    fromName: 'B2B Plus Dev',
  },

  database: {
    poolSize: 5,
    connectionTimeout: 5000,
    queryTimeout: 30000,
  },

  ui: {
    theme: 'auto',
    animationsEnabled: true,
    debugMode: true,
  },
};

/**
 * Staging Configuration
 */
const stagingConfig: EnvironmentConfig = {
  ...developmentConfig,
  env: 'staging',
  isDevelopment: false,
  isStaging: true,

  apiUrl: 'https://staging.b2bplus.com',
  apiTimeout: 30000,
  apiRetries: 2,

  features: {
    aiInsights: true,
    emailCampaigns: true,
    advancedAnalytics: true,
    customPricing: true,
    inventoryTracking: true,
  },

  performance: {
    cacheTTL: 600000, // 10 minutes
    requestTimeout: 30000,
    maxConnections: 10,
    compressionEnabled: true,
  },

  security: {
    csrfProtection: true,
    rateLimiting: true,
    rateLimitWindow: 60000,
    rateLimitMaxRequests: 1000,
    corsEnabled: true,
    corsOrigins: ['https://staging.b2bplus.com'],
  },

  logging: {
    level: 'info',
    sentryEnabled: true,
    sentryDSN: process.env.SENTRY_DSN,
    structuredLogging: true,
  },

  monitoring: {
    enabled: true,
    apmEnabled: true,
    metricsEnabled: true,
    healthCheckInterval: 300000,
  },

  fileUpload: {
    maxSize: 20971520, // 20MB
    allowedTypes: ['image/*', 'application/pdf'],
    storageBackend: 'supabase',
  },

  email: {
    enabled: true,
    provider: 'sendgrid',
    fromAddress: 'noreply@staging.b2bplus.com',
    fromName: 'B2B Plus Staging',
  },

  database: {
    poolSize: 10,
    connectionTimeout: 10000,
    queryTimeout: 30000,
  },

  ui: {
    theme: 'light',
    animationsEnabled: true,
    debugMode: false,
  },
};

/**
 * Production Configuration
 */
const productionConfig: EnvironmentConfig = {
  ...stagingConfig,
  env: 'production',
  isProduction: true,
  isStaging: false,

  apiUrl: 'https://b2bplus.com',
  apiTimeout: 30000,
  apiRetries: 1,

  features: {
    aiInsights: true,
    emailCampaigns: true,
    advancedAnalytics: true,
    customPricing: true,
    inventoryTracking: true,
  },

  performance: {
    cacheTTL: 3600000, // 1 hour
    requestTimeout: 30000,
    maxConnections: 20,
    compressionEnabled: true,
  },

  security: {
    csrfProtection: true,
    rateLimiting: true,
    rateLimitWindow: 60000,
    rateLimitMaxRequests: 5000,
    corsEnabled: true,
    corsOrigins: ['https://b2bplus.com', 'https://www.b2bplus.com'],
  },

  logging: {
    level: 'warn',
    sentryEnabled: true,
    sentryDSN: process.env.SENTRY_DSN,
    structuredLogging: true,
  },

  monitoring: {
    enabled: true,
    apmEnabled: true,
    metricsEnabled: true,
    healthCheckInterval: 600000,
  },

  fileUpload: {
    maxSize: 10485760, // 10MB
    allowedTypes: ['image/*', 'application/pdf'],
    storageBackend: 's3',
  },

  email: {
    enabled: true,
    provider: 'sendgrid',
    fromAddress: 'noreply@b2bplus.com',
    fromName: 'B2B Plus',
  },

  database: {
    poolSize: 20,
    connectionTimeout: 10000,
    queryTimeout: 30000,
  },

  ui: {
    theme: 'light',
    animationsEnabled: true,
    debugMode: false,
  },
};

/**
 * Get configuration for current environment
 */
export function getConfig(): EnvironmentConfig {
  const env = (process.env.NODE_ENV || 'development') as Environment;

  switch (env) {
    case 'production':
      return productionConfig;
    case 'staging':
      return stagingConfig;
    case 'development':
    default:
      return developmentConfig;
  }
}

/**
 * Validate configuration
 */
export function validateConfig(config: EnvironmentConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.supabaseUrl) {
    errors.push('SUPABASE_URL is required');
  }

  if (!config.supabaseAnonKey) {
    errors.push('SUPABASE_ANON_KEY is required');
  }

  if (config.isProduction && !config.supabaseServiceRoleKey) {
    errors.push('SUPABASE_SERVICE_ROLE_KEY is required in production');
  }

  if (config.logging.sentryEnabled && !config.logging.sentryDSN) {
    errors.push('SENTRY_DSN is required when Sentry is enabled');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Export singleton instance
export const config = getConfig();

