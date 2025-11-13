'use client';

import React from 'react';
import { Select as B2BSelect, SelectProps as B2BSelectProps, SelectOption } from '@/components/b2b/Select';
import { cn } from '@/lib/utils';

/**
 * Select component compatible with shadcn/ui API
 * Built on top of B2B design system Select
 */

export const Select = React.forwardRef<HTMLSelectElement, B2BSelectProps>(
  (props, ref) => <B2BSelect ref={ref} {...props} />
);
Select.displayName = 'Select';

// Compound components for shadcn compatibility
export const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.HTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      'flex h-10 w-full items-center justify-between rounded-md border border-b2b-gray-200 bg-white px-3 py-2 text-sm placeholder:text-b2b-gray-400 focus:outline-none focus:ring-2 focus:ring-b2b-blue-500 disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  />
));
SelectTrigger.displayName = 'SelectTrigger';

export const SelectValue = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span ref={ref} className={cn('', className)} {...props} />
));
SelectValue.displayName = 'SelectValue';

export const SelectContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'relative z-50 max-h-96 w-full overflow-y-auto rounded-md border border-b2b-gray-200 bg-white p-1 shadow-md',
      className
    )}
    {...props}
  />
));
SelectContent.displayName = 'SelectContent';

export const SelectItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value?: string }
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-b2b-gray-100 focus:bg-b2b-gray-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    {...props}
  />
));
SelectItem.displayName = 'SelectItem';
