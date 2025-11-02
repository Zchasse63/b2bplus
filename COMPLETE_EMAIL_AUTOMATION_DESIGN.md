# Complete Email Automation System - Design Document

**Date:** November 2, 2025  
**Status:** Ready to Implement  
**Goal:** Voice-triggered email automation with regional campaigns and full tracking

---

## System Overview

A complete email automation system that supports:

1. ✅ **Individual Emails** - "Email Chris at ABC Supply about pricing"
2. ✅ **Regional Campaigns** - "Email all Georgia customers about new products"
3. ✅ **Buying Group Campaigns** - "Email all Sysco members about rebates"
4. ✅ **Full Tracking** - Opens, clicks, site visits, logins
5. ✅ **Gmail Sending** - From your Gmail account
6. ✅ **Outlook Replies** - Reply-to your Outlook
7. ✅ **AI Personalization** - Gemini generates custom emails
8. ✅ **CRM Integration** - Everything tracked automatically

---

## Your Current CRM Structure

### Regions (3 Tiers)

**Tier 1: Georgia (Local)**
- States: GA
- Price Multiplier: 1.0 (base price)
- Description: Local pricing

**Tier 2: Border States**
- States: FL, SC, NC, TN, AL
- Price Multiplier: 1.05 (5% markup)
- Description: Border state pricing

**Tier 3: Outer States**
- States: VA, WV, KY, MS, LA, AR
- Price Multiplier: 1.10 (10% markup)
- Description: Outer state pricing

### Buying Groups (3 Groups)

1. **Sysco** - 3% monthly rebate, 1% annual
2. **US Foods** - 3% monthly rebate, 1% annual
3. **Performance Food Group (PFG)** - 3% monthly rebate, 1% annual

### Lead Data Structure

Each lead has:
- Company name, contact name, email, phone
- Region (tier 1/2/3)
- Buying group (optional)
- Lead score (0-100)
- Industry, company size
- Status (new, contacted, qualified, etc.)
- Activities history

---

## Voice Command Examples

### Individual Emails

```
You: "Email Chris at ABC Supply about new pricing"

System:
✅ Found: Chris Johnson at ABC Supply Co.
✅ Region: Georgia (Tier 1)
✅ Buying Group: Sysco
✅ Generated personalized email about pricing
✅ Sent from: your-gmail@gmail.com
✅ Reply-to: your-outlook@outlook.com
✅ Tracking: Opens, clicks, site visits enabled
```

### Regional Campaigns

```
You: "Email all Georgia customers about new product line"

System:
✅ Found: 47 leads in Georgia (Tier 1)
✅ Generating 47 personalized emails...
✅ Each email customized with:
   - Company name
   - Contact name
   - Industry-specific benefits
   - Regional pricing (Tier 1)
   - Buying group rebates (if applicable)
✅ Sent 47 emails in 2 minutes
✅ Tracking enabled for all
```

### Buying Group Campaigns

```
You: "Email all Sysco members about their monthly rebate"

System:
✅ Found: 23 Sysco members across all regions
✅ Breakdown:
   - Georgia: 12 leads
   - Border States: 8 leads
   - Outer States: 3 leads
✅ Personalized emails with:
   - 3% monthly rebate details
   - Regional pricing
   - Custom offers
✅ Sent 23 emails
✅ Tracking enabled
```

### Combined Filters

```
You: "Email all Sysco members in Georgia about new pricing"

System:
✅ Found: 12 Sysco members in Georgia
✅ Filters applied:
   - Region: Georgia (Tier 1)
   - Buying Group: Sysco
✅ Personalized with both:
   - Georgia base pricing
   - Sysco 3% rebate
✅ Sent 12 emails
```

---

## API Endpoints

### 1. Quick Send (Individual)

**`POST /api/admin/campaigns/quick-send`**

