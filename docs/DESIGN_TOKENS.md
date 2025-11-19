# B2B+ Design Tokens

This document defines the design tokens used throughout the B2B+ platform. All tokens are defined in `apps/web/tailwind.config.ts` and should be used consistently across all components and pages.

## Color Palette

### Primary Colors

- **Trust Blue** (`b2b-blue`): `#0052CC`
  - Primary brand color for navigation, headers, and primary buttons
  - Variants: 50, 100, 200, 300, 400, 500 (default), 600, 700, 800, 900

- **Sage Green** (`b2b-green`): `#4A9D6F`
  - Secondary brand color for trust signals and secondary actions
  - Variants: 50, 100, 200, 300, 400, 500 (default), 600, 700, 800, 900

- **Action Orange** (`b2b-orange`): `#FF8C42`
  - Accent color for CTAs and urgency elements
  - Variants: 50, 100, 200, 300, 400, 500 (default), 600, 700, 800, 900

### Semantic Colors

- **Success** (`b2b-success`): `#27AE60` - Order confirmations, positive states
- **Warning** (`b2b-warning`): `#F39C12` - Alerts, caution states
- **Error** (`b2b-error`): `#E74C3C` - Errors, destructive actions
- **Info** (`b2b-info`): `#3498DB` - Informational messages

### Neutral Colors

- **Text** (`b2b-text`): `#2C3E50` - Body text, high-contrast elements
- **Background** (`b2b-background`): `#ECF0F1` - Secondary backgrounds
- **Gray Scale** (`b2b-gray`): 50-900 variants for backgrounds, borders, and disabled states

## Shadows

- **Default** (`shadow-b2b`): `0 4px 30px rgba(104, 117, 130, 0.05)`
- **Small** (`shadow-b2b-sm`): `0 2px 8px rgba(104, 117, 130, 0.04)`
- **Large** (`shadow-b2b-lg`): `0 8px 40px rgba(104, 117, 130, 0.08)`

## Border Radius

- **Large** (`rounded-lg`): `0.5rem` (8px)
- **Medium** (`rounded-md`): `0.375rem` (6px)
- **Small** (`rounded-sm`): `0.25rem` (4px)

## Typography Scale

### Headings

- **H1 - Page Title**: `text-3xl md:text-4xl font-bold text-b2b-dark`
- **H2 - Section Title**: `text-2xl font-bold text-b2b-dark`
- **H3 - Subsection Title**: `text-xl font-semibold text-b2b-dark`
- **H4 - Card Title**: `text-lg font-semibold text-b2b-dark`

### Body Text

- **Body Text**: `text-base text-b2b-text`
- **Body Text Small**: `text-sm text-b2b-text`
- **Caption**: `text-xs text-b2b-gray-500`
- **Label**: `text-sm font-medium text-b2b-dark`
- **Helper**: `text-xs text-b2b-gray-500`

## Spacing Scale

Tailwind's default spacing scale is used:
- `0`, `1` (4px), `2` (8px), `3` (12px), `4` (16px), `6` (24px), `8` (32px), `12` (48px), `16` (64px)

## Usage Guidelines

### Colors

1. Always use semantic color names (e.g., `text-b2b-blue` instead of `text-blue-500`)
2. Use color variants for hover/active states (e.g., `hover:bg-b2b-blue-600`)
3. For text, prefer `text-b2b-text` for body and `text-b2b-dark` for headings
4. Use semantic colors for status indicators (success, warning, error, info)

### Shadows

1. Use `shadow-b2b` for default card shadows
2. Use `shadow-b2b-sm` for subtle shadows on smaller elements
3. Use `shadow-b2b-lg` for elevated/modal shadows

### Typography

1. Use typography components from `@/components/b2b/Typography`
2. Always use semantic heading levels (h1, h2, h3, etc.)
3. Maintain consistent spacing between headings and body text

## Component Usage

All B2B components automatically use these tokens:

- **Button**: Uses color tokens for variants
- **Card**: Uses shadow tokens
- **Input**: Uses border and text color tokens
- **Badge**: Uses semantic color tokens
- **Alert**: Uses semantic color tokens

## Accessibility

- All color combinations meet WCAG AA contrast requirements
- Focus states use `focus-visible:ring-2 focus-visible:ring-b2b-blue-300`
- Reduced motion is respected via `prefers-reduced-motion` media query

