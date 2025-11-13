# B2B Plus Master Implementation Plan
## Comprehensive Roadmap: Platform Audit Fixes + AI Expansion

**Created**: November 5, 2025
**Last Updated**: January 5, 2025
**Scope**: Complete platform stabilization and AI-first transformation
**Timeline**: 24 weeks (6 months)
**Approach**: Foundation → Backend → UI (dependency-based phasing)

---

## 📊 Implementation Progress

**Overall Progress**: Phase 3 of 8 Complete (37.5%)

| Phase | Status | Completion Date | Tasks |
|-------|--------|----------------|-------|
| Phase 1: Foundation & Security | ⏳ In Progress | - | TBD |
| Phase 2: AI Backend Logic | ✅ **COMPLETE** | **Nov 7, 2025** | **18/18** |
| Phase 3: Customer-Facing UI | ✅ **COMPLETE** | **Jan 5, 2025** | **20/20** |
| Phase 4: Admin AI Tools | 📋 Planned | - | 0/12 |
| Phase 5: Operational AI | 📋 Planned | - | 0/10 |
| Phase 6: Advanced Features | 📋 Planned | - | 0/8 |
| Phase 7: Polish & Optimization | 📋 Planned | - | 0/6 |
| Phase 8: Launch Preparation | 📋 Planned | - | 0/5 |

### Recent Completions

✅ **Phase 3 Complete** (January 5, 2025)
- All customer-facing AI features implemented
- 6 weeks of UI development completed (Weeks 9-14)
- AI Chatbot UI (ChatGPT-style interface)
- Public Chatbot with lead capture
- Reorder Notifications UI with email templates
- Customer Analytics Dashboard with Recharts
- Enhanced Product Search (semantic + visual)
- Customer 360 View with AI insights and activity timeline
- Navigation updates (Analytics, Notifications links)

✅ **Phase 2 Complete** (November 7, 2025)
- All AI backend APIs implemented and production-ready
- 7 database tables created with full RLS policies
- 10 API endpoints with proper authentication
- Chatbot system (authenticated + public)
- Lead qualification and scoring
- Reorder prediction system
- Dynamic pricing recommendations
- Invoice reconciliation engine

---

## Executive Summary

This master plan combines:
1. **Critical audit fixes** (23 missing RLS policies, security gaps)
2. **AI expansion** (24 new AI features to match industry standards)
3. **User experience improvements** (registration approval, lead capture, chatbot)

**Key Principle**: Build foundation first, then backend logic, then UI components.

---

## PHASE 1: FOUNDATION & SECURITY (Weeks 1-3)
**Goal**: Fix critical security issues and establish solid foundation

### Week 1: Database Security & RLS Policies

**Task 1.1: Create RLS Policies Migration** (2 days)
- Create migration for all 23 missing RLS policies
- Tables: `product_usage_forecasts`, `customer_opportunities`, `pricing_optimization_suggestions`, `customer_purchase_analytics`, `historical_orders`, `historical_order_items`, `sku_mappings`, `tasks`, `activities`, `documents`, `sample_requests`, `rebate_tracking`, `pricing_recommendations`, and 10 others
- Ensure policies allow:
  - Admins: See all data
  - Customers: See only their organization's data
  - Service role: Bypass RLS for backend operations

**Task 1.2: Apply RLS Migration** (1 day)
- Test policies in development
- Apply to production via Supabase API
- Verify UI can now read AI-generated data

**Task 1.3: Registration Approval System** (2 days)
- Add `approval_status` column to `organizations` table (pending, approved, rejected)
- Add `approved_by` and `approved_at` columns
- Create RLS policy: Users can't login if `approval_status != 'approved'`
- Create admin API route: `/api/admin/organizations/approve`

