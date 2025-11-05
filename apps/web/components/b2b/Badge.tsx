import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Badge component based on B2B Plus Professional Palette
 */
export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-full';

    const variants = {
      default: 'bg-b2b-gray-100 text-b2b-text',
      success: 'bg-b2b-green-50 text-b2b-green-700 border border-b2b-green-200',
      warning: 'bg-b2b-orange-50 text-b2b-orange-700 border border-b2b-orange-200',
      error: 'bg-red-50 text-b2b-error border border-red-200',
      info: 'bg-b2b-blue-50 text-b2b-blue-700 border border-b2b-blue-200',
    };
    
    const sizes = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-sm',
      lg: 'px-3 py-1.5 text-base',
    };
    
    return (
      <span
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

