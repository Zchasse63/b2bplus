'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    /**
     * Variant of the skeleton shape
     * - text: Inline text placeholder (default height 16px)
     * - title: Larger text placeholder (height 24px, 60% width)
     * - avatar: Circular placeholder
     * - card: Full card placeholder with aspect ratio
     * - rectangle: Custom rectangle shape
     */
    variant?: 'text' | 'title' | 'avatar' | 'card' | 'rectangle';

    /**
     * Size of the avatar variant
     */
    avatarSize?: 'sm' | 'md' | 'lg' | 'xl';

    /**
     * Width of the skeleton (CSS value or Tailwind class)
     */
    width?: string;

    /**
     * Height of the skeleton (CSS value or Tailwind class)
     */
    height?: string;

    /**
     * Whether to animate the skeleton
     */
    animate?: boolean;
}

/**
 * Skeleton component for loading states
 * Following Design System specifications with shimmer animation
 * 
 * Usage:
 * <Skeleton variant="text" /> - Text line
 * <Skeleton variant="title" /> - Title/heading
 * <Skeleton variant="avatar" avatarSize="md" /> - Circular avatar
 * <Skeleton variant="card" /> - Full card placeholder
 * <Skeleton width="200px" height="40px" /> - Custom dimensions
 */
export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
    (
        {
            className,
            variant = 'text',
            avatarSize = 'md',
            width,
            height,
            animate = true,
            style,
            ...props
        },
        ref
    ) => {
        const avatarSizes = {
            sm: 'w-8 h-8',    // 32px
            md: 'w-10 h-10',  // 40px
            lg: 'w-12 h-12',  // 48px
            xl: 'w-16 h-16',  // 64px
        };

        const variantStyles = {
            text: 'h-4 w-full rounded',
            title: 'h-6 w-3/5 rounded',
            avatar: `${avatarSizes[avatarSize]} rounded-full`,
            card: 'w-full aspect-video rounded-xl',
            rectangle: 'rounded-lg',
        };

        return (
            <div
                ref={ref}
                className={cn(
                    'bg-b2b-gray-200',
                    animate && 'skeleton',
                    variantStyles[variant],
                    className
                )}
                style={{
                    width: width,
                    height: height,
                    ...style,
                }}
                aria-hidden="true"
                {...props}
            />
        );
    }
);

Skeleton.displayName = 'Skeleton';

/**
 * SkeletonText - Multiple lines of skeleton text
 */
export interface SkeletonTextProps extends React.HTMLAttributes<HTMLDivElement> {
    lines?: number;
    lastLineWidth?: string;
    gap?: string;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
    lines = 3,
    lastLineWidth = '60%',
    gap = '0.75rem',
    className,
    ...props
}) => {
    return (
        <div className={cn('space-y-3', className)} style={{ gap }} {...props}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    variant="text"
                    style={{
                        width: i === lines - 1 ? lastLineWidth : '100%',
                    }}
                />
            ))}
        </div>
    );
};

SkeletonText.displayName = 'SkeletonText';

/**
 * SkeletonCard - Card-shaped skeleton with optional image and text lines
 */
export interface SkeletonCardProps extends React.HTMLAttributes<HTMLDivElement> {
    hasImage?: boolean;
    lines?: number;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
    hasImage = true,
    lines = 2,
    className,
    ...props
}) => {
    return (
        <div
            className={cn(
                'bg-white rounded-xl shadow-b2b overflow-hidden',
                className
            )}
            {...props}
        >
            {hasImage && (
                <Skeleton variant="card" className="rounded-none" />
            )}
            <div className="p-4 space-y-3">
                <Skeleton variant="title" />
                <SkeletonText lines={lines} />
            </div>
        </div>
    );
};

SkeletonCard.displayName = 'SkeletonCard';

export default Skeleton;
