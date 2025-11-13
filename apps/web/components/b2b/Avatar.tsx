import React from 'react';
import { cn } from '@/lib/utils';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Avatar component based on Figma "B2B This One" design system
 */
export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      className,
      src,
      alt = 'Avatar',
      fallback,
      size = 'md',
      ...props
    },
    ref
  ) => {
    const [imageError, setImageError] = React.useState(false);
    
    const sizes = {
      xs: 'w-6 h-6 text-xs',
      sm: 'w-8 h-8 text-sm',
      md: 'w-10 h-10 text-base',
      lg: 'w-12 h-12 text-lg',
      xl: 'w-16 h-16 text-xl',
    };
    
    const showFallback = !src || imageError;
    
    // Generate initials from fallback text
    const getInitials = (text?: string) => {
      if (!text) return '?';
      const words = text.trim().split(/\s+/).filter(w => w.length > 0);
      if (words.length >= 2) {
        return `${words[0][0]}${words[1][0]}`.toUpperCase();
      }
      return words[0]?.substring(0, 2).toUpperCase() || '?';
    };
    
    return (
      <div
        ref={ref}
        className={cn(
          'relative inline-flex items-center justify-center rounded-full overflow-hidden bg-b2b-gray-100 text-b2b-dark font-medium',
          sizes[size],
          className
        )}
        {...props}
      >
        {showFallback ? (
          <span>{getInitials(fallback || (alt !== 'Avatar' ? alt : undefined))}</span>
        ) : (
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

