/**
 * Animation Constants
 * Standard durations, delays, and easing values
 */

/**
 * Duration values (in seconds)
 */
export const DURATION = {
  instant: 0,
  fast: 0.15,
  normal: 0.3,
  slow: 0.5,
  slower: 0.8,
} as const;

/**
 * Delay values (in seconds)
 */
export const DELAY = {
  none: 0,
  short: 0.05,
  medium: 0.1,
  long: 0.2,
} as const;

/**
 * Stagger values (in seconds)
 */
export const STAGGER = {
  fast: 0.05,
  normal: 0.1,
  slow: 0.15,
} as const;

/**
 * Easing curves
 */
export const EASING = {
  easeIn: [0.4, 0, 1, 1],
  easeOut: [0, 0, 0.2, 1],
  easeInOut: [0.4, 0, 0.2, 1],
  sharp: [0.4, 0, 0.6, 1],
} as const;

/**
 * Spring configurations
 */
export const SPRING = {
  default: {
    stiffness: 300,
    damping: 30,
  },
  bouncy: {
    stiffness: 400,
    damping: 20,
  },
  stiff: {
    stiffness: 500,
    damping: 40,
  },
  soft: {
    stiffness: 200,
    damping: 25,
  },
} as const;

/**
 * Reduced motion preference
 */
export const REDUCED_MOTION = {
  duration: 0.01,
  transition: { duration: 0.01 },
} as const;

