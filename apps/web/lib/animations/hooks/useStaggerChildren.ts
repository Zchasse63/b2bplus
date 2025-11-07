/**
 * useStaggerChildren Hook
 * Stagger animation for list items
 */

import { Variants } from 'framer-motion';
import { STAGGER, DELAY } from '../constants';

interface UseStaggerChildrenOptions {
  /**
   * Delay between each child animation
   * @default STAGGER.normal (0.1s)
   */
  staggerDelay?: number;
  
  /**
   * Initial delay before first child
   * @default DELAY.short (0.05s)
   */
  delayChildren?: number;
  
  /**
   * Custom child animation
   */
  childVariant?: Variants;
}

/**
 * Hook to create stagger animation variants for parent and children
 * 
 * @example
 * const { containerVariants, itemVariants } = useStaggerChildren();
 * 
 * <motion.ul variants={containerVariants} initial="hidden" animate="visible">
 *   {items.map(item => (
 *     <motion.li key={item.id} variants={itemVariants}>
 *       {item.name}
 *     </motion.li>
 *   ))}
 * </motion.ul>
 */
export function useStaggerChildren(options: UseStaggerChildrenOptions = {}) {
  const {
    staggerDelay = STAGGER.normal,
    delayChildren = DELAY.short,
    childVariant,
  } = options;
  
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren,
      },
    },
  };
  
  const itemVariants: Variants = childVariant || {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };
  
  return { containerVariants, itemVariants };
}

