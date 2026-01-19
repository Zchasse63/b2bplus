'use client';

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { slideDown, fast } from '@/lib/animations';
import { AlertCircle, CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

export interface AlertProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  description?: string;
  onClose?: () => void;
  dismissible?: boolean;
  icon?: React.ReactNode;
}

/**
 * Alert component based on B2B Plus Professional Palette
 * Displays contextual messages with variants for different states
 *
 * Variants:
 * - info: Blue background for informational messages
 * - success: Green background for success messages
 * - warning: Orange background for warning messages
 * - error: Red background for error messages
 */
export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      className,
      variant = 'info',
      title,
      description,
      onClose,
      dismissible = true,
      icon,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'rounded-lg p-4 flex gap-3 items-start';

    const variants = {
      info: 'bg-b2b-blue-50 border border-b2b-blue-200 text-b2b-blue-900',
      success: 'bg-b2b-green-50 border border-b2b-green-200 text-b2b-green-900',
      warning: 'bg-b2b-orange-50 border border-b2b-orange-200 text-b2b-orange-900',
      error: 'bg-red-50 border border-red-200 text-red-900',
    };

    const iconVariants = {
      info: <Info className="h-5 w-5 text-b2b-blue-600 flex-shrink-0 mt-0.5" />,
      success: <CheckCircle className="h-5 w-5 text-b2b-green-600 flex-shrink-0 mt-0.5" />,
      warning: <AlertTriangle className="h-5 w-5 text-b2b-orange-600 flex-shrink-0 mt-0.5" />,
      error: <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />,
    };

    return (
      <motion.div
        ref={ref}
        className={cn(baseStyles, variants[variant], className)}
        variants={slideDown}
        initial="hidden"
        animate="visible"
        exit="hidden"
        transition={fast}
        role="alert"
        {...props}
      >
        <div className="flex-shrink-0">
          {icon || iconVariants[variant]}
        </div>
        <div className="flex-1">
          {title && (
            <h3 className="font-semibold text-sm mb-1">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm opacity-90">
              {description}
            </p>
          )}
          {children && !description && (
            <div className="text-sm">
              {children as React.ReactNode}
            </div>
          )}
        </div>
        {dismissible && onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 text-current opacity-50 hover:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded"
            aria-label="Close alert"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </motion.div>
    );
  }
);

Alert.displayName = 'Alert';

