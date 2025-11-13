# Email Tracking & Analytics - Complete Design

**Date:** November 2, 2025  
**Status:** Design Phase  
**Goal:** Track email opens, clicks, link engagement, and user activity

---

## Overview

You want to track:
1. ✅ **Email Opens** - When someone opens your email
2. ✅ **Email Clicks** - When someone clicks a link
3. ✅ **Link Tracking** - Which specific links were clicked
4. ✅ **Site Visits** - If they visited your site
5. ✅ **User Login** - If they logged in via magic link
6. ⚠️ **Email Deleted** - Not reliably trackable (email limitation)

---

## What's Already Built ✅

Your CRM already has extensive tracking infrastructure!

### Database Tables (Already Exist)

**1. `email_campaign_recipients`**
```sql
- status: 'pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed'
- sent_at: When email was sent
- delivered_at: When email was delivered
- opened_at: When email was first opened
- clicked_at: When first link was clicked
- replied_at: When they replied
- open_count: Total number of opens
- click_count: Total number of clicks
- magic_link_token: For tracking login
```

**2. `email_campaign_clicks`** (from migration 20251101000006)
```sql
- recipient_id: Who clicked
- url: Which link was clicked
- clicked_at: When it was clicked
- user_agent: Browser/device info
- ip_address: Where they clicked from
```

**3. `lead_activities`**
```sql
- activity_type: 'email_sent', 'email_opened', 'email_clicked', 'site_visit', 'login'
- subject: Email subject
- description: Activity details
- metadata: JSON with tracking data
```

---

## How Email Tracking Works

### 1. Email Opens Tracking

**Method: Tracking Pixel**

When we send an email, we embed a tiny 1x1 transparent image:

```html
<img src="https://yoursite.com/api/track/open?id=recipient-uuid" 
     width="1" height="1" style="display:none" />
```

**When the email is opened:**
1. Email client loads the image
2. Our server receives the request
3. We log: `opened_at`, increment `open_count`
4. Update status to `'opened'`
5. Log activity in CRM

**Limitations:**
- Only works if images are enabled
- Gmail/Outlook may cache images (multiple opens = 1 track)
- ~70-80% accuracy

### 2. Link Click Tracking

**Method: Redirect URLs**

We replace all links in the email with tracking URLs:

**Original Link:**
```
https://yoursite.com/products
```

**Tracking Link:**
```
https://yoursite.com/api/track/click?id=recipient-uuid&url=https://yoursite.com/products
```

**When link is clicked:**
1. User clicks tracking URL
2. Our server logs the click
3. We record: URL, timestamp, user agent, IP
4. Redirect user to actual destination
5. Update `clicked_at`, increment `click_count`
6. Log in `email_campaign_clicks` table

**Accuracy:** ~99% (very reliable)

### 3. Magic Link Tracking

**Already Implemented!** ✅

Your system already has magic links for lead authentication:

```typescript
// From send-personalized route.ts (lines 136-162)
const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');
const magicLink = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/magic-link/verify?token=${token}`;

