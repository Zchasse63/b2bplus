'use client';

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { rotate } from '@/lib/animations';

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref' | 'children'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  loading?: boolean;
  children?: React.ReactNode;
}

/**
 * Button component based on B2B Plus Professional Palette
 * Now with Framer Motion animations
 *
 * Variants:
 * - primary: Trust Blue background (primary brand color)
 * - secondary: Sage Green background (secondary brand color)
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
    const baseStyles = 'inline-flex items-center justify-center gap-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-b2b-blue-300';

    const variants = {
      primary: 'bg-b2b-blue text-white hover:bg-b2b-blue-600 shadow-b2b-sm focus-visible:ring-b2b-blue-300',
      secondary: 'bg-b2b-green text-white hover:bg-b2b-green-600 shadow-b2b-sm focus-visible:ring-b2b-green-300',
      outline: 'border-2 border-b2b-blue text-b2b-blue hover:bg-b2b-blue-50 focus-visible:ring-b2b-blue-300',
      ghost: 'text-b2b-text hover:bg-b2b-gray-50 focus-visible:ring-b2b-blue-300',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
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

