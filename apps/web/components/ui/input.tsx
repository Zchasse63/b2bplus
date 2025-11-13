'use client';

import React from 'react';
import { Input as B2BInput, InputProps as B2BInputProps } from '@/components/b2b/Input';

/**
 * Input component compatible with shadcn/ui API
 * Built on top of B2B design system Input
 */

export const Input = React.forwardRef<HTMLInputElement, B2BInputProps>(
  (props, ref) => <B2BInput ref={ref} {...props} />
);
Input.displayName = 'Input';
