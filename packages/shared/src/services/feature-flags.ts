/**
 * Feature Flags System
 * Runtime feature toggle management with user/org targeting
 * TASK-035: Implement Feature Flags
 */

export type FeatureFlagType = 'boolean' | 'percentage' | 'user' | 'organization';

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  type: FeatureFlagType;
  value?: any;
  rolloutPercentage?: number; // 0-100
  targetUsers?: string[]; // User IDs
  targetOrganizations?: string[]; // Org IDs
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  environment: 'development' | 'staging' | 'production';
}

export interface FeatureFlagContext {
  userId?: string;
  organizationId?: string;
  email?: string;
  isPremium?: boolean;
  isAdmin?: boolean;
  customAttributes?: Record<string, any>;
}

/**
 * Feature Flags Registry
 * Define all feature flags here
 */
export const FEATURE_FLAGS: Record<string, Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt'>> = {
  'email-verification': {
    name: 'Email Verification',
    description: 'Require email verification on signup',
    enabled: true,
    type: 'boolean',
    value: true,
    environment: 'production',
  },
  'real-time-cart': {
    name: 'Real-time Cart Updates',
    description: 'Enable real-time cart synchronization',
    enabled: true,
    type: 'boolean',
    value: true,
    environment: 'production',
  },
  'new-checkout-flow': {
    name: 'New Checkout Flow',
    description: 'Enable new checkout UI/UX',
    enabled: false,
    type: 'percentage',
    rolloutPercentage: 10, // 10% of users
    environment: 'production',
  },
  'ai-recommendations': {
    name: 'AI Product Recommendations',
    description: 'Show AI-powered product recommendations',
    enabled: true,
    type: 'boolean',
    value: true,
    environment: 'production',
  },
  'advanced-analytics': {
    name: 'Advanced Analytics',
    description: 'Enable advanced analytics for organizations',
    enabled: false,
    type: 'organization',
    targetOrganizations: [], // Set by admin
    environment: 'production',
  },
  'dark-mode': {
    name: 'Dark Mode',
    description: 'Enable dark mode UI',
    enabled: true,
    type: 'boolean',
    value: true,
    environment: 'production',
  },
  'beta-features': {
    name: 'Beta Features',
    description: 'Enable experimental beta features',
    enabled: false,
    type: 'user',
    targetUsers: [], // Set by admin
    environment: 'staging',
  },
};

/**
 * In-memory feature flag store
 */
let featureFlags: Map<string, FeatureFlag> = new Map();

/**
 * Initialize feature flags
 */
export function initializeFeatureFlags(flags?: Record<string, FeatureFlag>): void {
  featureFlags.clear();

  if (flags) {
    Object.entries(flags).forEach(([key, flag]) => {
      featureFlags.set(flag.id || key, flag);
    });
  } else {
    // Initialize from registry
    Object.entries(FEATURE_FLAGS).forEach(([key, flagData]) => {
      const flag: FeatureFlag = {
        id: key,
        ...flagData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      featureFlags.set(key, flag);
    });
  }
}

/**
 * Get all feature flags
 */
export function getAllFeatureFlags(): FeatureFlag[] {
  return Array.from(featureFlags.values());
}

/**
 * Get feature flag by ID
 */
export function getFeatureFlag(id: string): FeatureFlag | null {
  return featureFlags.get(id) || null;
}

/**
 * Hash-based user bucketing for percentage rollouts
 * Ensures consistent experience across requests
 */
function hashUserId(userId: string, flagId: string): number {
  let hash = 0;
  const input = `${userId}-${flagId}`;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash) % 100;
}

/**
 * Check if feature flag is enabled for context
 */
export function isFeatureFlagEnabled(
  flagId: string,
  context?: FeatureFlagContext
): boolean {
  const flag = getFeatureFlag(flagId);

  if (!flag) {
    console.warn(`Feature flag '${flagId}' not found`);
    return false;
  }

  // Check if flag is globally enabled
  if (!flag.enabled) {
    return false;
  }

  // Environment check (for development, always return true for non-prod flags)
  if (process.env.NODE_ENV !== 'production' && flag.environment !== 'production') {
    return true;
  }

  // No context provided, use flag value
  if (!context) {
    return flag.value === true;
  }

  // Type-specific logic
  switch (flag.type) {
    case 'boolean':
      return flag.value === true;

    case 'percentage': {
      if (!context.userId) return false;
      const bucket = hashUserId(context.userId, flagId);
      return bucket < (flag.rolloutPercentage || 0);
    }

    case 'user':
      if (!context.userId) return false;
      return flag.targetUsers?.includes(context.userId) || false;

    case 'organization':
      if (!context.organizationId) return false;
      return flag.targetOrganizations?.includes(context.organizationId) || false;

    default:
      return false;
  }
}

/**
 * Update feature flag
 */
