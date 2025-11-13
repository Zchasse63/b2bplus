import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@b2b-plus/shared/utils/logger';
import crypto from 'crypto';

const VERIFICATION_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
const RESEND_RATE_LIMIT = 60 * 1000; // 1 minute between resends

/**
 * POST /api/auth/send-verification-email
 * Sends an email verification token to the user
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // Validate input
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Check if user already verified
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('email_verified_at')
      .eq('email', email)
      .single();

    if (existingUser?.email_verified_at) {
      return NextResponse.json(
        { error: 'Email already verified' },
        { status: 400 }
      );
    }

    // Check rate limiting - can't send more than 3 emails per 24 hours
    const { data: recentTokens } = await supabase
      .from('email_verification_tokens')
      .select('created_at')
      .eq('email', email)
      .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (recentTokens && recentTokens.length >= 3) {
      logger.warn('Email verification rate limit exceeded', { email });
      return NextResponse.json(
        { error: 'Too many verification attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Store token in database
    const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY);

    const { error: tokenError } = await supabase
      .from('email_verification_tokens')
      .insert({
        email,
        token,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
      });

    if (tokenError) {
      logger.error('Failed to create verification token', tokenError as Error, {
        email,
      });
      return NextResponse.json(
        { error: 'Failed to send verification email' },
        { status: 500 }
      );
    }

    // Log verification attempt
    await supabase
      .from('email_verification_audit')
      .insert({
        email,
        action: 'sent',
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      });

    logger.info('Verification email sent successfully', {
      email,
      tokenExpiry: expiresAt,
    });

    return NextResponse.json({
      success: true,
      message: 'Verification email sent. Please check your inbox.',
    });

  } catch (error) {
    logger.error('Send verification email error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

<file_path>
b2b-plus/apps/web/src/app/api/auth/verify-email/route.ts
</file_path>

<edit_description>
Create API endpoint for email verification verification
</edit_description>

```
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@b2b-plus/shared/utils/logger';
import crypto from 'crypto';

/**
 * POST /api/auth/verify-email
 * Verifies an email using a verification token
 */
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Hash the token
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find and verify token
    const { data: tokenRecord } = await supabase
      .from('email_verification_tokens')
      .select('*')
      .eq('token_hash', tokenHash)
      .single();

    if (!tokenRecord) {
      logger.warn('Verification token not found', { tokenHash: tokenHash.substring(0, 8) });
      await supabase
        .from('email_verification_audit')
        .insert({
          email: 'unknown',
          action: 'failed',
          reason: 'Token not found',
          ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        });

      return NextResponse.json(
        { error: 'Invalid verification token' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (new Date(tokenRecord.expires_at) < new Date()) {
      logger.warn('Verification token expired', {
        email: tokenRecord.email,
        expiresAt: tokenRecord.expires_at,
      });
      await supabase
        .from('email_verification_audit')
        .insert({
          email: tokenRecord.email,
          action: 'expired',
          reason: 'Token expired',
          ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        });

      return NextResponse.json(
        { error: 'Verification token has expired' },
        { status: 400 }
      );
    }

    // Check if already verified
    if (tokenRecord.verified_at) {
      logger.warn('Token already used', { email: tokenRecord.email });
      return NextResponse.json(
        { error: 'Token already used' },
        { status: 400 }
      );
    }

    // Mark token as verified
    const { error: updateError } = await supabase
      .from('email_verification_tokens')
      .update({
        verified_at: new Date().toISOString(),
        used_at: new Date().toISOString(),
      })
      .eq('id', tokenRecord.id);

    if (updateError) {
      logger.error('Failed to mark token as verified', updateError as Error);
      return NextResponse.json(
        { error: 'Verification failed' },
        { status: 500 }
      );
    }

    // Update user profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        email_verified_at: new Date().toISOString(),
      })
      .eq('email', tokenRecord.email);

    if (profileError) {
      logger.error('Failed to update user profile', profileError as Error, {
        email: tokenRecord.email,
      });
    }

    // Log successful verification
    await supabase
      .from('email_verification_audit')
      .insert({
        email: tokenRecord.email,
        action: 'verified',
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      });

    logger.info('Email verified successfully', {
      email: tokenRecord.email,
    });

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
      email: tokenRecord.email,
    });

  } catch (error) {
    logger.error('Verify email error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

<file_path>
b2b-plus/apps/web/src/hooks/useToast.ts
</file_path>

<edit_description>
Create toast hook with auto-dismiss based on type
</edit_description>

```
import { useCallback } from 'react';
import { TOAST_CONFIG, type ToastType } from '@b2b-plus/shared/constants/toast-config';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

type ToastContextType = {
  toasts: Toast[];
  addToast: (message: string, type: ToastType, duration?: number) => string;
  removeToast: (id: string) => void;
};

/**
 * Hook for managing toast notifications
 * Auto-dismisses based on toast type
 */
export function useToast() {
  // This would typically be used with a Toast context or state management
  // For now, providing the interface

  const addToast = useCallback(
    (message: string, type: ToastType = 'info', duration?: number) => {
      const id = Math.random().toString(36).substring(7);
      const config = TOAST_CONFIG[type];
      const finalDuration = duration ?? config.duration;

      // Dispatch toast addition event
      const event = new CustomEvent('toast:add', {
        detail: { id, message, type, duration: finalDuration },
      });
      window.dispatchEvent(event);

      // Auto-dismiss if duration > 0
      if (finalDuration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, finalDuration);
      }

      return id;
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    const event = new CustomEvent('toast:remove', {
      detail: { id },
    });
    window.dispatchEvent(event);
  }, []);

  return {
    success: (message: string, duration?: number) =>
      addToast(message, 'success', duration),
    error: (message: string, duration?: number) =>
      addToast(message, 'error', duration),
    warning: (message: string, duration?: number) =>
      addToast(message, 'warning', duration),
    info: (message: string, duration?: number) =>
      addToast(message, 'info', duration),
    removeToast,
  };
}
```

<file_path>
b2b-plus/packages/shared/src/utils/cache-keys.ts
</file_path>

<edit_description>
Create cache key generator for consistent key naming
</edit_description>

```
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

export type CacheKey = ReturnType<typeof cacheKeys[keyof typeof cacheKeys]>;
```

<file_path>
b2b-plus/packages/shared/src/utils/order-status-machine.ts
</file_path>

<edit_description>
Create order status state machine for validation
</edit_description>

```
/**
 * Order Status State Machine
 * Defines valid order status transitions and enforces business rules
 */

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'held'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'failed';

interface StateTransition {
  from: OrderStatus;
  to: OrderStatus;
  requiresReason?: boolean;
  requiresAdminPermission?: boolean;
  requiresCustomerNotification?: boolean;
}

const VALID_TRANSITIONS: StateTransition[] = [
  // Pending transitions
  { from: 'pending', to: 'confirmed' },
  { from: 'pending', to: 'cancelled', requiresReason: true },
  { from: 'pending', to: 'failed', requiresReason: true },

  // Confirmed transitions
  { from: 'confirmed', to: 'processing' },
  { from: 'confirmed', to: 'cancelled', requiresReason: true },
  { from: 'confirmed', to: 'held', requiresReason: true },

  // Processing transitions
  { from: 'processing', to: 'shipped' },
  { from: 'processing', to: 'held', requiresReason: true },
  { from: 'processing', to: 'cancelled', requiresReason: true },
  { from: 'processing', to: 'failed', requiresReason: true },

  // Held transitions
  { from: 'held', to: 'processing' },
  { from: 'held', to: 'cancelled', requiresReason: true },

  // Shipped transitions
  { from: 'shipped', to: 'delivered' },
  { from: 'shipped', to: 'failed', requiresReason: true },

  // Delivered transitions
  { from: 'delivered', to: 'completed' },

  // Failed transitions
  { from: 'failed', to: 'pending', requiresAdminPermission: true },

  // Refund transitions (from any non-completed, non-refunded status)
  { from: 'pending', to: 'refunded', requiresReason: true },
  { from: 'confirmed', to: 'refunded', requiresReason: true },
  { from: 'processing', to: 'refunded', requiresReason: true },
  { from: 'shipped', to: 'refunded', requiresReason: true },
  { from: 'delivered', to: 'refunded', requiresReason: true },
  { from: 'failed', to: 'refunded', requiresReason: true },
];

export interface TransitionValidation {
  isValid: boolean;
  reason?: string;
  requiresReason?: boolean;
  requiresAdminPermission?: boolean;
}

/**
 * Validate if a status transition is allowed
 */
export function validateTransition(
  currentStatus: OrderStatus,
  targetStatus: OrderStatus,
  isAdmin: boolean = false
): TransitionValidation {
  // Can't transition to same status
  if (currentStatus === targetStatus) {
    return {
      isValid: false,
      reason: 'Cannot transition to the same status',
    };
  }

  // Find matching transition
  const transition = VALID_TRANSITIONS.find(
    (t) => t.from === currentStatus && t.to === targetStatus
  );

  if (!transition) {
    return {
      isValid: false,
      reason: `Cannot transition from ${currentStatus} to ${targetStatus}`,
    };
  }

  // Check admin permission requirement
  if (transition.requiresAdminPermission && !isAdmin) {
    return {
      isValid: false,
      reason: 'This transition requires admin permission',
      requiresAdminPermission: true,
    };
  }

  return {
    isValid: true,
    requiresReason: transition.requiresReason,
    requiresAdminPermission: transition.requiresAdminPermission,
  };
}

/**
 * Get all valid next statuses for current status
 */
export function getValidNextStatuses(currentStatus: OrderStatus): OrderStatus[] {
  return VALID_TRANSITIONS
    .filter((t) => t.from === currentStatus)
    .map((t) => t.to);
}

/**
 * Check if a transition requires a reason
 */
export function transitionRequiresReason(
  currentStatus: OrderStatus,
  targetStatus: OrderStatus
): boolean {
  const transition = VALID_TRANSITIONS.find(
    (t) => t.from === currentStatus && t.to === targetStatus
  );
  return transition?.requiresReason ?? false;
}

/**
 * Get the display name for an order status
 */
export function getStatusDisplayName(status: OrderStatus): string {
  const names: Record<OrderStatus, string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    processing: 'Processing',
    held: 'On Hold',
    shipped: 'Shipped',
    delivered: 'Delivered',
    completed: 'Completed',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
    failed: 'Failed',
  };
  return names[status] || status;
}

/**
 * Get the badge color for an order status
 */
export function getStatusBadgeColor(
  status: OrderStatus
): 'gray' | 'yellow' | 'blue' | 'green' | 'red' {
  const colors: Record<OrderStatus, 'gray' | 'yellow' | 'blue' | 'green' | 'red'> = {
    pending: 'gray',
    confirmed: 'blue',
    processing: 'blue',
    held: 'yellow',
    shipped: 'blue',
    delivered: 'green',
    completed: 'green',
    cancelled: 'red',
    refunded: 'red',
    failed: 'red',
  };
  return colors[status] || 'gray';
}