```typescript
// Voice command: "Email Chris at ABC Supply about pricing"

Request:
{
  "message": "Email Chris at ABC Supply about pricing",
  // OR
  "leadId": "uuid",
  "context": "pricing"
}

Response:
{
  "success": true,
  "lead": {
    "id": "uuid",
    "company_name": "ABC Supply Co.",
    "contact_name": "Chris Johnson",
    "email": "chris@abcsupply.com",
    "region": "Georgia (Tier 1)",
    "buying_group": "Sysco"
  },
  "email": {
    "subject": "New Pricing Options for ABC Supply",
    "preview": "Hi Chris, I wanted to share our updated pricing...",
    "sent_at": "2025-11-02T12:00:00Z",
    "tracking_enabled": true
  }
}
```

### 2. Regional Campaign

**`POST /api/admin/campaigns/regional-send`**

```typescript
// Voice command: "Email all Georgia customers about new products"

Request:
{
  "message": "Email all Georgia customers about new products",
  // OR
  "region": "Georgia (Local)", // or tier: 1
  "context": "new products",
  "subject": "Optional custom subject"
}

Response:
{
  "success": true,
  "campaign": {
    "id": "uuid",
    "name": "New Products - Georgia",
    "region": "Georgia (Tier 1)",
    "total_recipients": 47,
    "sent_count": 47,
    "failed_count": 0
  },
  "breakdown": {
    "by_buying_group": {
      "Sysco": 12,
      "US Foods": 8,
      "PFG": 5,
      "None": 22
    },
    "by_industry": {
      "Restaurant": 18,
      "Hotel": 12,
      "Hospital": 9,
      "School": 8
    }
  },
  "tracking": {
    "opens_tracked": true,
    "clicks_tracked": true,
    "site_visits_tracked": true
  }
}
```

### 3. Buying Group Campaign

**`POST /api/admin/campaigns/buying-group-send`**

```typescript
// Voice command: "Email all Sysco members about rebates"

Request:
{
  "message": "Email all Sysco members about rebates",
  // OR
  "buying_group": "Sysco",
  "context": "monthly rebates"
}

Response:
{
  "success": true,
  "campaign": {
    "id": "uuid",
    "name": "Monthly Rebates - Sysco",
    "buying_group": "Sysco",
    "total_recipients": 23,
    "sent_count": 23
  },
  "breakdown": {
    "by_region": {
      "Georgia (Tier 1)": 12,
      "Border States (Tier 2)": 8,
      "Outer States (Tier 3)": 3
    }
  }
}
```

### 4. Combined Filters

**`POST /api/admin/campaigns/filtered-send`**

```typescript
// Voice command: "Email Sysco members in Georgia about pricing"

Request:
{
  "filters": {
    "region": "Georgia (Local)",
    "buying_group": "Sysco",
    "lead_score_min": 50 // Optional
  },
  "context": "new pricing",
  "subject": "Updated Pricing for Sysco Members"
}

Response:
{
  "success": true,
  "campaign": {
    "id": "uuid",
    "name": "Pricing Update - Sysco Georgia",
    "filters_applied": {
      "region": "Georgia (Tier 1)",
      "buying_group": "Sysco"
    },
    "total_recipients": 12,
    "sent_count": 12
  }
}
```

---

## AI Email Generation

### Personalization Strategy

Each email is personalized with:

1. **Lead Information**
   - Contact name
   - Company name
   - Industry
   - Company size

2. **Regional Context**
   - Tier 1/2/3 pricing
   - Local vs. border vs. outer states
   - Regional benefits

3. **Buying Group Benefits**
   - Monthly rebate (3%)
   - Annual rebate (1%)
   - Group-specific offers

4. **Lead History**
   - Previous orders
   - Past interactions
   - Lead score

5. **Campaign Context**
   - Topic (pricing, products, rebates, etc.)
   - Call-to-action
   - Urgency/timing

### Example AI Prompt

```typescript
const aiPrompt = `
You are a B2B sales professional for a food service disposables company.

