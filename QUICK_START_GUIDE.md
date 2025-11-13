# B2B+ Quick Start Guide - Fixing Critical Issues

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- pnpm 8+
- Access to Supabase project
- Access to environment variables

### Setup
```bash
# Clone and install
cd b2b-plus
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test
```

---

## 🔥 Start Here: Top 5 Critical Fixes (Day 1)

### 1️⃣ Fix Reorder API (30 minutes)

**File:** `apps/web/app/api/orders/reorder/route.ts`

**Before:**
```typescript
const { data: userData, error: userError } = await supabase
  .from('users')
  .select('organization_id')
  .eq('id', user.id)
  .single();

const organizationId = userData.organization_id;
```

**After:**
```typescript
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('current_organization_id')
  .eq('id', user.id)
  .single();

if (profileError || !profile) {
  return NextResponse.json(
    { error: 'User profile not found' },
    { status: 404 }
  );
}

const organizationId = profile.current_organization_id;
```

**Test:**
```bash
# Manual test
curl -X POST http://localhost:3000/api/orders/reorder \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"orderId": "valid-order-id"}'
```

---

### 2️⃣ Fix Organization Approval Check (1 hour)

**File:** `apps/web/app/(customer)/checkout/page.tsx`

**Add this check in `loadCheckoutData` function:**

```typescript
// After getting profile, check organization approval
const { data: orgMember, error: orgError } = await supabase
  .from('organization_members')
  .select(`
    organization:organizations!inner(
      id,
      name,
      approval_status,
      rejection_reason
    )
  `)
  .eq('user_id', user.id)
  .single();

if (orgError || !orgMember) {
  toast({
    variant: "destructive",
    title: "Error",
    description: "Organization membership not found",
  });
  router.push('/profile');
  return;
}

const org = orgMember.organization as any;

if (org.approval_status === 'pending') {
  toast({
    variant: "warning",
    title: "Organization Pending Approval",
    description: "Your organization is pending approval. You cannot place orders yet.",
  });
  router.push('/profile');
  return;
}

if (org.approval_status === 'rejected') {
  toast({
    variant: "destructive",
    title: "Organization Rejected",
    description: org.rejection_reason || "Your organization registration was rejected.",
  });
  router.push('/profile');
  return;
}

if (org.approval_status !== 'approved') {
  toast({
    variant: "destructive",
    title: "Organization Not Approved",
    description: "Please contact support.",
  });
  router.push('/profile');
  return;
}
```

**Also add to cart page:** `apps/web/app/(customer)/cart/page.tsx`

---

### 3️⃣ Fix Rate Limiting Fail-Closed (1 hour)

**File:** `apps/web/lib/middleware/rate-limit.ts`

**Before:**
```typescript
} catch (error) {
  console.error('Rate limit check failed:', error);
  // On error, allow the request but log it
  return { allowed: true };
}
```

**After:**
```typescript
} catch (error) {
  console.error('Rate limit check failed:', error);
  
  // Fail closed - reject requests when rate limiting fails
  return {
    allowed: false,
    response: NextResponse.json(
      {
        error: 'Rate limiting service unavailable',
        message: 'Please try again in a moment.',
      },
      {
        status: 503, // Service Unavailable
        headers: {
          'Retry-After': '60', // Retry after 60 seconds
        },
      }
    ),
  };
}
```

**Add in-memory fallback (at top of file):**
```typescript
// In-memory fallback rate limiter
const memoryLimiter = new Map<string, { count: number; resetAt: number }>();

function fallbackRateLimit(identifier: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = memoryLimiter.get(identifier);
  
  if (!entry || now > entry.resetAt) {
    // Reset or create new entry
    memoryLimiter.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  if (entry.count >= limit) {
    return false;
  }
  
  entry.count++;
  return true;
}

// Clean up old entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of memoryLimiter.entries()) {
    if (now > value.resetAt) {
      memoryLimiter.delete(key);
    }
  }
}, 60000);
```

