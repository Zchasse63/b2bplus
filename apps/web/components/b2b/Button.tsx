import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  loading?: boolean; // Loading state - disables button and shows loading indicator
}

/**
 * Button component based on Figma "B2B This One" design system
 * 
 * Variants:
 * - primary: Yellow background (accent color)
 * - secondary: Dark background
 * - outline: Transparent with border
 * - ghost: Transparent, no border
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      icon,
      iconPosition = 'right',
      fullWidth,
      loading,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';
    
    const variants = {
      primary: 'bg-b2b-yellow text-b2b-dark hover:bg-opacity-90 shadow-b2b-sm hover:shadow-b2b',
      secondary: 'bg-b2b-dark text-b2b-white hover:bg-opacity-90 shadow-b2b-sm hover:shadow-b2b',
      outline: 'border-2 border-b2b-gray-300 text-b2b-dark hover:bg-b2b-gray-50',
      ghost: 'text-b2b-dark hover:bg-b2b-gray-50',
    };
    
    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };
    
    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <span className="animate-spin">⏳</span>}
        {!loading && icon && iconPosition === 'left' && <span className="flex-shrink-0">{icon}</span>}
        {children}
        {!loading && icon && iconPosition === 'right' && <span className="flex-shrink-0">{icon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