export function updateFeatureFlag(
  id: string,
  updates: Partial<FeatureFlag>
): FeatureFlag | null {
  const flag = getFeatureFlag(id);

  if (!flag) {
    return null;
  }

  const updated: FeatureFlag = {
    ...flag,
    ...updates,
    id: flag.id, // Prevent ID changes
    createdAt: flag.createdAt, // Prevent creation date changes
    updatedAt: new Date().toISOString(),
  };

  featureFlags.set(id, updated);
  return updated;
}

/**
 * Create new feature flag
 */
export function createFeatureFlag(flag: Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt'>): FeatureFlag {
  const newFlag: FeatureFlag = {
    ...flag,
    id: `flag-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  featureFlags.set(newFlag.id, newFlag);
  return newFlag;
}

/**
 * Delete feature flag
 */
export function deleteFeatureFlag(id: string): boolean {
  return featureFlags.delete(id);
}

/**
 * Add user to feature flag (for 'user' type flags)
 */
export function addUserToFeatureFlag(flagId: string, userId: string): FeatureFlag | null {
  const flag = getFeatureFlag(flagId);

  if (!flag || flag.type !== 'user') {
    return null;
  }

  if (!flag.targetUsers) {
    flag.targetUsers = [];
  }

  if (!flag.targetUsers.includes(userId)) {
    flag.targetUsers.push(userId);
    flag.updatedAt = new Date().toISOString();
    featureFlags.set(flagId, flag);
  }

  return flag;
}

/**
 * Remove user from feature flag
 */
export function removeUserFromFeatureFlag(flagId: string, userId: string): FeatureFlag | null {
  const flag = getFeatureFlag(flagId);

  if (!flag || flag.type !== 'user' || !flag.targetUsers) {
    return null;
  }

  const index = flag.targetUsers.indexOf(userId);
  if (index > -1) {
    flag.targetUsers.splice(index, 1);
    flag.updatedAt = new Date().toISOString();
    featureFlags.set(flagId, flag);
  }

  return flag;
}

/**
 * Add organization to feature flag (for 'organization' type flags)
 */
export function addOrganizationToFeatureFlag(
  flagId: string,
  organizationId: string
): FeatureFlag | null {
  const flag = getFeatureFlag(flagId);

  if (!flag || flag.type !== 'organization') {
    return null;
  }

  if (!flag.targetOrganizations) {
    flag.targetOrganizations = [];
  }

  if (!flag.targetOrganizations.includes(organizationId)) {
    flag.targetOrganizations.push(organizationId);
    flag.updatedAt = new Date().toISOString();
    featureFlags.set(flagId, flag);
  }

  return flag;
}

/**
 * Remove organization from feature flag
 */
export function removeOrganizationFromFeatureFlag(
  flagId: string,
  organizationId: string
): FeatureFlag | null {
  const flag = getFeatureFlag(flagId);

  if (!flag || flag.type !== 'organization' || !flag.targetOrganizations) {
    return null;
  }

  const index = flag.targetOrganizations.indexOf(organizationId);
  if (index > -1) {
    flag.targetOrganizations.splice(index, 1);
    flag.updatedAt = new Date().toISOString();
    featureFlags.set(flagId, flag);
  }

  return flag;
}

/**
 * Get feature flag usage stats
 */
export function getFeatureFlagStats(flagId: string): {
  flagId: string;
  enabled: boolean;
  type: FeatureFlagType;
  targetUsers: number;
  targetOrganizations: number;
  estimatedUsage: string;
} | null {
  const flag = getFeatureFlag(flagId);

  if (!flag) {
    return null;
  }

  let estimatedUsage = 'unknown';
  if (flag.type === 'percentage') {
    estimatedUsage = `${flag.rolloutPercentage}% of users`;
  } else if (flag.type === 'user') {
    estimatedUsage = `${flag.targetUsers?.length || 0} users`;
  } else if (flag.type === 'organization') {
    estimatedUsage = `${flag.targetOrganizations?.length || 0} organizations`;
  } else if (flag.type === 'boolean') {
    estimatedUsage = flag.enabled ? 'all users' : 'no users';
  }

  return {
    flagId,
    enabled: flag.enabled,
    type: flag.type,
    targetUsers: flag.targetUsers?.length || 0,
    targetOrganizations: flag.targetOrganizations?.length || 0,
    estimatedUsage,
  };
}

// Initialize on import
if (typeof window === 'undefined' || process.env.NODE_ENV === 'development') {
  initializeFeatureFlags();
}

export default {
  initializeFeatureFlags,
  getAllFeatureFlags,
  getFeatureFlag,
  isFeatureFlagEnabled,
  updateFeatureFlag,
  createFeatureFlag,
  deleteFeatureFlag,
  addUserToFeatureFlag,
  removeUserFromFeatureFlag,
  addOrganizationToFeatureFlag,
  removeOrganizationFromFeatureFlag,
  getFeatureFlagStats,
};
