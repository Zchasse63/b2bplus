'use client';

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Typography components based on B2B Plus design system
 * Provides a consistent typographic scale across the application
 */

// H1 - Page Title (32px, bold)
export const PageTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h1
    ref={ref}
    className={cn('text-3xl md:text-4xl font-bold text-b2b-dark', className)}
    {...props}
  />
));
PageTitle.displayName = 'PageTitle';

// H2 - Section Title (24px, bold)
export const SectionTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn('text-2xl font-bold text-b2b-dark', className)}
    {...props}
  />
));
SectionTitle.displayName = 'SectionTitle';

// H3 - Subsection Title (20px, semibold)
export const SubsectionTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-xl font-semibold text-b2b-dark', className)}
    {...props}
  />
));
SubsectionTitle.displayName = 'SubsectionTitle';

// H4 - Card Title (18px, semibold)
export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h4
    ref={ref}
    className={cn('text-lg font-semibold text-b2b-dark', className)}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

// Body Text - Regular (16px)
export const BodyText = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-base text-b2b-text', className)}
    {...props}
  />
));
BodyText.displayName = 'BodyText';

// Body Text Small (14px)
export const BodyTextSmall = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-b2b-text', className)}
    {...props}
  />
));
BodyTextSmall.displayName = 'BodyTextSmall';

// Caption (12px, muted)
export const Caption = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-xs text-b2b-gray-500', className)}
    {...props}
  />
));
Caption.displayName = 'Caption';

// Label Text (14px, medium)
export const LabelText = React.forwardRef<
  HTMLLabelElement,
  React.HTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn('text-sm font-medium text-b2b-dark', className)}
    {...props}
  />
));
LabelText.displayName = 'LabelText';

// Helper Text (12px, muted)
export const HelperText = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-xs text-b2b-gray-500', className)}
    {...props}
  />
));
HelperText.displayName = 'HelperText';

