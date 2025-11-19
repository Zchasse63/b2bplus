# B2B+ Metrics & Instrumentation Plan

This document outlines the key UX, performance, and accessibility metrics for B2B+ and how they will be measured.

## Performance Metrics

### Core Web Vitals

- **Largest Contentful Paint (LCP)**: < 2.5s
  - Measures loading performance
  - Tool: Lighthouse, Web Vitals library

- **First Input Delay (FID)**: < 100ms
  - Measures interactivity
  - Tool: Web Vitals library

- **Cumulative Layout Shift (CLS)**: < 0.1
  - Measures visual stability
  - Tool: Lighthouse, Web Vitals library

### Additional Performance Metrics

- **First Contentful Paint (FCP)**: < 1.8s
- **Time to Interactive (TTI)**: < 3.8s
- **Total Blocking Time (TBT)**: < 300ms
- **Bundle Size**: Monitor JavaScript bundle size per route
- **API Response Time**: < 500ms for 95th percentile

## UX Metrics

### User Engagement

- **Page Load Completion Rate**: % of users who complete page load
- **Task Completion Rate**: % of users who complete key workflows
- **Error Rate**: % of interactions that result in errors
- **Retry Rate**: % of users who retry failed actions

### User Satisfaction

- **System Usability Scale (SUS)**: Quarterly survey (target: > 70)
- **Net Promoter Score (NPS)**: Quarterly survey (target: > 50)
- **Task Success Rate**: % of users who complete tasks without assistance

### Navigation & Discovery

- **Command Palette Usage**: % of users using ⌘K
- **Feature Discovery Rate**: % of users discovering new features
- **Navigation Efficiency**: Average clicks to reach target page

## Accessibility Metrics

### Automated Testing

- **Lighthouse Accessibility Score**: Target 90+
- **axe DevTools Issues**: 0 critical, < 5 warnings
- **WAVE Errors**: 0 errors per page

### Manual Testing

- **Keyboard Navigation**: 100% of interactive elements keyboard accessible
- **Screen Reader Compatibility**: Tested with NVDA, JAWS, VoiceOver
- **Color Contrast**: 100% of text meets WCAG AA (4.5:1)
- **Focus Visibility**: 100% of interactive elements have visible focus

### User Testing

- **Accessibility Audit**: Quarterly with accessibility specialist
- **User Testing with Assistive Tech**: Quarterly with users using screen readers

## Instrumentation

### Tools & Setup

1. **Lighthouse CI**
   - Automated performance testing on every PR
   - Threshold: LCP < 2.5s, CLS < 0.1

2. **Web Vitals Library**
   - Real user monitoring (RUM)
   - Send metrics to analytics platform

3. **Sentry**
   - Error tracking and monitoring
   - Performance monitoring

4. **Google Analytics**
   - User engagement metrics
   - Task completion tracking
   - Feature usage analytics

5. **Accessibility Testing**
   - axe DevTools in CI
   - Manual testing checklist

### Implementation

```typescript
// apps/web/lib/metrics.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

export function initMetrics() {
  getCLS(console.log);
  getFID(console.log);
  getFCP(console.log);
  getLCP(console.log);
  getTTFB(console.log);
}
```

## Monitoring & Reporting

### Weekly

- Monitor error rates and critical issues
- Check Core Web Vitals trends
- Review user feedback

### Monthly

- Performance report (Lighthouse scores)
- Accessibility audit results
- User engagement metrics

### Quarterly

- UX research (SUS, NPS surveys)
- Accessibility specialist audit
- User testing with assistive technology

## Goals & Targets

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| LCP | TBD | < 2.5s | Q1 2025 |
| CLS | TBD | < 0.1 | Q1 2025 |
| Lighthouse Score | TBD | 90+ | Q1 2025 |
| Accessibility Score | TBD | 90+ | Q1 2025 |
| Task Completion Rate | TBD | > 95% | Q2 2025 |
| NPS | TBD | > 50 | Q2 2025 |

## Resources

- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Sentry](https://sentry.io/)
- [Google Analytics](https://analytics.google.com/)
- [axe DevTools](https://www.deque.com/axe/devtools/)

