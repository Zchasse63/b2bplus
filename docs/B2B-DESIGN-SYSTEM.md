# B2B+ Platform Design System
## Adapted from UI/UX Design System Specification

**Version:** 1.0.0  
**Source:** UI UX Design System (Horizon UI Inspired)  
**Adapted For:** B2B Food Service Distribution Platform  
**Last Updated:** December 7, 2025

---

## Table of Contents

1. [Design Philosophy & Principles](#1-design-philosophy--principles)
2. [Design Token Mapping](#2-design-token-mapping)
3. [Color System Adaptation](#3-color-system-adaptation)
4. [Typography System](#4-typography-system)
5. [Spacing & Sizing](#5-spacing--sizing)
6. [Component Library Status](#6-component-library-status)
7. [Layout System](#7-layout-system)
8. [Navigation System](#8-navigation-system)
9. [AI Chat Interface](#9-ai-chat-interface)
10. [Animation & Motion](#10-animation--motion)
11. [Accessibility Standards](#11-accessibility-standards)
12. [Responsive Design](#12-responsive-design)
13. [Dark Mode](#13-dark-mode)
14. [Implementation Roadmap](#14-implementation-roadmap)

---

## 1. Design Philosophy & Principles

### Adopted Core Vision

The source design system is built around creating an "iPhone experience" - users should immediately understand how to use the platform without extensive onboarding. For our B2B food service platform, we adapt this to create a **"professional yet approachable" e-commerce experience**.

### The Five Design Pillars (Adapted for B2B)

| Pillar | Original Focus | B2B+ Adaptation |
|--------|----------------|-----------------|
| **AI-Native Interface** | Natural language as PRIMARY interaction | AI assistant for product discovery, order questions, and reorder suggestions |
| **Visual Clarity** | Information hierarchy, generous whitespace | Clear product information, pricing transparency, inventory status |
| **Intuitive Navigation** | Predictable patterns, minimal clicks | Quick access to products, orders, invoices, and reordering |
| **Delightful Interactions** | Micro-animations, smooth transitions | Professional animations that reinforce trust without feeling whimsical |
| **Professional Trust** | Premium aesthetic builds confidence | B2B trust signals: company branding, security indicators, professional tone |

### B2B-Specific Principles

```
┌─────────────────────────────────────────────────────────────────────┐
│                    B2B+ DESIGN PRINCIPLES                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. EFFICIENCY FIRST                                                 │
│     • Minimize clicks to complete orders                             │
│     • Quick reorder functionality                                    │
│     • Bulk operations (multi-product add-to-cart)                   │
│     • Saved cart templates for repeat orders                         │
│                                                                      │
│  2. TRUST & PROFESSIONALISM                                          │
│     • Clean, business-appropriate design                             │
│     • Clear pricing (unit prices, case prices, volume discounts)    │
│     • Transparent inventory levels                                   │
│     • Professional documentation (invoices, order confirmations)     │
│                                                                      │
│  3. INFORMATION DENSITY (Appropriate)                                │
│     • B2B users need more data than B2C consumers                   │
│     • SKU numbers, pack sizes, units per case visible               │
│     • Order history and analytics accessible                         │
│     • But avoid overwhelming - prioritize scannable layouts         │
│                                                                      │
│  4. MOBILE-RESPONSIVE BUT DESKTOP-OPTIMIZED                          │
│     • B2B ordering typically happens on desktop during work hours   │
│     • Mobile support for quick lookups and reorders                  │
│     • Touch-friendly but optimized for mouse/keyboard               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Design Token Mapping

### Token Architecture Comparison

| Category | Source Design System | Current B2B+ Implementation | Note |
|----------|---------------------|----------------------------|------|
| Color Tokens | CSS Custom Properties | Tailwind + CSS Variables | Keep Tailwind for consistency |
| Typography | DM Sans | System fonts | Consider adding DM Sans |
| Spacing | 8px base unit | Tailwind defaults (4px base) | Standardize to 8px scale |
| Shadows | 6 levels | 3 B2B-specific shadows | Expand shadow library |
| Border Radius | 5 levels | 3 levels | Add more options |
| Transitions | 4 speeds | Not standardized | Add timing tokens |
| Z-Index | 8-level scale | Ad-hoc | Implement scale |

### CSS Custom Properties to Add

```css
/* Add to globals.css - Design Token Enhancement */
:root {
  /* ═══════════════════════════════════════════════════════════════════
     TRANSITION TOKENS (from source design system)
     ═══════════════════════════════════════════════════════════════════ */
  --transition-fast: 150ms;
  --transition-normal: 250ms;
  --transition-slow: 350ms;
  --transition-slower: 500ms;
  
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
  
  /* ═══════════════════════════════════════════════════════════════════
     Z-INDEX SCALE
     ═══════════════════════════════════════════════════════════════════ */
  --z-dropdown: 1000;
  --z-sticky: 1100;
  --z-fixed: 1200;
  --z-modal-backdrop: 1300;
  --z-modal: 1400;
  --z-popover: 1500;
  --z-tooltip: 1600;
  --z-toast: 1700;
  
  /* ═══════════════════════════════════════════════════════════════════
     ENHANCED SPACING (8px base for consistency with design system)
     ═══════════════════════════════════════════════════════════════════ */
  --spacing-0: 0;
  --spacing-1: 0.25rem;   /* 4px */
  --spacing-2: 0.5rem;    /* 8px */
  --spacing-3: 0.75rem;   /* 12px */
  --spacing-4: 1rem;      /* 16px */
  --spacing-5: 1.25rem;   /* 20px */
  --spacing-6: 1.5rem;    /* 24px */
  --spacing-8: 2rem;      /* 32px */
  --spacing-10: 2.5rem;   /* 40px */
  --spacing-12: 3rem;     /* 48px */
  --spacing-16: 4rem;     /* 64px */
  
  /* ═══════════════════════════════════════════════════════════════════
     ENHANCED BORDER RADIUS
     ═══════════════════════════════════════════════════════════════════ */
  --border-radius-none: 0;
  --border-radius-sm: 0.25rem;   /* 4px */
  --border-radius-md: 0.5rem;    /* 8px */
  --border-radius-lg: 0.75rem;   /* 12px */
  --border-radius-xl: 1rem;      /* 16px */
  --border-radius-2xl: 1.5rem;   /* 24px */
  --border-radius-full: 9999px;
}
```

---

## 3. Color System Adaptation

### Color Philosophy Decision

**Key Decision: We KEEP the B2B-specific color palette** rather than adopting the Horizon UI purple theme. The rationale:

1. **Trust Blue (#0052CC)** - Research-backed for B2B contexts, conveys reliability
2. **Sage Green (#4A9D6F)** - Supports environmental messaging, trust signals  
3. **Action Orange (#FF8C42)** - Clear CTAs without aggressive red tones

### Current Palette (Maintain)

```typescript
// tailwind.config.ts - Keep B2B Professional Palette
const b2bColors = {
  'b2b-blue': {
    DEFAULT: '#0052CC',   // Trust Blue - Navigation, headers, primary buttons
    50: '#E6F0FF',
    100: '#CCE0FF',
    200: '#99C2FF',
    300: '#66A3FF',
    400: '#3385FF',
    500: '#0052CC',       // PRIMARY
    600: '#0042A3',
    700: '#00337A',
    800: '#002352',
    900: '#001429',
  },
  'b2b-green': {
    DEFAULT: '#4A9D6F',   // Sage Green - Success, trust signals
    50: '#EDF7F2',
    500: '#4A9D6F',       // SECONDARY
    600: '#3B7E59',
  },
  'b2b-orange': {
    DEFAULT: '#FF8C42',   // Action Orange - CTAs, urgency
    50: '#FFF3EB',
    500: '#FF8C42',       // ACCENT
    600: '#CC7035',
  },
};
```

### Semantic Color Mapping

| Purpose | Source Design System | B2B+ Color | Usage |
|---------|---------------------|------------|-------|
| Primary Brand | `#7551FF` (Purple) | `#0052CC` (Trust Blue) | Headers, nav, primary buttons |
| Secondary | `#3182CE` (Blue) | `#4A9D6F` (Sage Green) | Secondary actions, trust signals |
| Accent/CTA | Purple variants | `#FF8C42` (Orange) | Call-to-action, urgency |
| Success | `#48BB78` | `#27AE60` | Order confirmations |
| Warning | `#ECC94B` | `#F39C12` | Alerts, low stock |
| Error | `#F56565` | `#E74C3C` | Errors, destructive actions |
| Info | `#4299E1` | `#3498DB` | Informational messages |

### Gradient System (Adapt)

```css
/* B2B+ Gradients - Adapt from source but use B2B colors */
.gradient-b2b-primary {
  background: linear-gradient(135deg, #0052CC 0%, #00337A 100%);
}

.gradient-b2b-accent {
  background: linear-gradient(135deg, #FF8C42 0%, #CC7035 100%);
}

.gradient-b2b-success {
  background: linear-gradient(135deg, #4A9D6F 0%, #3B7E59 100%);
}

/* Professional dark gradient for hero sections */
.gradient-b2b-hero {
  background: linear-gradient(135deg, #001429 0%, #0052CC 100%);
}
```

---

## 4. Typography System

### Font Stack Recommendation

**Current:** System fonts (default Tailwind)  
**Recommended:** Adopt DM Sans as per source design system

```css
/* Add to globals.css */
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');

:root {
  --font-family-primary: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-family-mono: 'Fira Code', 'JetBrains Mono', Consolas, monospace;
}

body {
  font-family: var(--font-family-primary);
}
```

### Type Scale (Adopt from Source)

| Level | Size | Weight | Use Case |
|-------|------|--------|----------|
| Display XL | 4.5rem (72px) | 700 | Hero sections |
| H1 | 2.25rem (36px) | 700 | Page titles |
| H2 | 1.875rem (30px) | 600 | Section titles |
| H3 | 1.5rem (24px) | 600 | Card titles |
| H4 | 1.25rem (20px) | 600 | Subsections |
| Body LG | 1.125rem (18px) | 400 | Lead paragraphs |
| Body MD | 1rem (16px) | 400 | Body text (default) |
| Body SM | 0.875rem (14px) | 400 | Secondary text |
| Caption | 0.75rem (12px) | 400 | Labels, metadata |

### Typography Components

```css
/* Standardized typography classes */
.text-display { font-size: 3rem; font-weight: 700; line-height: 1.1; }
.text-h1 { font-size: 2.25rem; font-weight: 700; line-height: 1.25; }
.text-h2 { font-size: 1.875rem; font-weight: 600; line-height: 1.3; }
.text-h3 { font-size: 1.5rem; font-weight: 600; line-height: 1.35; }
.text-h4 { font-size: 1.25rem; font-weight: 600; line-height: 1.4; }
.text-body-lg { font-size: 1.125rem; line-height: 1.6; }
.text-body { font-size: 1rem; line-height: 1.6; }
.text-body-sm { font-size: 0.875rem; line-height: 1.5; }
.text-caption { font-size: 0.75rem; line-height: 1.5; }
.text-overline { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; }
```

---

## 5. Spacing & Sizing

### Spacing Scale (8px Base)

The source design system uses an 8px base unit. Update Tailwind config to align:

```typescript
// tailwind.config.ts - Add extended spacing
extend: {
  spacing: {
    '0.5': '0.125rem',  // 2px
    '1': '0.25rem',     // 4px
    '1.5': '0.375rem',  // 6px
    '2': '0.5rem',      // 8px (base)
    '2.5': '0.625rem',  // 10px
    '3': '0.75rem',     // 12px
    '4': '1rem',        // 16px
    '5': '1.25rem',     // 20px
    '6': '1.5rem',      // 24px
    '7': '1.75rem',     // 28px
    '8': '2rem',        // 32px
    '9': '2.25rem',     // 36px
    '10': '2.5rem',     // 40px
    '12': '3rem',       // 48px
    '14': '3.5rem',     // 56px
    '16': '4rem',       // 64px
    '20': '5rem',       // 80px
    '24': '6rem',       // 96px
  },
}
```

### Component Sizing Standards

| Component | Height | Padding X | Padding Y |
|-----------|--------|-----------|-----------|
| Button XS | 28px | 12px | - |
| Button SM | 32px | 14px | - |
| Button MD | 40px | 16px | - |
| Button LG | 48px | 24px | - |
| Input SM | 32px | 12px | - |
| Input MD | 40px | 12px | - |
| Input LG | 48px | 16px | - |
| Card Padding | - | 24px | 24px |
| Avatar SM | 32px | - | - |
| Avatar MD | 40px | - | - |
| Avatar LG | 48px | - | - |

---

## 6. Component Library Status

### Current Implementation (components/b2b/)

| Component | Status | Source Alignment | Notes |
|-----------|--------|------------------|-------|
| Button | ✅ Complete | 🟡 Partial | Add size variants xs/xl |
| Card | ✅ Complete | 🟡 Partial | Add hover states, variants |
| Badge | ✅ Complete | ✅ Good | - |
| Input | ✅ Complete | 🟡 Partial | Add icon support, states |
| Select | ✅ Complete | 🟡 Partial | - |
| Modal | ✅ Complete | 🟡 Partial | Add animations |
| Drawer | ✅ Complete | 🟡 Partial | - |
| DataTable | ✅ Complete | ✅ Good | - |
| Avatar | ✅ Complete | ✅ Good | - |
| Tooltip | ✅ Complete | ✅ Good | - |
| Alert | ✅ Complete | ✅ Good | - |
| StatCard | ✅ Complete | ✅ Good | Maps to KPI Card |
| PageHeader | ✅ Complete | ✅ Good | - |
| Typography | ✅ Complete | 🟡 Partial | Align with type scale |

### Components to Add

| Component | Priority | Description |
|-----------|----------|-------------|
| Skeleton | 🔴 High | Loading states (from source) |
| Toast Container | 🔴 High | Positioned toast system |
| Breadcrumbs | 🟡 Medium | Already exists, enhance styling |
| Progress | 🟡 Medium | Progress bars |
| Tabs | ✅ Exists | In ui/ folder |
| Table | 🟡 Medium | Enhanced from DataTable |

---

## 7. Layout System

### Current vs Recommended Layout

**Current Implementation:**
- Traditional top navigation bar (Header component)
- No persistent sidebar
- AI assistant as floating widget/modal

**Source Design System:**
- Three-column layout (Left Sidebar + Content + Right AI Panel)
- Persistent AI chat panel
- Collapsible sidebars

### B2B+ Layout Decision

For a **B2B e-commerce platform**, we should **keep the simpler top navigation** rather than adopting the three-column layout. Rationale:

1. **E-commerce convention**: Users expect top nav for online stores
2. **Content width**: Product grids need maximum horizontal space
3. **Simplicity**: B2B users want efficiency, not complex dashboards

### Recommended Layout Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│                    STICKY HEADER (Top Navigation)                    │
│  Logo | Products | Orders | Invoices | Analytics |    Cart | User   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│                         MAIN CONTENT AREA                            │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                 PAGE HEADER (Breadcrumbs)                    │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   ┌──────────────┬──────────────────────────────────────────────┐   │
│   │              │                                               │   │
│   │   FILTERS    │           PRODUCT GRID / CONTENT              │   │
│   │  (Collapsible)│                                              │   │
│   │              │                                               │   │
│   └──────────────┴──────────────────────────────────────────────┘   │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                              FOOTER                                  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────┐
│  AI CHAT    │  ← Floating button that opens modal/drawer
│  BUTTON     │     (Replaces persistent right sidebar)
└─────────────┘
```

### Layout CSS Enhancement

```css
/* From source - Apply to page containers */
.page-container {
  max-width: 1440px;
  margin: 0 auto;
  padding: var(--spacing-6);
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--spacing-6);
}

/* Product grid responsive */
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-6);
}
```

---

## 8. Navigation System

### Header Enhancement

The current Header component is functional but could benefit from source design system patterns:

**Enhancements to Apply:**

1. **Consistent nav item styling** (from source `.nav-item`)
2. **Active state highlighting** (already implemented)
3. **Responsive behavior** (add mobile hamburger menu)
4. **Notification badges** (for cart count - already done)

### Navigation CSS Patterns

```css
/* From source - Adapt for top nav */
.nav-item {
  display: flex;
  align-items: center;
  height: 44px;
  padding: 0 var(--spacing-3);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--b2b-text);
  border-radius: var(--border-radius-lg);
  transition: all var(--transition-fast) var(--ease-in-out);
}

.nav-item:hover {
  background: rgba(0, 82, 204, 0.1); /* B2B Blue 10% */
  color: var(--b2b-blue-600);
}

.nav-item.active {
  background: var(--b2b-blue-50);
  color: var(--b2b-blue-600);
}

/* Mobile nav */
@media (max-width: 768px) {
  .mobile-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-around;
    background: white;
    border-top: 1px solid var(--border);
    padding: 0.5rem 0;
    z-index: var(--z-fixed);
  }
}
```

---

## 9. AI Chat Interface

### Current Implementation
- `EmbeddedAIAssistantPanel.tsx` - Embedded panel component
- `PublicChatbotWidget.tsx` - Public-facing floating widget

### Recommended Pattern (From Source)

The source design system includes a comprehensive AI chat panel specification. For B2B+, we adapt this as a **drawer/modal** rather than persistent sidebar:

```typescript
// AI Chat Interface Structure
interface ChatInterface {
  trigger: 'Floating Action Button (FAB)';
  container: 'Right-side Drawer';
  width: '400px';
  features: [
    'Context awareness (current page)',
    'Quick action suggestions',
    'Streaming responses',
    'Message history',
    'Quick action chips'
  ];
}
```

### Chat UI Patterns to Adopt

```css
/* Message bubbles - from source */
.chat-message--user .message-content {
  background: var(--b2b-blue-500);
  color: white;
  border-radius: var(--border-radius-xl);
  border-bottom-right-radius: var(--border-radius-sm);
}

.chat-message--ai .message-content {
  background: var(--b2b-gray-100);
  color: var(--b2b-text);
  border-radius: var(--border-radius-xl);
  border-bottom-left-radius: var(--border-radius-sm);
}

/* Chat typing indicator */
@keyframes typingBounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-8px); }
}

.typing-dot {
  animation: typingBounce 1.4s infinite;
}
.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }
```

---

## 10. Animation & Motion

### Animation Library to Add

The source design system has comprehensive motion patterns. Add to `globals.css`:

```css
/* ═══════════════════════════════════════════════════════════════════
   ANIMATION LIBRARY (from source design system)
   ═══════════════════════════════════════════════════════════════════ */

/* Button Press */
.btn:active {
  transform: scale(0.98);
}

/* Card Hover Lift */
.card-hoverable {
  transition: transform var(--transition-normal) var(--ease-out),
              box-shadow var(--transition-normal) var(--ease-out);
}

.card-hoverable:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

/* Fade In Up */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in-up {
  animation: fadeInUp var(--transition-slow) var(--ease-out) forwards;
}

/* Modal Enter */
@keyframes modalEnter {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-enter {
  animation: modalEnter var(--transition-normal) var(--ease-out) forwards;
}

/* Skeleton Loading */
@keyframes skeleton {
  0% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    #f0f0f0 25%,
    #e0e0e0 50%,
    #f0f0f0 75%
  );
  background-size: 200% 100%;
  animation: skeleton 1.5s ease-in-out infinite;
  border-radius: var(--border-radius-md);
}

/* Toast Enter */
@keyframes toastIn {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Stagger Children */
.stagger-children > * {
  opacity: 0;
  animation: fadeInUp var(--transition-slow) var(--ease-out) forwards;
}

.stagger-children > *:nth-child(1) { animation-delay: 0ms; }
.stagger-children > *:nth-child(2) { animation-delay: 50ms; }
.stagger-children > *:nth-child(3) { animation-delay: 100ms; }
.stagger-children > *:nth-child(4) { animation-delay: 150ms; }
.stagger-children > *:nth-child(5) { animation-delay: 200ms; }

/* Reduced Motion Support */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 11. Accessibility Standards

### Adopted from Source (WCAG 2.1 AA)

| Requirement | Status | Notes |
|-------------|--------|-------|
| Color Contrast 4.5:1 | ✅ | B2B palette tested |
| Focus States | ⚠️ Review | Ensure all interactive elements |
| Keyboard Navigation | ⚠️ Review | Test all flows |
| Screen Reader Support | ⚠️ Review | Add ARIA where needed |
| Skip Links | ❌ Missing | Add to layout |
| Reduced Motion | ❌ Missing | Add media query |

### Focus Styles to Add

```css
/* From source - Enhanced focus styles */
:focus-visible {
  outline: 3px solid var(--b2b-blue-400);
  outline-offset: 2px;
}

/* Skip to Content Link */
.skip-link {
  position: absolute;
  top: -100%;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.5rem 1rem;
  background: var(--b2b-blue-600);
  color: white;
  font-weight: 600;
  border-radius: var(--border-radius-md);
  z-index: var(--z-tooltip);
  transition: top var(--transition-fast);
}

.skip-link:focus {
  top: 0.5rem;
}

/* Screen Reader Only */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

---

## 12. Responsive Design

### Breakpoint System

Keep Tailwind defaults but document usage:

| Breakpoint | Tailwind | Description |
|------------|----------|-------------|
| xs | < 640px | Small phones |
| sm | 640px+ | Large phones |
| md | 768px+ | Tablets |
| lg | 1024px+ | Small desktops |
| xl | 1280px+ | Desktops |
| 2xl | 1536px+ | Large desktops |

### Responsive Patterns

```css
/* Mobile-first approach */

/* Mobile: Single column */
@media (max-width: 639px) {
  .product-grid {
    grid-template-columns: 1fr;
  }
  
  .header-nav {
    display: none; /* Use mobile nav */
  }
}

/* Tablet: 2 columns */
@media (min-width: 640px) and (max-width: 1023px) {
  .product-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .filter-sidebar {
    position: fixed;
    transform: translateX(-100%); /* Hidden by default */
  }
  
  .filter-sidebar.open {
    transform: translateX(0);
  }
}

/* Desktop: 3-4 columns */
@media (min-width: 1024px) {
  .product-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .filter-sidebar {
    position: relative;
    transform: none;
  }
}

@media (min-width: 1280px) {
  .product-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

---

## 13. Dark Mode

### Current Status
The project has a `.dark` class defined in globals.css but with minimal customization.

### Dark Mode Enhancement (From Source)

```css
/* Enhanced Dark Mode - Add to globals.css */
.dark {
  /* Surfaces */
  --surface-page: #0B1437;
  --surface-card: #111C44;
  --surface-elevated: #1B254B;
  
  /* B2B Blues adjusted for dark mode */
  --b2b-blue-50: #1B254B;
  --b2b-blue-100: #2D3A6F;
  --b2b-blue-500: #3385FF; /* Brighter for contrast */
  
  /* Text */
  --b2b-text: #FFFFFF;
  --b2b-text-secondary: #A3AED0;
  --b2b-text-muted: #707EAE;
  
  /* Borders */
  --border: #2D3A5F;
  
  /* Shadows need adjustment for dark */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.5);
}
```

---

## 14. Implementation Roadmap

### Phase 1: Foundation (Week 1)
**Priority: High | Effort: Medium**

- [ ] Add design tokens to `globals.css` (transitions, z-index, spacing)
- [ ] Add DM Sans font
- [ ] Update Tailwind config with extended spacing scale
- [ ] Add animation library CSS
- [ ] Add accessibility utilities (skip link, sr-only, focus styles)

### Phase 2: Component Enhancement (Week 2)
**Priority: High | Effort: Medium**

- [ ] Update Button component with all size variants
- [ ] Enhance Card component with hover states
- [ ] Add Skeleton component for loading states
- [ ] Enhance Input with icon support
- [ ] Standardize typography classes

### Phase 3: Layout & Navigation (Week 3)
**Priority: Medium | Effort: Low**

- [ ] Add mobile hamburger menu to Header
- [ ] Add bottom mobile navigation
- [ ] Enhance breadcrumbs styling
- [ ] Add skip-to-content link

### Phase 4: AI Chat Enhancement (Week 4)
**Priority: Medium | Effort: Medium**

- [ ] Enhance AI chat panel styling (message bubbles, typing indicator)
- [ ] Add context-aware quick actions
- [ ] Improve chat input area
- [ ] Add streaming response styling

### Phase 5: Polish (Week 5)
**Priority: Low | Effort: Medium**

- [ ] Complete dark mode implementation
- [ ] Add stagger animations to product grids
- [ ] Accessibility audit
- [ ] Performance audit for animations

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-12-07 | System | Initial adaptation from source design system |

---

**Note:** This document is the B2B-adapted version of the source UI/UX Design System. The original document has been kept unchanged for reference. This document should be the primary reference for B2B+ platform development.
