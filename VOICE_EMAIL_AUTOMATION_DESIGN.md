# Voice-Triggered Email Automation - Design Document

**Date:** November 2, 2025  
**Status:** Design Phase  
**Goal:** Enable sending personalized emails to CRM leads via voice/text commands

---

## Overview

Design a system where you can send a message like:
> "Email Chris at ABC Supply about our new product line"

And the system will:
1. Find the lead "Chris at ABC Supply" in your CRM
2. Generate a personalized email using Gemini AI
3. Send from Gmail account
4. Set reply-to as your Outlook account
5. Track the email in CRM

---

## Current System Analysis

### ✅ What's Already Built

**Email Campaign System:**
- ✅ `/api/admin/campaigns/send-personalized` - Sends personalized emails to leads
- ✅ Uses Gemini AI for personalization
- ✅ Tracks emails in `email_campaign_recipients` table
- ✅ Logs activities in `lead_activities` table
- ✅ Supports magic links for promotional emails

**CRM/Lead System:**
- ✅ `leads` table with 1,000+ leads
- ✅ Company name, contact name, email, phone
- ✅ Region, buying group, lead score
- ✅ Lead activities tracking

**Current Email Provider:**
- ⚠️ Using **Resend** (noreply@b2bplus.com)
- ⚠️ Placeholder API key (not configured)

### ❌ What's Missing

1. **Gmail Integration** - Need to send from your Gmail account
2. **Outlook Reply-To** - Need to set reply-to as your Outlook
3. **Quick Send API** - Simple endpoint for voice-triggered sends
4. **Lead Lookup** - Find lead by name/company quickly
5. **Message Parsing** - Extract recipient and context from voice message

---

## Proposed Architecture

### Workflow

```
You: "Email Chris at ABC Supply about new pricing"
  ↓
[1] Parse Message
  - Recipient: "Chris at ABC Supply"
  - Context: "new pricing"
  ↓
[2] Find Lead in CRM
  - Search leads table for "Chris" + "ABC Supply"
  - Return lead details
  ↓
[3] Generate Personalized Email
  - Use Gemini AI with context
  - Include lead's company, region, buying group
  - Professional tone
  ↓
[4] Send via Gmail
  - From: your-gmail@gmail.com
  - Reply-To: your-outlook@outlook.com
  - To: chris@abcsupply.com
  ↓
[5] Track in CRM
  - Log email sent
  - Update lead activity
  - Track for follow-up
```

---

## Technical Design

### 1. New API Endpoint

**`/api/admin/campaigns/quick-send`**

```typescript
POST /api/admin/campaigns/quick-send

Request:
{
  "message": "Email Chris at ABC Supply about new pricing",
  // OR
  "leadId": "uuid-of-lead",
  "context": "new pricing",
  "subject": "Optional custom subject"
}

Response:
{
  "success": true,
  "lead": {
    "id": "uuid",
    "company_name": "ABC Supply",
    "contact_name": "Chris",
    "email": "chris@abcsupply.com"
  },
  "email": {
    "subject": "New Pricing Options for ABC Supply",
    "preview": "Hi Chris, I wanted to reach out about...",
    "sent_at": "2025-11-02T12:00:00Z"
  }
}
```

### 2. Gmail Integration

**Option A: Gmail API (Recommended)**
- More control and features
- Can send from your actual Gmail
- Requires OAuth setup
- Free tier: 1 billion quota units/day

**Option B: Gmail SMTP**
- Simpler setup
- Less secure (app passwords)
- Limited to 500 emails/day
- Easier for testing

**Recommendation:** Start with SMTP for quick setup, migrate to API later.

### 3. Email Configuration

```typescript
// Gmail SMTP Configuration
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER, // your-email@gmail.com
    pass: process.env.GMAIL_APP_PASSWORD // app-specific password
  }
});

// Email Options
const mailOptions = {
  from: process.env.GMAIL_USER,
  replyTo: process.env.OUTLOOK_EMAIL, // your-email@outlook.com
  to: lead.email,
  subject: personalizedSubject,
  html: personalizedBody
};
```

### 4. Lead Lookup Logic

```typescript
async function findLead(searchText: string) {
  // Extract potential company and contact name
  // "Chris at ABC Supply" → contact: "Chris", company: "ABC Supply"
  
  // Search strategy:
  // 1. Try exact match on company_name + contact_name
  // 2. Try fuzzy match on company_name
  // 3. Try email domain match
  // 4. Return top 3 matches with confidence scores
  
  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .or(`company_name.ilike.%${company}%,contact_name.ilike.%${contact}%`)
    .limit(3);
    
  return leads;
}
```

### 5. AI Email Generation

