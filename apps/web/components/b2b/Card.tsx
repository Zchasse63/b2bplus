'use client';

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { fadeIn, smooth } from '@/lib/animations';

export interface CardProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  variant?: 'default' | 'bordered' | 'elevated' | 'outline';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hover?: boolean;
  clickable?: boolean;
}

/**
 * Card component following Design System specifications
 * 
 * Variants:
 * - default: White background with subtle shadow
 * - bordered: White background with border
 * - elevated: White background with larger shadow
 * - outline: Transparent with just border (for secondary content)
 * 
 * Features:
 * - Optional hover lift effect (hover prop)
 * - Multiple padding options
 * - Framer Motion entrance animation
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = 'default',
      padding = 'md',
      hover = false,
      clickable = false,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'bg-white rounded-xl overflow-hidden';

    const variants = {
      default: 'shadow-b2b',
      bordered: 'border border-b2b-gray-200',
      elevated: 'shadow-b2b-lg',
      outline: 'border border-b2b-gray-100 bg-transparent',
    };

    // Design System padding: sm=16px, md=24px, lg=32px, xl=40px
    const paddings = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
      xl: 'p-10',
    };

    return (
      <motion.div
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          paddings[padding],
          (hover || clickable) && 'cursor-pointer card-hoverable',
          className
        )}
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        transition={smooth}
        whileHover={(hover || clickable) ? {
          y: -4,
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

