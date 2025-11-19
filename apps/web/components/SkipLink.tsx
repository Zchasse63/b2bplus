'use client';

import React from 'react';

/**
 * SkipLink component - provides keyboard navigation shortcut
 * Allows users to skip to main content without tabbing through navigation
 * Should be placed at the very beginning of the page
 */
export const SkipLink = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement>
>(({ href = '#main-content', ...props }, ref) => {
  return (
    <a
      ref={ref}
      href={href}
      className="sr-only focus:not-sr-only focus:fixed focus:top-0 focus:left-0 focus:z-50 focus:bg-b2b-blue focus:text-white focus:px-4 focus:py-2 focus:rounded-b-lg"
      {...props}
    >
      Skip to main content
    </a>
  );
});

SkipLink.displayName = 'SkipLink';