Lead Information:
- Company: ${lead.company_name}
- Contact: ${lead.contact_name}
- Industry: ${lead.industry}
- Company Size: ${lead.company_size}
- Region: ${lead.region.name} (Tier ${lead.region.tier})
- Buying Group: ${lead.buying_group?.name || 'None'}
- Lead Score: ${lead.lead_score}/100

Regional Pricing:
- Base Price Multiplier: ${lead.region.price_multiplier}
- ${lead.region.tier === 1 ? 'Local Georgia pricing (best rates)' : 
   lead.region.tier === 2 ? 'Border state pricing (5% markup)' :
   'Outer state pricing (10% markup)'}

Buying Group Benefits:
${lead.buying_group ? `
- Monthly Rebate: ${lead.buying_group.monthly_rebate_percentage}%
- Annual Growth Rebate: ${lead.buying_group.annual_rebate_percentage}%
- Member of ${lead.buying_group.name}
` : '- Not currently in a buying group (mention potential savings)'}

Campaign Context: ${context}

Generate a professional, personalized email that:
1. Addresses ${lead.contact_name} by name
2. References their company (${lead.company_name}) and industry
3. Highlights their regional pricing benefits
4. ${lead.buying_group ? 'Emphasizes their buying group rebates' : 'Suggests joining a buying group'}
5. Discusses: ${context}
6. Includes a clear call-to-action
7. Is concise (150-200 words)
8. Professional but friendly tone
9. Mentions specific savings/benefits with numbers

Return JSON:
{
  "subject": "Compelling subject line (max 60 chars)",
  "body": "Email body in HTML format with proper formatting"
}
`;
```

### Example Generated Email

**For: Chris Johnson at ABC Supply (Georgia, Sysco member)**

```
Subject: Exclusive Pricing Update for ABC Supply - Sysco Member Benefits

Hi Chris,

I wanted to reach out personally to share some exciting pricing updates 
specifically for ABC Supply.

As a valued Sysco member in Georgia, you're already enjoying our best 
regional rates with your 3% monthly rebate. With our new pricing structure, 
you'll see even better savings on high-volume items.

For example, our premium disposable plates that you order regularly are 
now 12% lower than border state pricing, and with your Sysco rebate, 
you're saving an additional 3% on top of that.

I'd love to show you how these updates can reduce your monthly supply 
costs by an estimated $800-1,200 based on your typical order volume.

Can we schedule a quick 15-minute call this week to walk through the 
new pricing for your most-ordered items?

[View Your Personalized Pricing] (magic link)

Best regards,
Zach

P.S. As a Sysco member, you're also eligible for our new quarterly 
volume bonus program. Let's discuss!
```

---

## Email Tracking

### What Gets Tracked

**For Every Email:**
1. ✅ **Sent** - Timestamp when email was sent
2. ✅ **Delivered** - Confirmed delivery (via Gmail API)
3. ✅ **Opened** - When recipient opens email (tracking pixel)
4. ✅ **Clicked** - When recipient clicks any link
5. ✅ **Site Visit** - When they visit your site (UTM tracking)
6. ✅ **Login** - When they use magic link
7. ✅ **Replied** - When they reply (Gmail API)

**Detailed Click Tracking:**
- Which specific links were clicked
- How many times each link was clicked
- When each click happened
- Device/browser used (user agent)
- Location (IP address)

**Engagement Metrics:**
- Open count (how many times opened)
- Click count (how many times clicked)
- Time to first open
- Time to first click
- Pages visited after email
- Time spent on site

### Tracking Implementation

**1. Tracking Pixel (Opens)**
```html
<img src="https://yoursite.com/api/track/open?id=recipient-uuid" 
     width="1" height="1" style="display:none" />
```

