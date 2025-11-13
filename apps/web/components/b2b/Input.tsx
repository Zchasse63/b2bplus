'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { shake, slideDown, fast } from '@/lib/animations';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

/**
 * Input component based on Figma "B2B This One" design system
 * Now with Framer Motion focus and error animations
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      error,
      icon,
      iconPosition = 'left',
      disabled,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-b2b-dark mb-1.5">
            {label}
          </label>
        )}
        <motion.div
          className="relative"
          animate={error ? "animate" : "initial"}
          variants={shake}
        >
          {icon && iconPosition === 'left' && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-b2b-gray-500">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            type={type}
            className={cn(
              'w-full rounded-lg border border-b2b-gray-300 bg-white px-4 py-2.5 text-b2b-dark placeholder:text-b2b-gray-500',
              'focus:outline-none focus:ring-2 focus:ring-b2b-yellow focus:border-transparent',
              'disabled:bg-b2b-gray-50 disabled:cursor-not-allowed disabled:text-b2b-gray-500',
              error && 'border-red-500 focus:ring-red-500',
              icon && iconPosition === 'left' && 'pl-10',
              icon && iconPosition === 'right' && 'pr-10',
              className
            )}
            disabled={disabled}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...props}
          />
          {icon && iconPosition === 'right' && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-b2b-gray-500">
              {icon}
            </div>
          )}
        </motion.div>
        <AnimatePresence>
          {error && (
            <motion.p
              className="mt-1.5 text-sm text-red-500"
              variants={slideDown}
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={fast}
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

Input.displayName = 'Input';

