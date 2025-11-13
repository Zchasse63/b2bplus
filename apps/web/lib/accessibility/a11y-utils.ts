/**
 * Accessibility Utilities
 * Helpers for implementing WCAG 2.1 AA compliance
 */

/**
 * Color contrast checker
 * Ensures WCAG AA compliance (4.5:1 for normal text, 3:1 for large text)
 */
export function getContrastRatio(foreground: string, background: string): number {
  const fgLum = getRelativeLuminance(foreground);
  const bgLum = getRelativeLuminance(background);

  const lighter = Math.max(fgLum, bgLum);
  const darker = Math.min(fgLum, bgLum);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Calculate relative luminance
 */
function getRelativeLuminance(color: string): number {
  const rgb = hexToRgb(color);
  if (!rgb) return 0;

  const [r, g, b] = rgb.map(val => {
    const v = val / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : null;
}

/**
 * Check if contrast ratio meets WCAG AA standards
 */
export function meetsWCAGAA(contrastRatio: number, isLargeText: boolean = false): boolean {
  return isLargeText ? contrastRatio >= 3 : contrastRatio >= 4.5;
}

/**
 * ARIA label utilities
 */
export const ariaLabels = {
  // Common ARIA labels
  close: 'Close',
  menu: 'Menu',
  search: 'Search',
  submit: 'Submit',
  cancel: 'Cancel',
  delete: 'Delete',
  edit: 'Edit',
  save: 'Save',
  loading: 'Loading',
  error: 'Error',
  success: 'Success',
  warning: 'Warning',
  info: 'Information',

  // Navigation
  navigation: 'Main navigation',
  breadcrumb: 'Breadcrumb',
  pagination: 'Pagination',
  skipToContent: 'Skip to main content',

  // Forms
  required: 'Required',
  optional: 'Optional',
  invalid: 'Invalid',
  valid: 'Valid',

  // Tables
  sortAscending: 'Sort ascending',
  sortDescending: 'Sort descending',
  columnHeader: 'Column header',
  rowHeader: 'Row header',

  // Modals
  modal: 'Dialog',
  closeModal: 'Close dialog',

  // Alerts
  alert: 'Alert',
  alertDialog: 'Alert dialog',
};

/**
 * Keyboard navigation utilities
 */
export const keyboardKeys = {
  ENTER: 'Enter',
  ESCAPE: 'Escape',
  SPACE: ' ',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
};

/**
 * Check if key is a navigation key
 */
export function isNavigationKey(key: string): boolean {
  return [
    keyboardKeys.ARROW_UP,
    keyboardKeys.ARROW_DOWN,
    keyboardKeys.ARROW_LEFT,
    keyboardKeys.ARROW_RIGHT,
    keyboardKeys.HOME,
    keyboardKeys.END,
    keyboardKeys.PAGE_UP,
    keyboardKeys.PAGE_DOWN,
  ].includes(key);
}

/**
 * Focus management utilities
 */
export class FocusManager {
  /**
   * Trap focus within an element
   */
  static trapFocus(element: HTMLElement, event: KeyboardEvent): void {
    if (event.key !== keyboardKeys.TAB) return;

    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement.focus();
        event.preventDefault();
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement.focus();
        event.preventDefault();
      }
    }
  }

  /**
   * Restore focus to element
   */
  static restoreFocus(element: HTMLElement): void {
    element.focus();
  }

  /**
   * Get first focusable element
   */
  static getFirstFocusable(element: HTMLElement): HTMLElement | null {
    const focusable = element.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    return focusable as HTMLElement | null;
  }
}

/**
 * Semantic HTML utilities
 */
export const semanticElements = {
  // Landmarks
  main: 'main',
  nav: 'nav',
  header: 'header',
  footer: 'footer',
  aside: 'aside',
  section: 'section',
  article: 'article',

  // Headings
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',

  // Lists
  ul: 'ul',
  ol: 'ol',
  li: 'li',
  dl: 'dl',
  dt: 'dt',
  dd: 'dd',

  // Text
  p: 'p',
  strong: 'strong',
  em: 'em',
  code: 'code',
  pre: 'pre',
};

/**
 * Screen reader only text
 */
export function srOnly(text: string): string {
  return `<span class="sr-only">${text}</span>`;
}

/**
 * Accessibility audit
 */
export interface A11yAuditResult {
  passed: number;
  failed: number;
  warnings: number;
  issues: Array<{
    type: 'error' | 'warning' | 'info';
    message: string;
    element?: HTMLElement;
  }>;
}

/**
 * Run accessibility audit on page
 */
export function auditAccessibility(): A11yAuditResult {
  const issues: A11yAuditResult['issues'] = [];
  let passed = 0;
  let failed = 0;
  let warnings = 0;

  // Check for images without alt text
  document.querySelectorAll('img').forEach(img => {
    if (!img.alt) {
      issues.push({
        type: 'error',
        message: `Image missing alt text: ${img.src}`,
        element: img,
      });
      failed++;
    } else {
      passed++;
    }
  });

  // Check for form inputs without labels
  document.querySelectorAll('input, textarea, select').forEach(input => {
    const id = input.id;
    const label = id ? document.querySelector(`label[for="${id}"]`) : null;
    const ariaLabel = input.getAttribute('aria-label');

    if (!label && !ariaLabel) {
      issues.push({
        type: 'error',
        message: 'Form input missing label',
        element: input as HTMLElement,
      });
      failed++;
    } else {
      passed++;
    }
  });

  // Check heading hierarchy
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  let lastLevel = 0;
  headings.forEach(heading => {
    const level = parseInt(heading.tagName[1]);
    if (level - lastLevel > 1) {
      issues.push({
        type: 'warning',
        message: `Heading hierarchy skipped from H${lastLevel} to H${level}`,
        element: heading as HTMLElement,
      });
      warnings++;
    }
    lastLevel = level;
  });

  // Check for color contrast
  document.querySelectorAll('*').forEach(element => {
    const style = window.getComputedStyle(element);
    const fg = style.color;
    const bg = style.backgroundColor;

    if (fg && bg && bg !== 'rgba(0, 0, 0, 0)') {
      const ratio = getContrastRatio(fg, bg);
      if (!meetsWCAGAA(ratio)) {
        issues.push({
          type: 'warning',
          message: `Low color contrast ratio: ${ratio.toFixed(2)}:1`,
          element: element as HTMLElement,
        });
        warnings++;
      }
    }
  });

  return {
    passed,
    failed,
    warnings,
    issues,
  };
}