// Stored in database
await supabase.from('magic_link_tokens').insert({
  lead_id: lead.id,
  token,
  email: lead.email,
  purpose: 'offer_access',
  redirect_url: '/products',
  expires_at: expiresAt, // 7 days
});
```

**When magic link is clicked:**
1. User clicks link in email
2. Verify token in database
3. Log them in automatically
4. Track: `clicked_at`, `login_time`
5. Redirect to products/offers
6. Log activity: `'magic_link_login'`

### 4. Site Visit Tracking

**Method: UTM Parameters + Session Tracking**

Add UTM parameters to all email links:

```
https://yoursite.com/products?utm_source=email&utm_medium=campaign&utm_campaign=new_pricing&utm_content=recipient-uuid
```

**Track in two ways:**

**A. Server-Side (API endpoint)**
```typescript
// /api/track/visit
- Extract UTM parameters
- Look up recipient by uuid
- Log site visit in lead_activities
- Track pages visited
- Track time on site
```

**B. Client-Side (Analytics)**
```typescript
// In your Next.js layout
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const recipientId = params.get('utm_content');
  
  if (recipientId) {
    // Track site visit
    fetch('/api/track/visit', {
      method: 'POST',
      body: JSON.stringify({ recipientId, page: window.location.pathname })
    });
  }
}, []);
```

### 5. User Login Tracking

**Already Tracked!** ✅

Your magic link system already logs when users authenticate.

**Additional tracking:**
```typescript
// After successful login
await supabase.from('lead_activities').insert({
  lead_id: lead.id,
  activity_type: 'login',
  description: 'Logged in via magic link from email campaign',
  metadata: {
    campaign_id: campaignId,
    magic_link_token: token,
    login_time: new Date().toISOString()
  }
});
```

---

## Email Tracking Implementation

### New API Endpoints Needed

**1. `/api/track/open` - Track Email Opens**

```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const recipientId = searchParams.get('id');
  
  if (!recipientId) {
    return new NextResponse(TRACKING_PIXEL, {
      headers: { 'Content-Type': 'image/png' }
    });
  }
  
  const supabase = await createClient();
  
  // Get recipient
  const { data: recipient } = await supabase
    .from('email_campaign_recipients')
    .select('*')
    .eq('id', recipientId)
    .single();
  
  if (recipient) {
    const isFirstOpen = !recipient.opened_at;
    
    // Update recipient
    await supabase
      .from('email_campaign_recipients')
      .update({
        status: 'opened',
        opened_at: isFirstOpen ? new Date().toISOString() : recipient.opened_at,
        open_count: (recipient.open_count || 0) + 1
      })
      .eq('id', recipientId);
    
    // Log activity (only first open)
    if (isFirstOpen) {
      await supabase.from('lead_activities').insert({
        lead_id: recipient.lead_id,
        activity_type: 'email_opened',
        description: 'Opened email campaign',
        metadata: {
          campaign_id: recipient.campaign_id,
          recipient_id: recipientId
        }
      });
    }
  }
  
  // Return 1x1 transparent pixel
  return new NextResponse(TRACKING_PIXEL, {
    headers: { 
      'Content-Type': 'image/png',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}

// 1x1 transparent PNG (base64)
const TRACKING_PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);
```

**2. `/api/track/click` - Track Link Clicks**

```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const recipientId = searchParams.get('id');
  const targetUrl = searchParams.get('url');
  
  if (!recipientId || !targetUrl) {
    return NextResponse.redirect(targetUrl || '/');
  }
  
  const supabase = await createClient();
  
  // Get recipient
  const { data: recipient } = await supabase
    .from('email_campaign_recipients')
    .select('*')
    .eq('id', recipientId)
    .single();
  
  if (recipient) {
    const isFirstClick = !recipient.clicked_at;
    
    // Update recipient
    await supabase
      .from('email_campaign_recipients')
      .update({
        status: 'clicked',
        clicked_at: isFirstClick ? new Date().toISOString() : recipient.clicked_at,
        click_count: (recipient.click_count || 0) + 1
      })
      .eq('id', recipientId);
    
    // Log click details
    await supabase.from('email_campaign_clicks').insert({
      recipient_id: recipientId,
      url: targetUrl,
      clicked_at: new Date().toISOString(),
      user_agent: request.headers.get('user-agent'),
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    });
    
    // Log activity (only first click)
    if (isFirstClick) {
      await supabase.from('lead_activities').insert({
        lead_id: recipient.lead_id,
        activity_type: 'email_clicked',
        description: `Clicked link: ${targetUrl}`,
        metadata: {
          campaign_id: recipient.campaign_id,
          recipient_id: recipientId,
          url: targetUrl
        }
      });
    }
  }
  
  // Redirect to target URL
  return NextResponse.redirect(targetUrl);
}
```

**3. `/api/track/visit` - Track Site Visits**

```typescript
export async function POST(request: NextRequest) {
  const { recipientId, page, referrer } = await request.json();
  
  if (!recipientId) {
    return NextResponse.json({ error: 'Missing recipientId' }, { status: 400 });
  }
  
  const supabase = await createClient();
  
  // Get recipient
  const { data: recipient } = await supabase
    .from('email_campaign_recipients')
    .select('*')
    .eq('id', recipientId)
    .single();
  
  if (recipient) {
    // Log site visit
    await supabase.from('lead_activities').insert({
      lead_id: recipient.lead_id,
      activity_type: 'site_visit',
      description: `Visited ${page} from email campaign`,
      metadata: {
        campaign_id: recipient.campaign_id,
        recipient_id: recipientId,
        page,
        referrer,
        timestamp: new Date().toISOString()
      }
    });
  }
  
  return NextResponse.json({ success: true });
}
```

---

## Email Template Updates

### Add Tracking to Email Body

```typescript
function addTrackingToEmail(
  emailBody: string,
  recipientId: string,
  baseUrl: string
): string {
  // 1. Add tracking pixel at end of email
  const trackingPixel = `
    <img src="${baseUrl}/api/track/open?id=${recipientId}" 
         width="1" height="1" 
         style="display:none" 
         alt="" />
  `;
  
  // 2. Replace all links with tracking links
  const linkRegex = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"/gi;
  
  let trackedBody = emailBody.replace(linkRegex, (match, url) => {
    // Skip if already a tracking link
    if (url.includes('/api/track/')) {
      return match;
    }
    
    // Create tracking URL
    const trackingUrl = `${baseUrl}/api/track/click?id=${recipientId}&url=${encodeURIComponent(url)}`;
    
    return match.replace(url, trackingUrl);
  });
  
  // 3. Add UTM parameters to all internal links
  trackedBody = trackedBody.replace(linkRegex, (match, url) => {
    if (url.startsWith(baseUrl) && !url.includes('utm_')) {
      const separator = url.includes('?') ? '&' : '?';
      const utmParams = `utm_source=email&utm_medium=campaign&utm_content=${recipientId}`;
      return match.replace(url, `${url}${separator}${utmParams}`);
    }
    return match;
  });
  
  // 4. Add tracking pixel
  trackedBody += trackingPixel;
  
  return trackedBody;
}
```

---

## Analytics Dashboard

### Email Performance Metrics

**Campaign-Level Stats:**
```typescript
// /api/admin/campaigns/[id]/stats

