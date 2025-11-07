/**
 * usePageTransition Hook
 * Handle page transition animations
 */

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Hook to detect route changes for page transitions
 * 
 * @example
 * const { isChanging } = usePageTransition();
 * 
 * <AnimatePresence mode="wait">
 *   <motion.div
 *     key={pathname}
 *     initial={{ opacity: 0, y: 20 }}
 *     animate={{ opacity: 1, y: 0 }}
 *     exit={{ opacity: 0, y: -20 }}
 *   >
 *     {children}
 *   </motion.div>
 * </AnimatePresence>
 */
export function usePageTransition() {
  const pathname = usePathname();
  const [isChanging, setIsChanging] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);
  
  useEffect(() => {
    if (pathname !== prevPathname) {
      setIsChanging(true);
      setPrevPathname(pathname);
      
      // Reset after animation completes
      const timeout = setTimeout(() => {
        setIsChanging(false);
      }, 300);
      
      return () => clearTimeout(timeout);
    }
  }, [pathname, prevPathname]);
  
  return { isChanging, pathname };
}

/**
 * Hook to check if user prefers reduced motion
 */
export function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  return prefersReducedMotion;
}

