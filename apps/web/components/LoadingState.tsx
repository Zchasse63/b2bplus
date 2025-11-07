/**
 * Loading State Components
 *
 * Reusable loading indicators for different contexts
 * Improves UX by showing clear feedback during async operations
 */

import React from 'react';

// ============================================
// Full Page Loading
// ============================================

export function PageLoading({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-4 text-sm text-gray-600">{message}</p>
      </div>
    </div>
  );
}

// ============================================
// Section Loading
// ============================================

export function SectionLoading({ message = 'Loading...', className = '' }: { message?: string; className?: string }) {
  return (
    <div className={`flex min-h-[200px] items-center justify-center ${className}`}>
      <div className="text-center">
        <Spinner size="md" />
        <p className="mt-2 text-sm text-gray-600">{message}</p>
      </div>
    </div>
  );
}

// ============================================
// Inline Loading
// ============================================

export function InlineLoading({ message }: { message?: string }) {
  return (
    <div className="flex items-center gap-2">
      <Spinner size="sm" />
      {message && <span className="text-sm text-gray-600">{message}</span>}
    </div>
  );
}

// ============================================
// Button Loading State
// ============================================

export function ButtonLoading({ children, loading, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading: boolean }) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`relative ${props.className || ''}`}
    >
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner size="sm" color="currentColor" />
        </span>
      )}
      <span className={loading ? 'invisible' : ''}>
        {children}
      </span>
    </button>
  );
}

// ============================================
// Skeleton Loaders
// ============================================

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-gray-200 rounded animate-pulse"
          style={{ width: i === lines - 1 ? '75%' : '100%' }}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="h-6 bg-gray-200 rounded w-3/4 mb-4 animate-pulse" />
      <SkeletonText lines={3} />
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden border border-gray-200 rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-6 py-3">
                <div className="h-4 bg-gray-300 rounded animate-pulse" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr key={rowIdx}>
              {Array.from({ length: columns }).map((_, colIdx) => (
                <td key={colIdx} className="px-6 py-4">
                  <div className="h-4 bg-gray-200 rounded animate-pulse" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SkeletonList({ items = 5, className = '' }: { items?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg"
        >
          <div className="h-12 w-12 bg-gray-200 rounded-full animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
            <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// Base Spinner Component
// ============================================

export function Spinner({
  size = 'md',
  color = 'blue',
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  className?: string;
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  const colorClasses = {
    blue: 'text-blue-600',
    gray: 'text-gray-600',
    white: 'text-white',
    currentColor: 'text-current',
  };

  return (
    <svg
      className={`animate-spin ${sizeClasses[size]} ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-label="Loading"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// ============================================
// Progress Bar
// ============================================

export function ProgressBar({
  value,
  max = 100,
  label,
  showPercentage = true,
  className = '',
}: {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  className?: string;
}) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className={className}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
          {showPercentage && (
            <span className="text-sm text-gray-600">{Math.round(percentage)}%</span>
          )}
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className="bg-blue-600 h-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  );
}

// ============================================
// Empty State (not loading, but no data)
// ============================================

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
      {icon && <div className="mb-4 text-gray-400">{icon}</div>}
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-gray-600 max-w-md">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export default {
  PageLoading,
  SectionLoading,
  InlineLoading,
  ButtonLoading,
  SkeletonText,
  SkeletonCard,
  SkeletonTable,
  SkeletonList,
  Spinner,
  ProgressBar,
  EmptyState,
};
