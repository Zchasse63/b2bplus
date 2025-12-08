'use client';

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { rotate } from '@/lib/animations';

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref' | 'children'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  loading?: boolean;
  children?: React.ReactNode;
}

/**
 * Button component based on B2B Plus Professional Palette
 * Enhanced with Design System specifications:
 * - 5 size variants (xs, sm, md, lg, xl)
 * - 5 style variants (primary, secondary, outline, ghost, destructive)
 * - Proper focus rings and hover states
 * - Framer Motion animations with reduced-motion support
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
    const baseStyles = 'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 btn-press';

    const variants = {
      primary: 'bg-b2b-blue text-white hover:bg-b2b-blue-600 shadow-b2b-sm focus-visible:ring-b2b-blue-300',
      secondary: 'bg-b2b-green text-white hover:bg-b2b-green-600 shadow-b2b-sm focus-visible:ring-b2b-green-300',
      outline: 'border-2 border-b2b-blue text-b2b-blue hover:bg-b2b-blue-50 focus-visible:ring-b2b-blue-300',
      ghost: 'text-b2b-text hover:bg-b2b-gray-100 focus-visible:ring-b2b-blue-300',
      destructive: 'bg-b2b-error text-white hover:bg-red-600 shadow-b2b-sm focus-visible:ring-red-300',
    };

    // Design System Button Sizes
    // xs: 28px height, 12px padding, 12px font
    // sm: 32px height, 14px padding, 14px font
    // md: 40px height, 16px padding, 14px font
    // lg: 48px height, 24px padding, 16px font
    // xl: 56px height, 32px padding, 18px font
    const sizes = {
      xs: 'h-7 px-3 text-xs',
      sm: 'h-8 px-3.5 text-sm',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
      xl: 'h-14 px-8 text-lg',
    };

    return (
      <motion.button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className
        )}
        disabled={disabled || loading}
        whileHover={typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? {} : { scale: 1.02 }}
        whileTap={typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? {} : { scale: 0.98 }}
        transition={{ duration: 0.15 }}
        {...props}
      >
        {loading && (
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            ⏳
          </motion.span>
        )}
        {!loading && icon && iconPosition === 'left' && <span className="flex-shrink-0">{icon}</span>}
        {children}
        {!loading && icon && iconPosition === 'right' && <span className="flex-shrink-0">{icon}</span>}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

