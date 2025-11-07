/**
 * Framer Motion Animation System
 * Complete animation utilities for B2B design system
 */

// Variants
export {
  fadeIn,
  fadeOut,
  slideUp,
  slideDown,
  slideLeft,
  slideRight,
  scaleIn,
  scaleOut,
  staggerContainer,
  staggerItem,
  modalBackdrop,
  modalContent,
  drawerSlideLeft,
  drawerSlideRight,
  pageTransition,
  collapse,
  rotate,
  pulse,
  shake,
} from './variants';

// Transitions
export {
  smooth,
  fast,
  slow,
  spring,
  springBouncy,
  springStiff,
  springSoft,
  easeInOut,
  easeIn,
  easeOut,
  instant,
} from './transitions';

// Constants
export {
  DURATION,
  DELAY,
  STAGGER,
  EASING,
  SPRING,
  REDUCED_MOTION,
} from './constants';

// Hooks
export { useScrollAnimation, useScrollProgress } from './hooks/useScrollAnimation';
export { useStaggerChildren } from './hooks/useStaggerChildren';
export { usePageTransition, usePrefersReducedMotion } from './hooks/usePageTransition';

