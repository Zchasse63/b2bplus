'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Card } from './Card';
import { staggerContainer, staggerItem } from '@/lib/animations';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  responsive?: boolean;
}

/**
 * DataTable component based on Figma "B2B This One" design system
 * Now with Framer Motion stagger animations
 *
 * Features:
 * - Responsive: Card-based on mobile, table on desktop
 * - Loading states with Framer Motion spinner
 * - Empty states
 * - Row click handlers
 * - Stagger animation for rows
 */
export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  loading = false,
  emptyMessage = 'No data available',
  className,
  responsive = true,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <Card className={cn('p-8', className)}>
        <div className="flex items-center justify-center">
          <motion.div
            className="rounded-full h-8 w-8 border-b-2 border-b2b-yellow"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <span className="ml-3 text-b2b-gray-500">Loading...</span>
        </div>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className={cn('p-8', className)}>
        <div className="text-center text-b2b-gray-500">
          {emptyMessage}
        </div>
      </Card>
    );
  }

  // Mobile: Card-based layout with stagger animation
  const MobileView = () => (
    <motion.div
      className={cn('space-y-3 md:hidden', className)}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {data.map((item, index) => (
        <motion.div key={index} variants={staggerItem}>
          <Card
            padding="md"
            hover={!!onRowClick}
            onClick={() => onRowClick?.(item)}
            className="space-y-2"
          >
            {columns.map((column) => (
              <div key={column.key} className="flex justify-between items-start">
                <span className="text-sm font-medium text-b2b-gray-500">
                  {column.header}:
                </span>
                <span className="text-sm text-b2b-dark text-right ml-2">
                  {column.render ? column.render(item) : item[column.key]}
                </span>
              </div>
            ))}
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );

  // Desktop: Traditional table
  // Note: Stagger animations disabled for DataTable to improve E2E test reliability
  // Table rows need to be immediately visible for Playwright tests
  const DesktopView = () => (
    <Card padding="none" className={cn('overflow-hidden hidden md:block', className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-b2b-gray-50 border-b border-b2b-gray-100">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'px-6 py-3 text-left text-xs font-medium text-b2b-gray-500 uppercase tracking-wider',
                    column.className
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-b2b-gray-100">
            {data.map((item, index) => (
              <motion.tr
                key={index}
                onClick={() => onRowClick?.(item)}
                className={cn(
                  onRowClick && 'cursor-pointer hover:bg-b2b-gray-50'
                )}
                whileHover={onRowClick ? { backgroundColor: 'rgba(0, 0, 0, 0.02)' } : undefined}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'px-6 py-4 whitespace-nowrap text-sm text-b2b-dark',
                      column.className
                    )}
                  >
                    {column.render ? column.render(item) : item[column.key]}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );

  if (!responsive) {
    return <DesktopView />;
  }

  return (
    <>
      <MobileView />
      <DesktopView />
    </>
  );
}

DataTable.displayName = 'DataTable';

