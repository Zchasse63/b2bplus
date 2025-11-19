'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface PageShellProps extends React.HTMLAttributes<HTMLDivElement> {
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  background?: 'white' | 'gray' | 'transparent';
}

/**
 * PageShell component - standardizes page layout
 * Provides consistent max-width, padding, and background across pages
 */
export const PageShell = React.forwardRef<HTMLDivElement, PageShellProps>(
  (
    {
      className,
      maxWidth = 'xl',
      padding = 'lg',
      background = 'white',
      children,
      ...props
    },
    ref
  ) => {
    const maxWidthClasses = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-4xl',
      '2xl': 'max-w-6xl',
      full: 'max-w-full',
    };

    const paddingClasses = {
      none: '',
      sm: 'px-4 py-4 sm:px-6 sm:py-6',
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

PageShell.displayName = 'PageShell';

