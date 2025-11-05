'use client';

import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { FiX } from 'react-icons/fi';
import { Button } from './Button';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  side?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Drawer component based on B2B Plus Professional Palette
 * Slide-in panel from left or right side
 * 
 * Usage:
 * <Drawer isOpen={open} onClose={() => setOpen(false)} title="Cart">
 *   <p>Drawer content</p>
 * </Drawer>
 */
export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  side = 'right',
  size = 'md',
  className,
}) => {
  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  const slideDirection = {
    left: {
      enter: 'translate-x-0',
      exit: '-translate-x-full',
      position: 'left-0',
    },
    right: {
      enter: 'translate-x-0',
      exit: 'translate-x-full',
      position: 'right-0',
    },
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black transition-opacity duration-300',
          isOpen ? 'opacity-50' : 'opacity-0'
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed top-0 bottom-0 z-50 w-full bg-white shadow-2xl transition-transform duration-300 ease-in-out flex flex-col',
          sizes[size],
          slideDirection[side].position,
          isOpen ? slideDirection[side].enter : slideDirection[side].exit,
          className
        )}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between border-b border-b2b-gray-200 px-6 py-4">
            <h2 className="text-xl font-bold text-b2b-text">{title}</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              icon={<FiX className="h-5 w-5" />}
              iconPosition="left"
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {children}
        </div>
      </div>
    </>
  );
};

Drawer.displayName = 'Drawer';