```typescript
const aiPrompt = `
You are a B2B sales professional sending a personalized email.

Lead Information:
- Company: ${lead.company_name}
- Contact: ${lead.contact_name}
- Industry: ${lead.industry}
- Region: ${lead.regions?.name}
- Lead Score: ${lead.lead_score}/100

Context: ${context} (e.g., "new pricing", "product update", "follow-up")

Generate a professional, personalized email that:
1. Addresses the contact by name
2. References their company and industry
3. Discusses the context topic
4. Includes a clear call-to-action
5. Is concise (150-200 words)
6. Professional but friendly tone

Return JSON:
{
  "subject": "...",
  "body": "..." (HTML format)
}
`;
```

---

## Implementation Plan

### Phase 1: Gmail Setup (15 min)
1. Enable Gmail SMTP in your Google account
2. Generate app-specific password
3. Add to environment variables:
   ```bash
   GMAIL_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=your-app-password
   OUTLOOK_EMAIL=your-email@outlook.com
   ```

### Phase 2: Quick Send API (30 min)
1. Create `/api/admin/campaigns/quick-send/route.ts`
2. Implement lead lookup logic
3. Integrate Gmail SMTP (nodemailer)
4. Set reply-to as Outlook
5. Track in CRM

### Phase 3: Message Parsing (20 min)
1. Create helper function to parse voice messages
2. Extract recipient (contact + company)
3. Extract context/topic
4. Handle variations:
   - "Email Chris at ABC Supply about pricing"
   - "Send email to Chris, ABC Supply, new products"
   - "Email ABC Supply about order status"

### Phase 4: Testing (15 min)
1. Test with real lead data
2. Verify Gmail sends correctly
3. Verify reply-to works
4. Check CRM tracking

### Phase 5: Usage (Ongoing)
1. Send message: "Email [contact] at [company] about [topic]"
2. System finds lead, generates email, sends
3. You get confirmation
4. Lead gets email from Gmail
5. Replies go to your Outlook

---

## Environment Variables Needed

```bash
# Gmail Configuration
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx

# Outlook Reply-To
OUTLOOK_EMAIL=your-email@outlook.com

# Optional: For Gmail API (later)
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...
```

---

## Database Changes

**None required!** ✅

Existing tables support this:
- `leads` - Already has all contact info
- `email_campaign_recipients` - Can track quick sends
- `lead_activities` - Can log email activities

---

## Usage Examples

### Example 1: Basic Email
```
You: "Email Chris at ABC Supply about new pricing"

System:
✅ Found: Chris Johnson at ABC Supply Co.
✅ Generated personalized email about pricing
✅ Sent from: your-gmail@gmail.com
✅ Reply-to: your-outlook@outlook.com
✅ Tracked in CRM
```

### Example 2: Follow-Up
```
You: "Email Sarah at Restaurant Depot, follow up on sample request"

System:
✅ Found: Sarah Martinez at Restaurant Depot
✅ Generated follow-up email
✅ Referenced previous sample request from CRM
✅ Sent and tracked
```

### Example 3: Multiple Matches
```
You: "Email John at ABC Company"

System:
⚠️ Found 3 matches:
1. John Smith at ABC Company Inc.
2. John Doe at ABC Supply
3. John Williams at ABC Restaurant

Which one? (Reply with number)
```

---

## Benefits

1. **Speed** - Send personalized emails in seconds via voice
2. **Personalization** - AI generates custom content for each lead
3. **Tracking** - All emails logged in CRM automatically
4. **Professional** - Sends from your Gmail, replies to Outlook
5. **Context-Aware** - AI uses lead's company, region, history
6. **No Manual Work** - No copying emails, no switching apps

---

## Limitations & Considerations

1. **Gmail Limits**
   - SMTP: 500 emails/day
   - API: Much higher limits
   - Solution: Start with SMTP, upgrade to API if needed

2. **Lead Matching**
   - May find multiple matches
   - Solution: Return top 3, ask user to confirm

3. **AI Costs**
   - Gemini API calls for each email
   - Solution: ~$0.001 per email (very cheap)

4. **Reply Handling**
   - Replies go to Outlook (not automated)
   - Solution: Manual handling for now, can automate later

---

## Next Steps

1. ✅ Design complete
2. ⏳ Get Gmail credentials from you
3. ⏳ Implement quick-send API
4. ⏳ Test with sample leads
5. ⏳ Deploy and use!

---

## Questions for You

1. **Gmail Account** - Which Gmail should we use for sending?
2. **Outlook Account** - Which Outlook for reply-to?
3. **App Password** - Can you generate a Gmail app password?
4. **Testing** - Want to test with a few leads first?

---

**Ready to implement once you provide Gmail credentials!**