**2. Link Tracking (Clicks)**
```html
<!-- Original -->
<a href="https://yoursite.com/products">View Products</a>

<!-- With Tracking -->
<a href="https://yoursite.com/api/track/click?id=recipient-uuid&url=https://yoursite.com/products">
  View Products
</a>
```

**3. UTM Parameters (Site Visits)**
```
https://yoursite.com/products?utm_source=email&utm_medium=campaign&utm_campaign=georgia_pricing&utm_content=recipient-uuid
```

**4. Magic Links (Login)**
```
https://yoursite.com/api/auth/magic-link/verify?token=unique-token
```

---

## Campaign Analytics Dashboard

### Campaign Overview

```typescript
{
  campaign_id: "uuid",
  name: "New Pricing - Georgia",
  created_at: "2025-11-02T09:00:00Z",
  
  // Sending Stats
  total_recipients: 47,
  sent_count: 47,
  failed_count: 0,
  
  // Delivery Stats
  delivered_count: 46,
  bounced_count: 1,
  delivery_rate: 97.9%,
  
  // Engagement Stats
  opened_count: 32,
  open_rate: 69.6%, // 32/46 delivered
  avg_opens_per_recipient: 2.1,
  
  clicked_count: 18,
  click_rate: 56.3%, // 18/32 opened
  click_to_open_rate: 39.1%, // 18/46 delivered
  avg_clicks_per_recipient: 2.4,
  
  replied_count: 5,
  reply_rate: 10.6%, // 5/47 sent
  
  // Conversion Stats
  logged_in_count: 12,
  login_rate: 66.7%, // 12/18 clicked
  
  purchased_count: 4,
  conversion_rate: 33.3%, // 4/12 logged in
  
  // Timeline
  first_open: "2025-11-02T09:15:00Z",
  peak_open_time: "2025-11-02 10:00-11:00 AM",
  avg_time_to_open: "45 minutes",
  avg_time_to_click: "2 minutes after open"
}
```

### Regional Breakdown

```typescript
{
  by_region: {
    "Georgia (Tier 1)": {
      sent: 47,
      opened: 32,
      clicked: 18,
      open_rate: 69.6%,
      click_rate: 56.3%
    }
  },
  
  by_buying_group: {
    "Sysco": {
      sent: 12,
      opened: 10,
      clicked: 8,
      open_rate: 83.3%,
      click_rate: 80.0%
    },
    "US Foods": {
      sent: 8,
      opened: 6,
      clicked: 4,
      open_rate: 75.0%,
      click_rate: 66.7%
    },
    "None": {
      sent: 22,
      opened: 13,
      clicked: 5,
      open_rate: 59.1%,
      click_rate: 38.5%
    }
  },
  
  by_industry: {
    "Restaurant": {
      sent: 18,
      opened: 14,
      clicked: 9,
      open_rate: 77.8%,
      click_rate: 64.3%
    }
  }
}
```

### Top Performers

```typescript
{
  most_engaged_leads: [
    {
      company: "ABC Supply",
      contact: "Chris Johnson",
      opens: 5,
      clicks: 3,
      logged_in: true,
      engagement_score: 95
    },
    {
      company: "Restaurant Depot",
      contact: "Sarah Martinez",
      opens: 4,
      clicks: 2,
      logged_in: true,
      engagement_score: 88
    }
  ],
  
  most_clicked_links: [
    {
      url: "/products",
      clicks: 24,
      unique_clickers: 16
    },
    {
      url: "/pricing",
      clicks: 18,
      unique_clickers: 14
    }
  ]
}
```

---

## Implementation Checklist

### Phase 1: Gmail Setup (15 min)
- [ ] Generate Gmail app password
- [ ] Add environment variables:
  - `GMAIL_USER=your-email@gmail.com`
  - `GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx`
  - `OUTLOOK_EMAIL=your-email@outlook.com`
- [ ] Install nodemailer: `pnpm add nodemailer @types/nodemailer`

