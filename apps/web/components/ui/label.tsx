'use client';

import React from 'react';
import { Label as B2BLabel, LabelProps as B2BLabelProps } from '@/components/b2b/Label';

/**
 * Label component compatible with shadcn/ui API
 * Built on top of B2B design system Label
 */

export const Label = React.forwardRef<HTMLLabelElement, B2BLabelProps>(
  (props, ref) => <B2BLabel ref={ref} {...props} />
);
Label.displayName = 'Label';
