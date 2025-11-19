'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface DashboardShellProps extends React.HTMLAttributes<HTMLDivElement> {
  maxWidth?: 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'md' | 'lg';
  background?: 'white' | 'gray' | 'transparent';
}

/**
 * DashboardShell component - standardizes dashboard page layout
 * Similar to PageShell but optimized for dashboard/admin layouts
 * Provides consistent max-width, padding, and background
 */
export const DashboardShell = React.forwardRef<HTMLDivElement, DashboardShellProps>(
  (
    {
      className,
      maxWidth = '2xl',
      padding = 'lg',
      background = 'gray',
      children,
      ...props
    },
    ref
  ) => {
    const maxWidthClasses = {
      lg: 'max-w-lg',
      xl: 'max-w-4xl',
      '2xl': 'max-w-6xl',
      full: 'max-w-full',
    };

    const paddingClasses = {
      md: 'px-4 py-6 sm:px-6 sm:py-8',
      lg: 'px-4 py-8 sm:px-6 sm:py-12',
    };

    const backgroundClasses = {
      white: 'bg-white',
      gray: 'bg-b2b-gray-50',
      transparent: 'bg-transparent',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'mx-auto w-full',
          maxWidthClasses[maxWidth],
          paddingClasses[padding],
          backgroundClasses[background],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

DashboardShell.displayName = 'DashboardShell';

