/**
 * Framer Motion Transition Presets
 * Reusable timing functions and spring configurations
 */

import { Transition } from 'framer-motion';

/**
 * Smooth - Default ease-out transition
 */
export const smooth: Transition = {
  duration: 0.3,
  ease: 'easeOut',
};

/**
 * Fast - Quick transition
 */
export const fast: Transition = {
  duration: 0.15,
  ease: 'easeOut',
};

/**
 * Slow - Slower transition
 */
export const slow: Transition = {
  duration: 0.5,
  ease: 'easeOut',
};

/**
 * Spring - Default spring physics
 */
export const spring: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
};

/**
 * Spring Bouncy - Bouncy spring
 */
export const springBouncy: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 20,
};

/**
 * Spring Stiff - Stiff spring (less bounce)
 */
export const springStiff: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 40,
};

/**
 * Spring Soft - Soft spring (more bounce)
 */
export const springSoft: Transition = {
  type: 'spring',
  stiffness: 200,
  damping: 25,
};

/**
 * Ease In Out - Smooth both ways
 */
export const easeInOut: Transition = {
  duration: 0.3,
  ease: 'easeInOut',
};

/**
 * Ease In - Slow start
 */
export const easeIn: Transition = {
  duration: 0.3,
  ease: 'easeIn',
};

/**
 * Ease Out - Slow end
 */
export const easeOut: Transition = {
  duration: 0.3,
  ease: 'easeOut',
};

/**
 * Instant - No transition
 */
export const instant: Transition = {
  duration: 0,
};

