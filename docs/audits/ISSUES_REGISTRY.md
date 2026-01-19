# Issues Registry

**Generated:** 2026-01-18
**Project:** B2B Plus
**Total Issues:** 23

## Overview

This registry tracks all issues discovered during the comprehensive project audit. Issues are prioritized using a 4-tier severity system:

- **CRITICAL (3)** - Blocks production deployment
- **HIGH (4)** - Should fix before production
- **MEDIUM (8)** - Production OK, fix soon after launch
- **LOW (8)** - Nice to have improvements

---

## CRITICAL Issues (Blocks Production)

| ID | Area | Description | Location | Impact | Effort | Dependencies |
|----|------|-------------|----------|--------|--------|--------------|
| **CRIT-01** | Monitoring | No APM or error tracking beyond Sentry | Global | Cannot debug performance issues or track errors effectively | 6h | APM tool selection |
| **CRIT-02** | Security | Rate limiting missing on AI endpoints | `apps/web/app/api/chat/**/*` | Potential abuse, uncontrolled costs | 4h | None |

**Total Critical Effort:** 10 hours

> **Note:** Docker configuration removed - deploying to Vercel/Netlify (managed platforms)

---

## HIGH Priority Issues (Fix Before Production)

| ID | Area | Description | Location | Impact | Effort | Dependencies |
|----|------|-------------|----------|--------|--------|--------------|
| **HIGH-01** | Validation | Limited input validation on API routes (79/86 routes missing) | `apps/web/app/api/**/*` | Security vulnerability, data integrity | 40h | None |
| **HIGH-02** | Type Safety | Missing TypeScript types for AI responses | `apps/web/lib/*.ts` | Runtime errors, poor DX | 8h | None |
| **HIGH-03** | Authentication | Incomplete auth error handling | `apps/web/contexts/AuthContext.tsx` | Poor UX, potential auth bypass | 4h | None |
| **HIGH-04** | Security | CSP has unsafe-eval/unsafe-inline in development | `apps/web/next.config.js:88-89` | XSS risk if dev CSP used in production | 2h | None |

**Total High Priority Effort:** 54 hours

---

## MEDIUM Priority Issues (Fix Soon After Launch)

| ID | Area | Description | Location | Impact | Effort | Dependencies |
|----|------|-------------|----------|--------|--------|--------------|
| **MED-01** | Testing | No integration tests for API routes | `apps/web/app/api/**/*` | Cannot verify end-to-end flows | 16h | Test framework setup |
| **MED-02** | Testing | Missing E2E tests for critical user flows | Root | Cannot verify production-like scenarios | 20h | Playwright setup |
| **MED-03** | Performance | No caching strategy for AI responses | `apps/web/app/api/chat/route.ts` | Slow response times, high costs | 8h | Redis/Upstash |
| **MED-04** | Documentation | API documentation incomplete | `docs/api/**/*` | Poor developer onboarding | 8h | None |
| **MED-05** | Documentation | Missing deployment guide | `docs/` | Difficult to deploy/maintain | 6h | Docker completion |
| **MED-06** | Code Quality | Inconsistent error handling patterns | Multiple files | Unpredictable behavior | 10h | None |
| **MED-07** | Code Quality | TODO/FIXME comments not addressed | 7 files | Technical debt accumulation | 12h | None |
| **MED-08** | UI/UX | Loading states missing in several components | `apps/web/components/**/*` | Poor perceived performance | 8h | None |

**Total Medium Priority Effort:** 88 hours

---

## LOW Priority Issues (Nice to Have)

| ID | Area | Description | Location | Impact | Effort | Dependencies |
|----|------|-------------|----------|--------|--------|--------------|
| **LOW-01** | Performance | No image optimization strategy | `apps/web/components/**/*` | Slower page loads | 4h | None |
| **LOW-02** | Performance | Missing service worker/PWA support | Root | No offline capability | 12h | None |
| **LOW-03** | Code Quality | Inconsistent component structure | `apps/web/components/**/*` | Harder to maintain | 8h | None |
| **LOW-04** | Code Quality | No code formatting enforcement | Root | Inconsistent style | 2h | Prettier setup |
| **LOW-05** | Documentation | Missing architecture diagrams | `docs/` | Harder to understand system | 6h | None |
| **LOW-06** | Documentation | No API changelog | `docs/` | Breaking changes not tracked | 4h | None |
| **LOW-07** | Testing | No visual regression testing | Root | UI bugs not caught | 12h | Percy/Chromatic |
| **LOW-08** | Accessibility | ARIA labels incomplete | `apps/web/components/**/*` | Poor screen reader support | 8h | None |

**Total Low Priority Effort:** 56 hours

---

## Summary Statistics

| Severity | Count | Total Effort | Avg Effort/Issue |
|----------|-------|--------------|------------------|
| CRITICAL | 2 | 10h | 5h |
| HIGH | 4 | 54h | 13.5h |
| MEDIUM | 8 | 88h | 11h |
| LOW | 8 | 56h | 7h |
| **TOTAL** | **22** | **208h** | **9.5h** |

> **Note:** Docker task removed (8h) - using Vercel/Netlify managed deployment

---

## Issue Resolution Workflow

### 1. Critical Issues (Week 1)
Must be resolved before production deployment. Block all launch activities until complete.

**Recommended Order:**
1. CRIT-01 (APM/error tracking) - Observability
2. CRIT-02 (AI rate limiting) - Security/cost control

### 2. High Priority Issues (Week 2-3)
Should be resolved before production launch for stability and maintainability.

**Recommended Order:**
1. HIGH-03 (Auth error handling) - User-facing
2. HIGH-01 (Input validation) - Security (79 routes)
3. HIGH-02 (Type safety) - Developer experience
4. HIGH-04 (CSP hardening) - Security

### 3. Medium Priority Issues (Week 4-5)
Can be resolved post-launch but should be prioritized in first sprint after launch.

**Recommended Order:**
1. MED-03 (Caching strategy) - Cost/performance
2. MED-06 (Error handling patterns) - Code quality
3. MED-07 (TODO cleanup) - Technical debt
4. MED-01, MED-02 (Testing) - Quality assurance
5. Others as capacity allows

### 4. Low Priority Issues (Ongoing)
Address as part of continuous improvement cycles.

---

## Cross-References

- **Production Checklist:** See `PRODUCTION_CHECKLIST.md` for verification steps
- **Implementation Roadmap:** See `IMPLEMENTATION_ROADMAP.md` for sprint planning
- **Cleanup Plan:** See `CLEANUP_PLAN.md` for documentation improvements
- **Audit Summary:** See `AUDIT_SUMMARY.md` for executive overview

---

## Notes

- Effort estimates are based on senior developer velocity
- Dependencies listed are external only (internal dependencies tracked in roadmap)
- Issues may be combined into single tasks in implementation roadmap
- New issues should be added with next available ID in appropriate severity tier
