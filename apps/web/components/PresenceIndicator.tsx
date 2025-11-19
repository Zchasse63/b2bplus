'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface PresenceUser {
  id: string;
  name: string;
  avatar?: string;
  color?: string;
  isEditing?: boolean;
}

interface PresenceIndicatorProps {
  users: PresenceUser[];
  maxDisplay?: number;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * PresenceIndicator component - shows real-time presence of users
 * Displays avatars of users currently viewing/editing a resource
 * Useful for collaborative features
 */
export const PresenceIndicator = React.forwardRef<HTMLDivElement, PresenceIndicatorProps>(
  ({ users, maxDisplay = 3, size = 'md' }, ref) => {
    const sizeClasses = {
      sm: 'h-6 w-6 text-xs',
      md: 'h-8 w-8 text-sm',
      lg: 'h-10 w-10 text-base',
    };

    const displayedUsers = users.slice(0, maxDisplay);
    const hiddenCount = Math.max(0, users.length - maxDisplay);

    return (
      <div ref={ref} className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {displayedUsers.map((user) => (
            <motion.div
              key={user.id}
              className={cn(
                'flex items-center justify-center rounded-full border-2 border-white bg-b2b-gray-200 font-semibold text-white',
                sizeClasses[size],
                user.isEditing && 'ring-2 ring-b2b-orange-500'
              )}
              style={{
                backgroundColor: user.color || '#9CA3AF',
              }}
              title={`${user.name}${user.isEditing ? ' (editing)' : ''}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </motion.div>
          ))}
          {hiddenCount > 0 && (
            <div
              className={cn(
                'flex items-center justify-center rounded-full border-2 border-white bg-b2b-gray-300 font-semibold text-white',
                sizeClasses[size]
              )}
              title={`+${hiddenCount} more`}
            >
              +{hiddenCount}
            </div>
          )}
        </div>
        {users.length > 0 && (
          <div className="text-xs text-b2b-gray-600">
            {users.length} {users.length === 1 ? 'user' : 'users'} viewing
          </div>
        )}
      </div>
    );
  }
);

PresenceIndicator.displayName = 'PresenceIndicator';