{
  campaign_id: "uuid",
  total_sent: 150,
  total_delivered: 148,
  total_opened: 95,
  total_clicked: 42,
  total_replied: 8,
  total_bounced: 2,
  
  // Rates
  delivery_rate: 98.7%, // delivered / sent
  open_rate: 64.2%,     // opened / delivered
  click_rate: 44.2%,    // clicked / opened
  click_to_open_rate: 28.4%, // clicked / delivered
  reply_rate: 5.4%,     // replied / sent
  
  // Engagement
  avg_opens_per_recipient: 1.8,
  avg_clicks_per_recipient: 2.1,
  
  // Timeline
  first_open: "2025-11-02T10:15:00Z",
  last_open: "2025-11-05T14:30:00Z",
  peak_open_time: "2025-11-02 10:00-11:00 AM"
}
```

**Recipient-Level Stats:**
```typescript
// /api/admin/campaigns/[id]/recipients

{
  recipients: [
    {
      id: "uuid",
      lead: {
        company_name: "ABC Supply",
        contact_name: "Chris Johnson",
        email: "chris@abcsupply.com"
      },
      status: "clicked",
      sent_at: "2025-11-02T09:00:00Z",
      opened_at: "2025-11-02T10:15:00Z",
      clicked_at: "2025-11-02T10:17:00Z",
      open_count: 3,
      click_count: 2,
      clicks: [
        {
          url: "https://yoursite.com/products",
          clicked_at: "2025-11-02T10:17:00Z"
        },
        {
          url: "https://yoursite.com/pricing",
          clicked_at: "2025-11-02T10:20:00Z"
        }
      ],
      engagement_score: 85 // Based on opens, clicks, time
    }
  ]
}
```

**Link Performance:**
```typescript
// Which links got the most clicks

