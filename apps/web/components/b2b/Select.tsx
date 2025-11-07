'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { slideDown, fast } from '@/lib/animations';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
}

/**
 * Select component based on Figma "B2B This One" design system
 * Now with Framer Motion animations
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      error,
      options,
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
        <motion.select
          ref={ref}
          className={cn(
            'w-full rounded-lg border border-b2b-gray-300 bg-white px-4 py-2.5 text-b2b-dark',
            'focus:outline-none focus:ring-2 focus:ring-b2b-yellow focus:border-transparent',
            'disabled:bg-b2b-gray-50 disabled:cursor-not-allowed disabled:text-b2b-gray-500',
            error && 'border-red-500 focus:ring-red-500',
            className
          )}
          disabled={disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          animate={{
            scale: isFocused ? 1.01 : 1,
          }}
          transition={fast}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </motion.select>
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

Select.displayName = 'Select';

