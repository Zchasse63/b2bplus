'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  error?: string;
  helper?: string;
  required?: boolean;
}

/**
 * FormField component - standardizes form field layout
 * Combines label, input, helper text, and error message
 */
export const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  (
    {
      className,
      label,
      error,
      helper,
      required,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div ref={ref} className={cn('w-full space-y-1.5', className)} {...props}>
        {label && (
          <label className="block text-sm font-medium text-b2b-dark">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {children}
        </div>
        {error && (
          <p className="text-xs text-red-500 font-medium">{error}</p>
        )}
        {helper && !error && (
          <p className="text-xs text-b2b-gray-500">{helper}</p>
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';

export interface FieldGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: 1 | 2 | 3 | 4;
}

/**
 * FieldGroup component - groups multiple form fields
 * Provides consistent spacing and responsive grid layout
 */
export const FieldGroup = React.forwardRef<HTMLDivElement, FieldGroupProps>(
  (
    {
      className,
      columns = 1,
      children,
      ...props
    },
    ref
  ) => {
    const columnClasses = {
      1: 'grid-cols-1',
      2: 'grid-cols-1 md:grid-cols-2',
      3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'grid gap-4 sm:gap-6',
          columnClasses[columns],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

FieldGroup.displayName = 'FieldGroup';