**Dependencies**: None - this is foundational
**Blocks**: Everything else (UI can't read data without RLS)
**Deliverable**: Secure database with proper access controls

---

### Week 2: AI Data Isolation & Security

**Task 2.1: Customer Data Isolation Helper** (1 day)
- Create `apps/web/lib/ai/customer-context.ts`
- Function: `getCustomerContext(userId)` - Returns ONLY that customer's data
- Enforces organization-level isolation
- Used by all AI endpoints to prevent data leakage

**Task 2.2: AI Security Middleware** (1 day)
- Create `apps/web/lib/middleware/ai-security.ts`
- Validates user has access to requested data
- Prevents cross-customer data access
- Rate limiting for AI endpoints (prevent abuse)

**Task 2.3: Audit Existing AI Endpoints** (1 day)
- Review all 10 existing AI endpoints
- Ensure they use customer data isolation
- Add security middleware to all routes
- Test: User A cannot access User B's AI insights

**Task 2.4: AI Response Sanitization** (1 day)
- Create `sanitizeAIResponse()` function
- Removes any accidentally leaked customer names/data
- Validates response doesn't contain PII from other customers
- Logs any attempted data leakage

**Task 2.5: Create AI Usage Tracking** (1 day)
- New table: `ai_usage_logs` (user_id, endpoint, tokens_used, timestamp)
- Track AI usage per customer
- Monitor for abuse/unusual patterns
- Foundation for future usage-based pricing

**Dependencies**: Week 1 (RLS policies)
**Blocks**: AI chatbot, AI features
**Deliverable**: Secure AI infrastructure with data isolation

---

### Week 3: Lead Capture & Public Features

**Task 3.1: Lead Capture System** (2 days)
- New table: `leads` (company_name, contact_name, email, phone, notes, source, status)
- API route: `/api/leads/create` (public, no auth required)
- Email notification to admin when lead submitted
- Admin dashboard to view/manage leads

**Task 3.2: Landing Page Sales Funnel** (2 days)
- Update landing page with prominent lead capture form
- "Request Access" or "Get Started" CTA
- Form fields: Company name, contact name, email, phone, industry
- Success message: "Thanks! We'll contact you within 24 hours"

**Task 3.3: Registration Approval UI** (1 day)
- Admin page: `/admin/organizations/pending`
- List all pending organization registrations
- Approve/Reject buttons with reason field
- Email notification to user when approved/rejected

**Dependencies**: Week 1 (database foundation)
**Blocks**: Public chatbot (needs lead capture)
**Deliverable**: Lead generation and approval workflow

---

## PHASE 2: AI BACKEND LOGIC (Weeks 4-8) ✅ COMPLETE
**Goal**: Build all AI capabilities (backend only, no UI yet)
**Status**: ✅ **COMPLETED** - November 7, 2025
**Tasks Completed**: 18/18 (100%)
**See**: [PHASE_2_AI_BACKEND_LOGIC.md](./PHASE_2_AI_BACKEND_LOGIC.md) for full details

### Week 4: AI Chatbot Backend

**Task 4.1: Chatbot API Route** (2 days)
- Create `/api/chatbot/message` (POST)
- Accepts: `{ message: string, conversationId?: string }`
- Returns: `{ response: string, action?: object, suggestions: string[] }`
- Uses Gemini 2.5 Flash with customer context

**Task 4.2: Conversation Management** (1 day)
- New table: `chatbot_conversations` (user_id, messages JSONB, created_at)
- Store conversation history for context
- Auto-delete conversations after 30 days (privacy)

**Task 4.3: Chatbot Actions System** (2 days)
- Implement action handlers:
  - `check_order_status` - Query orders table
  - `get_order_history` - Return last N orders
  - `check_inventory` - Query product availability
  - `add_to_cart` - Add items to cart
  - `get_product_info` - Return product details
  - `create_support_ticket` - Escalate to human

**Task 4.4: Chatbot System Prompts** (1 day)
- Create comprehensive system prompt with:
  - Tone guidelines (professional, helpful, concise)
  - Capability list (what it can/can't do)
  - Escalation rules (when to involve human)
  - Response format (JSON structure)
  - Example conversations

**Dependencies**: Week 2 (AI security)
**Blocks**: Chatbot UI
**Deliverable**: Fully functional chatbot backend

---

### Week 5: Public Chatbot & Lead Qualification

**Task 5.1: Public Chatbot API** (2 days)
- Create `/api/chatbot/public` (no auth required)
- Different system prompt for non-authenticated users
- Capabilities:
  - Answer questions about B2B Plus
  - Explain signup process
  - Provide product category info (no pricing)
  - Capture lead information

**Task 5.2: Lead Qualification Logic** (1 day)
- AI asks qualifying questions:
  - "What type of business are you?"
  - "How many locations do you have?"
  - "What's your monthly disposables spend?"
- Scores lead quality (hot, warm, cold)
- Saves to `leads` table with AI-generated notes

**Task 5.3: Public Chatbot Lead Handoff** (1 day)
- When user provides email, create lead record
- AI says: "Thanks! I've notified our team. Expect contact within 24 hours."
- Email to admin with conversation transcript
- Option to "Continue conversation after signup"

**Task 5.4: Rate Limiting for Public Chatbot** (1 day)
- Prevent abuse from anonymous users
- Limit: 10 messages per IP per hour
- After limit: "Please provide email to continue"
- Cloudflare integration for IP tracking

**Dependencies**: Week 4 (chatbot backend)
**Blocks**: Public chatbot UI
**Deliverable**: Lead-generating public chatbot

---

### Week 6: Predictive Reorder Notifications

**Task 6.1: Reorder Prediction Algorithm** (2 days)
- Analyze customer order history
- Calculate average reorder frequency per product
- Predict next reorder date with confidence score
- Identify products customer is likely running low on

**Task 6.2: Reorder Notification System** (2 days)
- New table: `reorder_notifications` (customer_id, products JSONB, sent_at, status)
- Daily cron job: Generate reorder predictions for all customers
- Create notification records for customers predicted to need reorder
- Status: pending, viewed, added_to_cart, dismissed

**Task 6.3: Reorder Email Template** (1 day)
- Email template: "You might be running low on these items"
- List of predicted products with quantities
- "Add All to Cart" button (deep link to cart with items pre-populated)
- "Add Selected to Cart" checkboxes
- "Not now" / "Remind me in 7 days" options

**Task 6.4: Add to Cart from Email** (1 day)
- API route: `/api/cart/add-from-notification`
- Accepts: notification_id, selected_product_ids[]
- Adds items to customer's cart
- Marks notification as `added_to_cart`
- Redirects to cart page

**Dependencies**: Week 2 (AI security), existing forecast API
**Blocks**: Reorder notification UI
**Deliverable**: Automated reorder prediction and notification system

---

### Week 7: Dynamic Pricing Recommendations

**Task 7.1: Pricing Analysis Engine** (2 days)
- Daily cron job: Analyze all products for pricing opportunities
- Gather context:
  - Current price, cost, margin
  - Sales trends (30/90 day)
  - Inventory levels
  - Competitor pricing (if available)
  - Cart abandonment rate
- Use Gemini to generate pricing recommendations

**Task 7.2: Pricing Recommendations Table** (1 day)
- Already exists: `pricing_optimization_suggestions`
- Enhance with new fields:
  - `status` (pending, approved, rejected, expired)
  - `reviewed_by`, `reviewed_at`
  - `rejection_reason`
  - `valid_until` (recommendations expire after 7 days)
  - `confidence_score`
  - `expected_impact` JSONB (sales, revenue, margin changes)

**Task 7.3: Pricing Approval API** (1 day)
- `/api/admin/pricing/approve` - Approve recommendation, update product price
- `/api/admin/pricing/reject` - Reject with reason
- `/api/admin/pricing/modify` - Admin adjusts AI recommendation before applying
- `/api/admin/pricing/bulk-approve` - Approve multiple recommendations

**Task 7.4: Pricing Safety Guardrails** (1 day)
- Validation rules:
  - Never recommend below minimum margin (15%)
  - Never change price more than ±10%
  - Flag price decreases for manual review
  - Require approval for margin reductions
- Audit trail: Log all pricing changes with reasoning

**Dependencies**: Week 2 (AI security)
**Blocks**: Pricing dashboard UI
**Deliverable**: AI-powered pricing recommendation engine

---

### Week 8: Invoice Reconciliation Agent

**Task 8.1: Invoice Processing API** (2 days)
- `/api/admin/invoices/process` - Upload invoice PDF/image
- Use Gemini to extract:
  - Invoice number, date, due date
  - Supplier name
  - Line items (product, quantity, price)
  - Total amount
- Save to `invoices` table

**Task 8.2: PO Matching Logic** (1 day)
- Find matching purchase order by:
  - Supplier ID
  - Date range (±30 days)
  - Similar total amount (±5%)
- AI compares invoice line items to PO line items
- Identifies discrepancies (quantity, price, missing items)

**Task 8.3: Auto-Approval Workflow** (1 day)
- If invoice matches PO exactly: Auto-approve
- If minor discrepancies (<2%): Flag for review but suggest approval
- If major discrepancies: Require manual review
- Update PO status to `invoiced`
- Schedule payment based on due date

**Task 8.4: Invoice Notification System** (1 day)
- Email to accounting when invoice auto-approved
- Email to accounting when invoice needs review (with discrepancies highlighted)
- Dashboard notification for pending invoice reviews
- Weekly summary: "10 invoices auto-approved, 2 need review"

**Dependencies**: Week 2 (AI security)
**Blocks**: Invoice management UI
**Deliverable**: Automated invoice processing system

---

## PHASE 3: CUSTOMER-FACING UI (Weeks 9-14)
**Goal**: Build UI for customers to interact with AI features

### Week 9: AI Chatbot UI (Authorized Users)

**Task 9.1: Chatbot Page** (2 days)
- Create `/app/(app)/chat/page.tsx`
- Full-page chat interface (like ChatGPT)
- Message history with user/AI avatars
- Input box with send button
- "New conversation" button

**Task 9.2: Quick Action Buttons** (1 day)
- Prominent buttons above chat input:
  - "What did I order last month?"
  - "Check my recent orders"
  - "Find products"
  - "Show me what you can do"
- Clicking button sends that message to chatbot

**Task 9.3: Chatbot Suggestions** (1 day)
- AI returns suggested follow-up questions
- Display as clickable chips below AI response
- Example: After order status check, suggest "Track this order" or "Reorder these items"

**Task 9.4: Navigation Integration** (1 day)
- Add "AI Assistant" to main navigation
- Badge showing unread chatbot notifications
- Mobile-friendly chat interface
- Keyboard shortcuts (Cmd+K to open chat)

**Dependencies**: Week 4 (chatbot backend)
**Blocks**: None
**Deliverable**: Customer-facing AI chatbot

---

### Week 10: Public Chatbot UI (Non-Authorized Users)

**Task 10.1: Landing Page Chatbot** (2 days)
- Add chat widget to landing page
- NOT a tiny corner widget - prominent placement
- "Chat with us" section or dedicated chat page
- Different styling for public vs. authenticated chat

**Task 10.2: Lead Capture Flow** (1 day)
- After 2-3 messages, AI asks: "Can I get your email to continue?"
- Inline form in chat: Name, Email, Company
- After submission: "Thanks! Our team will reach out soon."
- Continue conversation with more detailed info

**Task 10.3: Public Chat Limitations** (1 day)
- No pricing information (must sign in)
- No order placement (must sign in)
- General product info only
- Clear CTA: "Sign in for full access"

**Dependencies**: Week 5 (public chatbot backend)
**Blocks**: None
**Deliverable**: Lead-generating public chatbot UI

---

### Week 11: Reorder Notifications UI

**Task 11.1: In-App Notification Center** (2 days)
- Create `/app/(app)/notifications/page.tsx`
- List all notifications (reorder predictions, price changes, etc.)
- Filter by type, status (unread, read, dismissed)
- Mark as read/dismissed

**Task 11.2: Reorder Notification Card** (1 day)
- Display predicted products with:
  - Product name, image, last order date
  - Predicted quantity needed
  - Checkbox to select/deselect
- "Add Selected to Cart" button
- "Remind me in 7 days" button
- "Not interested" button

**Task 11.3: Email Notification Improvements** (1 day)
- Beautiful HTML email template
- Product images and details
- One-click "Add All to Cart" (deep link with auth token)
- Unsubscribe option

**Task 11.4: Notification Preferences** (1 day)
- Settings page: `/app/(app)/settings/notifications`
- Toggle reorder notifications on/off
- Set frequency (daily, weekly, monthly)
- Set threshold (notify when 80% through usage cycle)

**Dependencies**: Week 6 (reorder backend)
**Blocks**: None
**Deliverable**: Reorder notification system

---

### Week 12: Customer Analytics Dashboard

**Task 12.1: Dashboard Page** (3 days)
- Create `/app/(app)/analytics/page.tsx`
- Display AI-generated insights:
  - Spending trends (charts)
  - Top products
  - Usage forecasts
  - Cost-saving opportunities
  - Seasonal patterns

**Task 12.2: Interactive Charts** (1 day)
- Use Recharts for visualizations
- Spending over time (line chart)
- Product category breakdown (pie chart)
- Month-over-month comparison (bar chart)
- Forecast vs. actual (dual-axis chart)

**Task 12.3: AI Insights Cards** (1 day)
- Display AI-generated insights as cards:
  - "You're spending 15% more on napkins this quarter"
  - "Consider switching to Product X for 10% savings"
  - "Your usage of Product Y is declining - still needed?"
- Each card has "Learn more" or "Take action" button

**Dependencies**: Existing analytics API (already built)
**Blocks**: None
**Deliverable**: Customer-facing analytics dashboard

---

### Week 13: Product Search Enhancement

**Task 13.1: Semantic Search UI** (2 days)
- Enhance existing search bar
- No "AI search" label - just works
- Natural language queries: "eco-friendly plates for 200 people"
- Display results with relevance scores
- "Did you mean..." suggestions

**Task 13.2: Search Filters with AI** (1 day)
- AI suggests filters based on query
- Example: Query "catering supplies" → AI suggests filters: "Plates", "Napkins", "Utensils"
- Dynamic filter generation based on search intent

**Task 13.3: Visual Search (Future)** (2 days)
- "Upload image to find similar products" button
- Use Gemini multimodal to analyze image
- Find similar products in catalog
- Display results with similarity scores

**Dependencies**: Existing semantic search (already built)
**Blocks**: None
**Deliverable**: Enhanced AI-powered product search

---

### Week 14: Customer 360 View

**Task 14.1: Customer Profile Page** (2 days)
- Create `/app/(app)/admin/customers/[id]/page.tsx`
- Display comprehensive customer info:
  - Contact details, order history
  - AI-generated customer health score
  - Churn risk indicator
  - Lifetime value, average order value

**Task 14.2: AI Insights Section** (1 day)
- "AI Insights" card showing:
  - Purchase patterns
  - Predicted next order date
  - Recommended products
  - Opportunities (upsell, cross-sell)
  - Risks (declining orders, churn risk)

**Task 14.3: Activity Timeline** (2 days)
- Chronological timeline of:
  - Orders placed
  - Support tickets
  - Price changes
  - AI-detected events (stopped buying Product X)
- Filter by event type

**Dependencies**: Existing customer insights API
**Blocks**: None
**Deliverable**: Comprehensive customer view for admins

---

## PHASE 4: ADMIN AI TOOLS (Weeks 15-18)
**Goal**: Build admin-facing AI features

### Week 15: Opportunity Dashboard

**Task 15.1: Opportunities Page** (2 days)
- Create `/app/(app)/admin/opportunities/page.tsx`
- List all AI-detected opportunities:
  - Stopped purchases (churn risk)
  - Cross-sell opportunities
  - Upsell opportunities
  - Price-sensitive customers
- Sort by: Priority, potential revenue, confidence

**Task 15.2: Opportunity Cards** (1 day)
- Each opportunity shows:
  - Customer name
  - Opportunity type
  - AI reasoning
  - Potential revenue
  - Recommended action
  - Confidence score

**Task 15.3: Opportunity Actions** (1 day)
- "Contact Customer" button (creates task)
  - "Mark as Pursued" (track outcome)
- "Dismiss" (not interested)
- "Create Campaign" (add to email campaign)

**Task 15.4: Opportunity Tracking** (1 day)
- Track opportunity outcomes:
  - Pursued → Won (revenue captured)
  - Pursued → Lost (reason)
  - Dismissed
- AI learns from outcomes to improve future recommendations

**Dependencies**: Existing opportunity detection API
**Blocks**: None
**Deliverable**: Opportunity management dashboard

---

### Week 16: Forecast Dashboard

**Task 16.1: Forecasts Page** (2 days)
- Create `/app/(app)/admin/forecasts/page.tsx`
- Display product usage forecasts:
  - By customer
  - By product
  - By time period (30/90/365 days)
- Charts showing predicted vs. actual

**Task 16.2: Forecast Accuracy Tracking** (1 day)
- Compare AI predictions to actual orders
- Display accuracy metrics:
  - Overall accuracy %
  - Accuracy by product category
  - Accuracy by customer segment
- Use to improve AI model over time

**Task 16.3: Inventory Recommendations** (2 days)
- Based on forecasts, recommend:
  - Products to stock up on
  - Products to reduce inventory
  - Seasonal adjustments
- "Apply Recommendations" button to adjust inventory

**Dependencies**: Existing forecast API
**Blocks**: None
**Deliverable**: Forecast visualization and inventory planning

---

### Week 17: Dynamic Pricing Dashboard

**Task 17.1: Pricing Recommendations Page** (2 days)
- Create `/app/(app)/admin/pricing/page.tsx`
- List all pending pricing recommendations
- Group by: Confidence level, price change %, category
- Filters: Show only increases, only decreases, only high-confidence

**Task 17.2: Recommendation Cards** (1 day)
- Each recommendation shows:
  - Product name, current price, recommended price
  - Price change %
  - AI reasoning
  - Expected impact (sales, revenue, margin)
  - Confidence score
  - Risks

**Task 17.3: Approval Actions** (1 day)
- Approve button → Apply price immediately
- Reject button → Provide reason
- Modify button → Adjust AI recommendation before applying
- Bulk actions: Approve all high-confidence, Reject all margin-reducing

**Task 17.4: Pricing History** (1 day)
- Track all pricing changes:
  - Date, old price, new price
  - Who approved (admin or AI)
  - Actual outcome vs. predicted
- Learn from outcomes to improve recommendations

**Dependencies**: Week 7 (pricing backend)
**Blocks**: None
**Deliverable**: Pricing management dashboard

---

### Week 18: Admin Registration Approval UI

**Task 18.1: Pending Registrations Page** (2 days)
- Create `/app/(app)/admin/registrations/page.tsx`
- List all pending organization registrations
- Show: Company name, contact info, registration date
- Approve/Reject buttons

**Task 18.2: Approval Workflow** (1 day)
- Approve: Send welcome email, enable login
- Reject: Send rejection email with reason
- Request more info: Email asking for additional details
- Bulk approve: Approve multiple at once

**Task 18.3: Registration Details Modal** (1 day)
- Click registration to see full details:
  - Company info
  - Contact person
  - Industry, size, location
  - Any notes from lead capture
- AI-generated risk assessment: "Likely competitor" or "Qualified lead"

**Dependencies**: Week 1 (registration approval backend)
**Blocks**: None
**Deliverable**: Registration approval system

---

## PHASE 5: OPERATIONAL AI (Weeks 19-22)
**Goal**: Automate operational workflows

### Week 19: Invoice Management UI

**Task 19.1: Invoices Page** (2 days)
- Create `/app/(app)/admin/invoices/page.tsx`
- List all invoices:
  - Auto-approved (green)
  - Pending review (yellow)
  - Rejected (red)
- Upload invoice button (PDF/image)

**Task 19.2: Invoice Review Modal** (2 days)
- Display invoice details side-by-side with PO
- Highlight discrepancies in red
- AI explanation of discrepancies
- Approve/Reject/Request clarification buttons

**Task 19.3: Invoice Upload Flow** (1 day)
- Drag-and-drop PDF upload
- AI processes in background
- Shows progress: "Extracting data... Matching PO... Analyzing..."
- Result: Auto-approved or needs review

**Dependencies**: Week 8 (invoice backend)
**Blocks**: None
**Deliverable**: Invoice management system

---

### Week 20: Task Management System

**Task 20.1: Tasks Page** (2 days)
- Create `/app/(app)/admin/tasks/page.tsx`
- List all tasks (manual + AI-generated)
- Filter by: Assigned to, due date, priority, source (AI vs manual)
- Kanban board view option

**Task 20.2: AI-Generated Tasks** (1 day)
- AI creates tasks based on opportunities:
  - "Follow up with Customer X about stopped purchases"
  - "Send quote for bulk order to Customer Y"
  - "Review pricing for Product Z (competitor undercut)"
- Tasks include AI reasoning and suggested actions

**Task 20.3: Task Actions** (1 day)
- Complete task → Track outcome
- Reassign task
- Add notes
- Snooze (remind later)
- AI learns from completed tasks to improve future suggestions

**Dependencies**: Existing tasks table
**Blocks**: None
**Deliverable**: AI-powered task management

---

### Week 21: Document Processing

**Task 21.1: Document Upload** (2 days)
- Create `/app/(app)/admin/documents/page.tsx`
- Upload POs, contracts, certifications
- AI extracts key data:
  - PO: Supplier, items, amounts, due date
  - Contract: Terms, pricing, expiration
  - Certification: Type, expiration, compliance requirements

**Task 21.2: Document Search** (1 day)
- Semantic search across all documents
- Query: "Show me all contracts expiring in next 30 days"
- AI understands intent and returns relevant documents

**Task 21.3: Compliance Alerts** (1 day)
- AI monitors document expiration dates
- Alerts: "Certification X expires in 15 days"
- Automatic reminders to renew
- Dashboard showing compliance status

**Dependencies**: Week 2 (AI security)
**Blocks**: None
**Deliverable**: Document management with AI extraction

---

### Week 22: Approval Workflows

**Task 22.1: Workflow Builder** (2 days)
- Create approval workflow rules:
  - Orders >$5K require manager approval
  - Price changes >10% require admin approval
  - New customers require credit check
- Visual workflow builder (drag-and-drop)

**Task 22.2: AI-Powered Routing** (1 day)
- AI determines appropriate approver based on:
  - Amount, category, customer history
  - Approver availability, workload
  - Past approval patterns
- Suggests routing: "Route to Manager A (approved similar orders)"

**Task 22.3: Exception Handling** (2 days)
- AI flags unusual orders:
  - First-time large order
  - Unusual product combination
  - Pricing discrepancy
- Suggests resolution based on similar past cases
- Learns from approval/rejection patterns

**Dependencies**: Week 2 (AI security)
**Blocks**: None
**Deliverable**: Intelligent approval workflows

---

## PHASE 6: POLISH & OPTIMIZATION (Weeks 23-24)
**Goal**: Refine, test, optimize

### Week 23: Testing & Bug Fixes

**Task 23.1: End-to-End Testing** (2 days)
- Test all AI features with real data
- Verify data isolation (customer A can't see customer B)
- Test edge cases (empty data, errors, timeouts)
- Load testing (100+ concurrent users)

**Task 23.2: AI Accuracy Validation** (1 day)
- Review AI recommendations for accuracy
- Check for hallucinations or incorrect data
- Validate pricing recommendations make sense
- Ensure chatbot responses are appropriate

**Task 23.3: Security Audit** (1 day)
- Penetration testing on AI endpoints
- Verify RLS policies work correctly
- Test rate limiting
- Check for data leakage

**Task 23.4: Bug Fixes** (1 day)
- Fix any issues found in testing
- Optimize slow queries
- Improve error handling

**Dependencies**: All previous phases
**Blocks**: Production deployment
**Deliverable**: Stable, tested platform

---

### Week 24: Documentation & Launch

**Task 24.1: User Documentation** (2 days)
- Create help docs for customers:
  - How to use AI chatbot
  - Understanding analytics dashboard
  - Managing reorder notifications
- Video tutorials for key features

**Task 24.2: Admin Documentation** (1 day)
- Admin guides:
  - Approving pricing recommendations
  - Managing opportunities
  - Processing invoices
  - Approving registrations

**Task 24.3: Launch Preparation** (1 day)
- Announce new AI features to customers
- Email campaign highlighting capabilities
- Update marketing materials
- Train customer support team

**Task 24.4: Monitoring Setup** (1 day)
- Set up monitoring for:
  - AI endpoint performance
  - Error rates
  - User engagement with AI features
  - Cost tracking (Gemini API usage)

**Dependencies**: Week 23 (testing)
**Blocks**: None
**Deliverable**: Production-ready AI-first platform

---

## Success Metrics

**Customer Engagement**:
- % of customers using AI chatbot
- Average messages per conversation
- Chatbot resolution rate (no human needed)

**Operational Efficiency**:
- % of invoices auto-approved
- Time saved on manual tasks
- Support ticket reduction

**Revenue Impact**:
- Conversion rate from opportunities
- Reorder rate from notifications
- Average order value increase

**AI Performance**:
- Forecast accuracy
- Pricing recommendation acceptance rate
- Chatbot satisfaction score

---

## Risk Mitigation

**Data Security**: RLS policies + data isolation + security audits
**AI Accuracy**: Human approval for critical decisions (pricing, large orders)
**User Adoption**: Prominent placement + training + documentation
**Cost Control**: Rate limiting + usage tracking + budget alerts

---

## Next Steps

1. **Review this plan** - Confirm approach and priorities
2. **Start Phase 1, Week 1** - Create RLS policies migration
3. **Daily standups** - Track progress and blockers
4. **Weekly demos** - Show completed features

**Ready to begin?** Let me know if you want to adjust any priorities or start implementation!

