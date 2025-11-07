/**
 * useScrollAnimation Hook
 * Trigger animations when element scrolls into view
 */

import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';

interface UseScrollAnimationOptions {
  /**
   * Trigger animation once or every time element enters viewport
   * @default true
   */
  once?: boolean;
  
  /**
   * Amount of element that must be visible (0-1)
   * @default 0.1
   */
  amount?: number;
  
  /**
   * Margin around viewport for early triggering
   * @default "0px"
   */
  margin?: string;
}

/**
 * Hook to trigger animations when element scrolls into view
 * 
 * @example
 * const { ref, isInView } = useScrollAnimation({ once: true });
 * 
 * <motion.div
 *   ref={ref}
 *   initial={{ opacity: 0, y: 50 }}
 *   animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
 * >
 *   Content
 * </motion.div>
 */
export function useScrollAnimation(options: UseScrollAnimationOptions = {}) {
  const { once = true, amount = 0.1, margin = '0px' } = options;
  
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once, amount, margin });
  
  return { ref, isInView };
}

/**
 * Hook to get scroll progress of an element
 * Returns value between 0 and 1
 */
export function useScrollProgress() {
  const [scrollProgress, setScrollProgress] = useState(0);
  
  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      
      const progress = scrollTop / (documentHeight - windowHeight);
      setScrollProgress(Math.min(Math.max(progress, 0), 1));
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial calculation
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  return scrollProgress;
}

