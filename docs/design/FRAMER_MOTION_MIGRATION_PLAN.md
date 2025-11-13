# 🎬 Framer Motion Migration Plan
**Complete Transition from Tailwind/CSS Animations to Framer Motion**

**Date:** January 5, 2025  
**Status:** Planning Phase  
**Estimated Duration:** 2-3 days

---

## 📊 Audit Results

### Current Animation Usage
- **62 files** using `animate-*` Tailwind classes
- **64 files** using `transition-*` classes  
- **14 CSS keyframes** in `globals.css`
- **Framer Motion**: Already installed (`^11.0.0`) but **NOT actively used**

### CSS Keyframes to Remove
Located in `apps/web/app/globals.css`:
1. `@keyframes fadeIn`
2. `@keyframes slideUp`
3. `@keyframes slideDown`
4. `@keyframes scaleIn`

### Tailwind Config to Clean
Located in `apps/web/tailwind.config.ts`:
- Remove `keyframes` object (fade-in, slide-up)
- Remove `animation` object
- Consider removing `tailwindcss-animate` plugin

---

## 🎯 Migration Strategy

### Phase 1: Foundation (Day 1 Morning)
**Create Framer Motion Animation System**

#### 1.1 Create `/apps/web/lib/animations/` Directory Structure
```
apps/web/lib/animations/
├── index.ts              # Main export
├── variants.ts           # Reusable animation variants
├── transitions.ts        # Timing functions & spring configs
├── constants.ts          # Duration, easing, stagger values
└── hooks/
    ├── useScrollAnimation.ts
    ├── useStaggerChildren.ts
    └── usePageTransition.ts
```

#### 1.2 Define Standard Animation Variants
**File: `variants.ts`**
- `fadeIn` - Opacity 0 → 1
- `fadeOut` - Opacity 1 → 0
- `slideUp` - Translate Y + fade
- `slideDown` - Translate -Y + fade
- `slideLeft` - Translate X + fade
- `slideRight` - Translate -X + fade
- `scaleIn` - Scale 0.95 → 1 + fade
- `scaleOut` - Scale 1 → 0.95 + fade
- `staggerContainer` - Parent for stagger children
- `staggerItem` - Child item for stagger

#### 1.3 Define Transition Presets
**File: `transitions.ts`**
- `smooth` - Ease-out, 0.3s
- `fast` - Ease-out, 0.15s
- `slow` - Ease-out, 0.5s
- `spring` - Spring physics (default)
- `springBouncy` - Bouncy spring
- `springStiff` - Stiff spring

---

### Phase 2: B2B Core Components (Day 1 Afternoon)
**Migrate 15 B2B Components to Framer Motion**

#### Priority Order:
1. **Card** - Most used, simple hover animation
2. **Button** - Loading states, hover, tap animations
3. **Modal** - Enter/exit animations, backdrop fade
4. **Drawer** - Slide in/out animations
5. **Badge** - Subtle scale on mount
6. **Tooltip** - Fade + scale animation (replace Radix animate-in)
7. **Input** - Focus animations, error shake
8. **Select** - Dropdown animations
9. **Textarea** - Focus animations
10. **DataTable** - Loading spinner, row stagger
11. **ProductCard** - Hover lift, image zoom
12. **StatCard** - Number count-up animation
13. **PageHeader** - Slide in on mount
14. **Avatar** - Fade in image load
15. **Icon** - Optional pulse/spin animations

#### Component Migration Pattern:
```tsx
// BEFORE (Tailwind)
<div className="transition-all hover:shadow-lg hover:-translate-y-0.5">
  {children}
</div>

// AFTER (Framer Motion)
import { motion } from 'framer-motion';
import { fadeIn, smooth } from '@/lib/animations';

<motion.div
  variants={fadeIn}
  initial="hidden"
  animate="visible"
  transition={smooth}
  whileHover={{ y: -2, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
>
  {children}
</motion.div>
```

---

### Phase 3: Phase 4 Admin Components (Day 2 Morning)
**Migrate 5 Admin Components**

1. **OpportunityCard** - Card animations, button interactions
2. **PricingRecommendationCard** - Card animations, form interactions
3. **ForecastChart** - Chart entrance animation
4. **InventoryRecommendations** - List stagger animation
5. **PricingHistory** - Timeline entrance animation

---

### Phase 4: Page-Level Animations (Day 2 Afternoon)
**Add Advanced Animations**

#### 4.1 Page Transitions
- Wrap app in `<AnimatePresence mode="wait">`
- Add route change animations (fade + slide)
- Loading state animations

#### 4.2 List/Grid Stagger Effects
- Product grids - stagger children on load
- Admin tables - stagger rows
- Dashboard cards - stagger on mount

#### 4.3 Scroll-Triggered Animations
- Landing page sections - fade in on scroll
- Product cards - reveal on scroll
- Stats counters - count up on scroll into view

#### 4.4 Gesture Animations
- Drag-to-reorder (admin tables)
- Swipe-to-delete (mobile lists)
- Pull-to-refresh (mobile)

---

