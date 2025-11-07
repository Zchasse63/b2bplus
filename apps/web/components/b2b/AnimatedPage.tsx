'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { pageTransition, smooth } from '@/lib/animations';

export interface AnimatedPageProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * AnimatedPage wrapper component for page transitions
 * Uses Framer Motion AnimatePresence for smooth route changes
 * 
 * Usage:
 * <AnimatedPage>
 *   <YourPageContent />
 * </AnimatedPage>
 */
export const AnimatedPage: React.FC<AnimatedPageProps> = ({
  children,
  className,
}) => {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        className={className}
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={smooth}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

AnimatedPage.displayName = 'AnimatedPage';

