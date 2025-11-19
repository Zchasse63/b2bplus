'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NavSuggestion {
  id: string;
  label: string;
  description: string;
  href: string;
  icon?: React.ReactNode;
  reason?: string; // Why this is suggested (e.g., "Based on your recent activity")
}

interface PersonalizedNavigationProps {
  suggestions: NavSuggestion[];
  onNavigate?: (suggestion: NavSuggestion) => void;
  className?: string;
}

/**
 * PersonalizedNavigation component - AI-driven navigation suggestions
 * Shows contextual navigation suggestions based on user behavior and preferences
 * Useful for improving discoverability and user engagement
 */
export const PersonalizedNavigation = React.forwardRef<
  HTMLDivElement,
  PersonalizedNavigationProps
>(({ suggestions, onNavigate, className }, ref) => {
  const [expanded, setExpanded] = useState(false);

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <motion.div
      ref={ref}
      className={cn(
        'rounded-lg border border-b2b-blue-200 bg-b2b-blue-50 p-4',
        className
      )}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-start gap-3">
        <Lightbulb className="h-5 w-5 flex-shrink-0 text-b2b-blue-600 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-b2b-blue-900 mb-2">
            Suggested for you
          </h3>
          <div className="space-y-2">
            {suggestions.slice(0, expanded ? suggestions.length : 2).map((suggestion) => (
              <motion.a
                key={suggestion.id}
                href={suggestion.href}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate?.(suggestion);
                }}
                className="block rounded-md bg-white p-3 text-sm hover:bg-b2b-blue-100 transition-colors cursor-pointer"
                whileHover={{ x: 4 }}
              >
                <div className="flex items-center gap-2">
                  {suggestion.icon && (
                    <div className="flex-shrink-0">{suggestion.icon}</div>
                  )}
                  <div className="flex-1">
                    <div className="font-medium text-b2b-dark">
                      {suggestion.label}
                    </div>
                    {suggestion.description && (
                      <div className="text-xs text-b2b-gray-600">
                        {suggestion.description}
                      </div>
                    )}
                    {suggestion.reason && (
                      <div className="text-xs text-b2b-blue-600 mt-1">
                        {suggestion.reason}
                      </div>
                    )}
                  </div>
                </div>
              </motion.a>
            ))}
          </div>
          {suggestions.length > 2 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-2 text-xs font-medium text-b2b-blue-600 hover:text-b2b-blue-700"
            >
              {expanded ? 'Show less' : `Show ${suggestions.length - 2} more`}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
});

PersonalizedNavigation.displayName = 'PersonalizedNavigation';

