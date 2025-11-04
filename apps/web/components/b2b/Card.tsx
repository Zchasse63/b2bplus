import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

/**
 * Card component based on Figma "B2B This One" design system
 * 
 * Variants:
 * - default: White background with subtle shadow
 * - bordered: White background with border
 * - elevated: White background with larger shadow
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = 'default',
      padding = 'md',
      hover = false,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'bg-white rounded-lg transition-all';
    
    const variants = {
      default: 'shadow-b2b',
      bordered: 'border border-b2b-gray-100',
      elevated: 'shadow-b2b-lg',
    };
    
    const paddings = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    };
    
    const hoverStyles = hover ? 'hover:shadow-b2b-lg hover:-translate-y-0.5 cursor-pointer' : '';
    
    return (
      <div
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          paddings[padding],
          hoverStyles,
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

