import React from 'react';
import { cn } from '@/lib/utils';

export interface IconProps extends React.SVGAttributes<SVGElement> {
  icon: React.ComponentType<{ className?: string }>;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Icon wrapper component for Feather Icons (react-icons/fi)
 * Based on Figma "B2B This One" design system
 * 
 * Usage:
 * import { FiSearch } from 'react-icons/fi';
 * <Icon icon={FiSearch} size="md" />
 */
export const Icon: React.FC<IconProps> = ({
  icon: IconComponent,
  size = 'md',
  className,
  ...props
}) => {
  const sizes = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  };
  
  return (
    <IconComponent
      className={cn(sizes[size], className)}
      {...props}
    />
  );
};

Icon.displayName = 'Icon';