### Phase 2: Quick Send API (30 min)
- [ ] Create `/api/admin/campaigns/quick-send/route.ts`
- [ ] Implement lead lookup
- [ ] Integrate Gmail SMTP
- [ ] Set Outlook reply-to
- [ ] Track in CRM

### Phase 3: Regional Campaign API (30 min)
- [ ] Create `/api/admin/campaigns/regional-send/route.ts`
- [ ] Implement region filtering
- [ ] Bulk email sending
- [ ] Progress tracking

### Phase 4: Buying Group Campaign API (20 min)
- [ ] Create `/api/admin/campaigns/buying-group-send/route.ts`
- [ ] Implement buying group filtering
- [ ] Combine with regional filters

### Phase 5: Email Tracking (60 min)
- [ ] Create `/api/track/open/route.ts` (tracking pixel)
- [ ] Create `/api/track/click/route.ts` (link tracking)
- [ ] Create `/api/track/visit/route.ts` (site visits)
- [ ] Update email templates with tracking
- [ ] Test tracking endpoints

### Phase 6: Message Parsing (20 min)
- [ ] Create helper to parse voice messages
- [ ] Extract recipient/region/buying group
- [ ] Extract context/topic
- [ ] Handle variations

### Phase 7: Analytics Dashboard (60 min)
- [ ] Create `/api/admin/campaigns/[id]/stats/route.ts`
- [ ] Campaign overview stats
- [ ] Regional breakdown
- [ ] Buying group breakdown
- [ ] Top performers

### Phase 8: Testing (30 min)
- [ ] Test individual email
- [ ] Test regional campaign
- [ ] Test buying group campaign
- [ ] Test tracking (opens, clicks)
- [ ] Test analytics dashboard

**Total Time: ~4.5 hours**

---

## Environment Variables

```bash
# Gmail Configuration
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx

# Outlook Reply-To
OUTLOOK_EMAIL=your-email@outlook.com

# App URL (for tracking links)
NEXT_PUBLIC_APP_URL=https://yoursite.com

# Gemini AI (already configured)
GOOGLE_API_KEY=your-key
```

---

## Benefits Summary

### For You
- ⚡ **Fast** - Send emails in seconds via voice
- 🎯 **Targeted** - Regional and buying group campaigns
- 📊 **Tracked** - Full visibility into engagement
- 🤖 **Automated** - AI generates personalized content
- 💰 **Effective** - Higher open/click rates

### For Your Leads
- 👤 **Personal** - Every email customized for them
- 💵 **Relevant** - Regional pricing + buying group benefits
- 🎁 **Valuable** - Specific savings and offers
- 🔗 **Easy** - Magic links for instant access
- ✅ **Professional** - From your Gmail, not generic sender

---

## Cost Analysis

### Email Sending
- **Gmail SMTP**: Free (up to 500/day)
- **Gmail API**: Free (1 billion quota units/day)

### AI Personalization
- **Gemini 2.5 Flash**: ~$0.001 per email
- **100 emails**: ~$0.10
- **1,000 emails**: ~$1.00

### Tracking
- **Infrastructure**: Free (built into your app)
- **Storage**: Minimal (tracking data in Supabase)

**Total Cost**: ~$0.001 per personalized, tracked email

---

## ROI Example

### Campaign: "New Pricing - Georgia"

**Investment:**
- Time: 30 seconds to send command
- Cost: $0.047 (47 emails × $0.001)

**Results:**
- Sent: 47 emails
- Opened: 32 (68%)
- Clicked: 18 (56% of opens)
- Logged in: 12 (67% of clicks)
- Purchased: 4 (33% of logins)

**Revenue:**
- 4 new orders × $500 avg = $2,000

**ROI:** $2,000 / $0.047 = 42,553x

---

## Ready to Implement!

Just need your Gmail credentials to get started:
1. Gmail address
2. Gmail app password
3. Outlook email for reply-to

Then we can build the entire system in ~4.5 hours!
