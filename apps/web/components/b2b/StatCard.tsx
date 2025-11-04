import React from 'react';
import { cn } from '@/lib/utils';
import { Card } from './Card';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  iconBg?: string; // Custom background color for icon
  trend?: {
    value: number;
    isPositive: boolean;
  };
  change?: number; // Shorthand for trend (positive if > 0, negative if < 0)
  subtitle?: string;
  className?: string;
}

/**
 * StatCard component for dashboard metrics
 * Based on Figma "B2B This One" design system
 */
export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  iconBg,
  trend,
  change,
  subtitle,
  className,
}) => {
  // Convert 'change' prop to 'trend' format if provided
  const effectiveTrend = trend || (change !== undefined ? {
    value: Math.abs(change),
    isPositive: change >= 0,
  } : undefined);

  return (
    <Card className={cn('p-6', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-b2b-gray-500 mb-1">
            {title}
          </p>
          <p className="text-2xl font-bold text-b2b-dark mb-2">
            {value}
          </p>

          {effectiveTrend && (
            <div className="flex items-center gap-1">
              <span
                className={cn(
                  'text-sm font-medium',
                  effectiveTrend.isPositive ? 'text-b2b-green' : 'text-red-500'
                )}
              >
                {effectiveTrend.isPositive ? '↑' : '↓'} {Math.abs(effectiveTrend.value)}%
              </span>
              {subtitle && (
                <span className="text-sm text-b2b-gray-500">
                  {subtitle}
                </span>
              )}
            </div>
          )}

          {!effectiveTrend && subtitle && (
            <p className="text-sm text-b2b-gray-500">
              {subtitle}
            </p>
          )}
        </div>

        {icon && (
          <div
            className={cn(
              'flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center',
              iconBg || 'bg-b2b-yellow bg-opacity-10 text-b2b-yellow'
            )}
            style={iconBg ? { backgroundColor: iconBg } : undefined}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
};

StatCard.displayName = 'StatCard';