{
  top_links: [
    {
      url: "https://yoursite.com/products",
      click_count: 45,
      unique_clickers: 32,
      click_rate: 21.6%
    },
    {
      url: "https://yoursite.com/pricing",
      click_count: 28,
      unique_clickers: 24,
      click_rate: 16.2%
    }
  ]
}
```

---

## What Can't Be Tracked

### Email Deleted ❌

**Why:** Email providers don't send notifications when emails are deleted.

**Workaround:** Track engagement instead:
- If no open after 7 days → likely deleted or ignored
- If opened but no click → low interest
- If clicked → high interest

### Email Forwarded ⚠️

**Limited Tracking:**
- Can't track if someone forwards your email
- Can track if forwarded recipient opens/clicks (new IP, user agent)
- Can detect unusual patterns (same email opened from multiple IPs)

---

## Privacy & Compliance

### GDPR / CAN-SPAM Compliance

**Required:**
1. ✅ Include unsubscribe link in every email
2. ✅ Honor unsubscribe requests immediately
3. ✅ Include physical address in footer
4. ✅ Don't track after unsubscribe
5. ✅ Disclose tracking in privacy policy

**Best Practices:**
- Be transparent about tracking
- Allow users to opt out of tracking
- Don't sell tracking data
- Secure all tracking data

---

## Implementation Summary

### What's Already Built ✅

1. ✅ Database tables for tracking
2. ✅ Magic link system
3. ✅ Lead activities logging
4. ✅ Campaign recipient tracking
5. ✅ Click tracking table

### What We Need to Add ⏳

1. ⏳ `/api/track/open` endpoint (30 min)
2. ⏳ `/api/track/click` endpoint (30 min)
3. ⏳ `/api/track/visit` endpoint (20 min)
4. ⏳ Email template tracking injection (20 min)
5. ⏳ Analytics dashboard API (40 min)
6. ⏳ Analytics UI (60 min)

**Total Time:** ~3 hours

---

## Usage Examples

### Example 1: Track Email Campaign

```
1. Send email to Chris at ABC Supply
2. Email includes:
   - Tracking pixel for opens
   - Tracked links for clicks
   - UTM parameters for site visits
   - Magic link for login

3. Chris opens email → Tracked ✅
4. Chris clicks "View Products" → Tracked ✅
5. Chris visits site → Tracked ✅
6. Chris logs in via magic link → Tracked ✅
7. Chris browses products → Tracked ✅

Dashboard shows:
- Opened: 10:15 AM (3 times)
- Clicked: 10:17 AM (2 links)
- Visited: /products, /pricing, /checkout
- Logged in: 10:17 AM
- Engagement Score: 85/100
```

### Example 2: Regional Campaign Analytics

```
Campaign: "New Pricing - Georgia Region"
Sent to: 50 leads in Georgia

Results:
- Sent: 50
- Delivered: 49 (98%)
- Opened: 32 (65%)
- Clicked: 18 (56% of opens)
- Logged in: 12 (67% of clicks)
- Purchased: 5 (42% of logins)

Top Links:
1. /pricing → 18 clicks
2. /products → 12 clicks
3. /contact → 8 clicks

Best Performers:
1. ABC Supply - 5 opens, 3 clicks, logged in
2. Restaurant Depot - 4 opens, 2 clicks, logged in
3. Sysco Foods - 3 opens, 1 click
```

---

## Next Steps

1. ✅ Design complete
2. ⏳ Implement tracking endpoints
3. ⏳ Update email templates
4. ⏳ Build analytics dashboard
5. ⏳ Test with sample campaign
6. ⏳ Deploy and monitor

---

**Ready to implement full email tracking!**