**Update rateLimit function to use fallback:**
```typescript
export async function rateLimit(
  request: NextRequest,
  type: keyof typeof RATE_LIMITS = 'authenticated'
): Promise<{ allowed: boolean; response?: NextResponse }> {
  const identifier = getIdentifier(request);
  
  try {
    const limiter = getRateLimiter(type);
    const { success, limit, remaining, reset } = await limiter.limit(identifier);
    
    // ... rest of existing code
    
  } catch (error) {
    console.error('Rate limit check failed, using fallback:', error);
    
    // Use in-memory fallback
    const config = RATE_LIMITS[type];
    const allowed = fallbackRateLimit(identifier, config.requests, config.window);
    
    if (!allowed) {
      return {
        allowed: false,
        response: NextResponse.json(
          {
            error: 'Too many requests',
            message: 'Rate limit exceeded. Using fallback limiter.',
          },
          { status: 429 }
        ),
      };
    }
    
    return { allowed: true };
  }
}
```

---

### 4️⃣ Fix Magic Link Password Generation (30 minutes)

**File:** `apps/web/app/api/auth/magic-link/verify/route.ts`

**Create helper function:**
```typescript
function generateSecurePassword(): string {
  const length = 32;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  const randomBytes = crypto.getRandomValues(new Uint8Array(length));
  
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }
  
  return password;
}
```

**Replace:**
```typescript
password: crypto.randomUUID(), // OLD
```

**With:**
```typescript
password: generateSecurePassword(), // NEW - 32 character secure password
```

---

### 5️⃣ Fix Cart Pricing Display (2 hours)

**File:** `apps/web/components/CartView.tsx`

**Step 1: Add pricing state**
```typescript
const [itemPricing, setItemPricing] = useState<Record<string, any>>({});
const [loadingPricing, setLoadingPricing] = useState(true);
```

**Step 2: Fetch pricing for all items**
```typescript
const fetchPricing = async () => {
  setLoadingPricing(true);
  const pricing: Record<string, any> = {};
  
  for (const item of cartItems) {
    try {
      const response = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: item.product_id,
          quantity: item.quantity,
          customer_organization_id: item.organization_id,
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        pricing[item.id] = data.pricing;
      }
    } catch (error) {
      console.error('Failed to fetch pricing:', error);
      // Fallback to base price
      pricing[item.id] = {
        unit_price: item.products.base_price,
        line_total: item.products.base_price * item.quantity,
      };
    }
  }
  
  setItemPricing(pricing);
  setLoadingPricing(false);
};

useEffect(() => {
  if (cartItems.length > 0) {
    fetchPricing();
  }
}, [cartItems]);
```

**Step 3: Update display to show calculated price**
```typescript
// Replace calculateTotal function
const calculateTotal = () => {
  return Object.values(itemPricing).reduce((total: number, pricing: any) => {
    return total + (pricing?.line_total || 0);
  }, 0);
};

// Update price display in cart item
<div className="text-right">
  {loadingPricing ? (
    <div>Loading price...</div>
  ) : (
    <>
      {itemPricing[item.id]?.discount_amount > 0 && (
        <p className="text-sm text-gray-500 line-through">
          ${(item.products.base_price * item.quantity).toFixed(2)}
        </p>
      )}
      <p className="text-lg font-bold text-gray-900">
        ${(itemPricing[item.id]?.line_total || 0).toFixed(2)}
      </p>
      {itemPricing[item.id]?.discount_percentage > 0 && (
        <span className="text-sm text-green-600">
          {itemPricing[item.id].discount_percentage}% off
        </span>
      )}
    </>
  )}
</div>
```

---

## 🔐 Security Checklist (Complete These Next)

### Day 2 Tasks:

- [ ] **TASK-006**: Implement CSRF protection on all routes
- [ ] **TASK-009**: Fix admin authorization 
- [ ] **TASK-011**: Remove unsafe-inline from CSP
- [ ] **TASK-018**: Add AI input sanitization

