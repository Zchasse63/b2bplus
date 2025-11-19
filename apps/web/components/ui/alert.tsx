'use client';

import React from 'react';
import { Alert as B2BAlert, AlertProps as B2BAlertProps } from '@/components/b2b/Alert';

/**
 * Alert component compatible with shadcn/ui API
 * Built on top of B2B design system Alert
 */

export const Alert = React.forwardRef<HTMLDivElement, B2BAlertProps>(
  (props, ref) => <B2BAlert ref={ref} {...props} />
);
Alert.displayName = 'Alert';

