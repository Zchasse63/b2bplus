'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useStaggerChildren } from '@/lib/animations';

export interface StaggerListProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  delayChildren?: number;
}

/**
 * StaggerList wrapper component for staggered children animations
 * Automatically animates children with a stagger effect
 * 
 * Usage:
 * <StaggerList>
 *   {items.map(item => (
 *     <div key={item.id}>{item.name}</div>
 *   ))}
 * </StaggerList>
 */
export const StaggerList: React.FC<StaggerListProps> = ({
  children,
  className,
  staggerDelay,
  delayChildren,
}) => {
  const { containerVariants, itemVariants } = useStaggerChildren({
    staggerDelay,
    delayChildren,
  });

  return (
    <motion.div
      className={cn(className)}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {React.Children.map(children, (child, index) => (
        <motion.div key={index} variants={itemVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
};

StaggerList.displayName = 'StaggerList';

