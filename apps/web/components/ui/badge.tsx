'use client';

import React from 'react';
import { Badge as B2BBadge, BadgeProps as B2BBadgeProps } from '@/components/b2b/Badge';

/**
 * Badge component compatible with shadcn/ui API
 * Built on top of B2B design system Badge
 */

export const Badge = React.forwardRef<HTMLDivElement, B2BBadgeProps>(
  (props, ref) => <B2BBadge ref={ref} {...props} />
);
Badge.displayName = 'Badge';
