'use client';

import React from 'react';
import { Button as B2BButton, ButtonProps as B2BButtonProps } from '@/components/b2b/Button';

/**
 * Button component compatible with shadcn/ui API
 * Built on top of B2B design system Button
 */

export const Button = React.forwardRef<HTMLButtonElement, B2BButtonProps>(
  (props, ref) => <B2BButton ref={ref} {...props} />
);
Button.displayName = 'Button';
