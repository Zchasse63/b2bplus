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
    requiresCustomerNotification?: boolean;
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
