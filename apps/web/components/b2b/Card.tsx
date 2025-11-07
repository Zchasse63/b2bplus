'use client';

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { fadeIn, smooth } from '@/lib/animations';

export interface CardProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  variant?: 'default' | 'bordered' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

/**
 * Card component based on Figma "B2B This One" design system
 * Now with Framer Motion animations
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
    const baseStyles = 'bg-white rounded-lg';

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

    return (
      <motion.div
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          paddings[padding],
          hover && 'cursor-pointer',
          className
        )}
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        transition={smooth}
        whileHover={hover ? {
          y: -2,
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
        } : undefined}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';