### Phase 5: Cleanup (Day 3 Morning)
**Remove Old Animation System**

#### 5.1 Remove CSS Keyframes
- Delete all `@keyframes` from `globals.css`
- Remove `.animate-*` utility classes

#### 5.2 Clean Tailwind Config
- Remove `keyframes` object
- Remove `animation` object
- Remove `tailwindcss-animate` plugin (if not needed for Radix)

#### 5.3 Update All Files
- Search & replace `animate-fade-in` → Framer Motion
- Search & replace `animate-slide-up` → Framer Motion
- Search & replace `transition-all` → Framer Motion
- Remove `animate-spin` (use Framer Motion)

---

### Phase 6: Testing & Optimization (Day 3 Afternoon)
**Verify Everything Works**

#### 6.1 Manual Testing
- Test all B2B components
- Test all admin pages
- Test mobile responsiveness
- Test animation performance

#### 6.2 Performance Audit
- Check bundle size impact
- Verify 60fps animations
- Test on low-end devices
- Optimize heavy animations

#### 6.3 Accessibility
- Respect `prefers-reduced-motion`
- Ensure keyboard navigation works
- Test screen reader compatibility

---

## 📦 New Files to Create

### Core Animation System
1. `apps/web/lib/animations/index.ts`
2. `apps/web/lib/animations/variants.ts`
3. `apps/web/lib/animations/transitions.ts`
4. `apps/web/lib/animations/constants.ts`
5. `apps/web/lib/animations/hooks/useScrollAnimation.ts`
6. `apps/web/lib/animations/hooks/useStaggerChildren.ts`
7. `apps/web/lib/animations/hooks/usePageTransition.ts`

### Layout Wrappers
8. `apps/web/components/AnimatedPage.tsx` - Page transition wrapper
9. `apps/web/components/StaggerList.tsx` - Stagger children wrapper

---

## 🔧 Files to Modify

### B2B Components (15 files)
- `apps/web/components/b2b/Card.tsx`
- `apps/web/components/b2b/Button.tsx`
- `apps/web/components/b2b/Modal.tsx`
- `apps/web/components/b2b/Drawer.tsx`
- `apps/web/components/b2b/Badge.tsx`
- `apps/web/components/b2b/Tooltip.tsx`
- `apps/web/components/b2b/Input.tsx`
- `apps/web/components/b2b/Select.tsx`
- `apps/web/components/b2b/Textarea.tsx`
- `apps/web/components/b2b/DataTable.tsx`
- `apps/web/components/b2b/ProductCard.tsx`
- `apps/web/components/b2b/StatCard.tsx`
- `apps/web/components/b2b/PageHeader.tsx`
- `apps/web/components/b2b/Avatar.tsx`
- `apps/web/components/b2b/Icon.tsx`

### Admin Components (5 files)
- `apps/web/components/admin/OpportunityCard.tsx`
- `apps/web/components/admin/PricingRecommendationCard.tsx`
- `apps/web/components/admin/ForecastChart.tsx`
- `apps/web/components/admin/InventoryRecommendations.tsx`
- `apps/web/components/admin/PricingHistory.tsx`

### Config Files (2 files)
- `apps/web/tailwind.config.ts` - Remove animation config
- `apps/web/app/globals.css` - Remove keyframes

### Pages (40+ files using animate-* or transition-*)
- All files found in audit will be updated incrementally

---

## ✅ Success Criteria

1. ✅ Zero `animate-*` Tailwind classes in codebase
2. ✅ Zero CSS `@keyframes` in globals.css
3. ✅ All B2B components use Framer Motion
4. ✅ All admin components use Framer Motion
5. ✅ Page transitions implemented
6. ✅ Stagger animations on lists/grids
7. ✅ Scroll-triggered animations working
8. ✅ Performance: 60fps on all animations
9. ✅ Accessibility: `prefers-reduced-motion` respected
10. ✅ Bundle size: < 50KB increase (Framer Motion is tree-shakeable)

---

## 🚀 Benefits After Migration

### Developer Experience
- ✅ Declarative, component-based animations
- ✅ TypeScript support with autocomplete
- ✅ Reusable animation variants
- ✅ Easy to compose complex animations
- ✅ Better debugging with Framer Motion DevTools

### User Experience
- ✅ Smoother, more natural animations (spring physics)
- ✅ Better performance (GPU-accelerated)
- ✅ Advanced interactions (drag, gestures)
- ✅ Page transitions for better navigation feel
- ✅ Scroll-triggered animations for engagement

### Codebase Quality
- ✅ Single animation system (no Tailwind + CSS mix)
- ✅ Consistent animation timing across app
- ✅ Easier to maintain and extend
- ✅ Better code organization

---

## 📝 Next Steps

1. **Review & Approve Plan** - Get stakeholder approval
2. **Start Phase 1** - Create animation system foundation
3. **Migrate Components** - Follow priority order
4. **Test Thoroughly** - Ensure no regressions
5. **Deploy** - Ship improved animations to production

---

**Ready to begin migration? Approve this plan to proceed with Phase 1.**

