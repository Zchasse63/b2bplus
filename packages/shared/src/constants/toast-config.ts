/**
 * Toast Configuration
 * Defines default durations and settings for toast notifications by type
 */

export const TOAST_CONFIG = {
  success: {
    duration: 4000,
    autoDismiss: true,
    position: 'bottom-right' as const,
  },
  error: {
    duration: 0,
    autoDismiss: false,
    position: 'bottom-right' as const,
  },
  warning: {
    duration: 6000,
    autoDismiss: true,
    position: 'bottom-right' as const,
  },
  info: {
    duration: 5000,
    autoDismiss: true,
    position: 'bottom-right' as const,
  },
} as const;

export type ToastType = keyof typeof TOAST_CONFIG;

export interface ToastOptions {
  duration?: number;
  autoDismiss?: boolean;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
}

/**
 * Get toast config by type
 */
export function getToastConfig(type: ToastType, overrides?: ToastOptions) {
  const config = TOAST_CONFIG[type];
  return {
    ...config,
    ...overrides,
  };
}