### Quick CSRF Implementation:

**1. Create hook:** `apps/web/hooks/useCSRF.ts`
```typescript
import { useEffect, useState } from 'react';

export function useCSRF() {
  const [token, setToken] = useState<string | null>(null);
  
  useEffect(() => {
    fetch('/api/csrf-token')
      .then(res => res.json())
      .then(data => setToken(data.token))
      .catch(console.error);
  }, []);
  
  return token;
}
```

**2. Add to fetch wrapper:**
```typescript
export async function fetchWithCSRF(url: string, options: RequestInit = {}) {
  const response = await fetch('/api/csrf-token');
  const { token } = await response.json();
  
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'x-csrf-token': token,
    },
  });
}
```

**3. Apply to API routes:**
```typescript
import { withCSRFProtection } from '@/lib/middleware/csrf';

export const POST = withCSRFProtection(async (request: NextRequest) => {
  // Your handler code
});
```

---

## 🧪 Testing Your Fixes

### Run Unit Tests
```bash
cd apps/web
pnpm test
```

### Run E2E Tests
```bash
pnpm exec playwright test
```

### Manual Testing Checklist

After implementing fixes:

- [ ] Test reorder functionality
- [ ] Try checkout with unapproved organization (should block)
- [ ] Test cart pricing shows discounts
- [ ] Verify rate limiting works (make 100+ requests)
- [ ] Test magic link account creation
- [ ] Navigate around site (verify no excessive API calls)

---

## 📊 Monitoring Your Changes

### Check Logs
```bash
# In Supabase dashboard
# Navigate to Logs > API

# Look for:
# - Rate limit hits
# - Failed authentications
# - Pricing calculation errors
```

### Performance Testing
```bash
# Use browser DevTools
# Network tab: Count requests per page
# Before fix: ~20 requests per navigation
# After fix: ~3 requests per navigation
```

---

## 🆘 Troubleshooting

### Issue: Reorder still failing
**Check:** Database migration ran successfully
```sql
-- In Supabase SQL Editor
SELECT * FROM profiles LIMIT 1;
-- Verify current_organization_id column exists
```

### Issue: Rate limiting not working
**Check:** Redis connection
```typescript
// Add to rate-limit.ts
console.log('Redis URL:', process.env.UPSTASH_REDIS_REST_URL);
```

### Issue: Pricing not showing
**Check:** API endpoint response
```bash
curl -X POST http://localhost:3000/api/pricing/calculate \
  -H "Content-Type: application/json" \
  -d '{"product_id": "...", "quantity": 1, "customer_organization_id": "..."}'
```

---

## 📝 Before You Commit

- [ ] Run `pnpm lint`
- [ ] Run `pnpm type-check`
- [ ] Run `pnpm test`
- [ ] Test manually
- [ ] Update TASK_LIST.md with completion checkboxes
- [ ] Write descriptive commit message

---

## 🚢 Deployment

### Staging Deployment
```bash
# After PR is merged
git checkout main
git pull
# Automatic deployment via CI/CD
```

### Production Deployment
```bash
# After staging verification
# Create release tag
git tag -a v1.0.1 -m "Critical fixes batch 1"
git push origin v1.0.1
```

### Post-Deployment
- [ ] Monitor error rates in Sentry
- [ ] Check API response times
- [ ] Verify user complaints decrease
- [ ] Monitor rate limit metrics

---

## 💡 Tips for Success

1. **One task at a time** - Don't try to fix everything at once
2. **Test thoroughly** - Every fix needs testing
3. **Ask for help** - If stuck for >30 minutes, ask
4. **Document changes** - Update comments and docs
5. **Monitor production** - Watch for regressions

---

## 📚 Additional Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [B2B+ Architecture Doc](./docs/architecture.md)
- [RLS Policies Guide](./docs/rls-policies.md)

---

**Ready to start?** Begin with Task 1 above! 🚀