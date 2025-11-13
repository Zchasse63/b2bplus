# 🎯 SPRINT 4 PLAN - Polish & Optimization

**Sprint Period:** Week 4 (December 23-27, 2024)  
**Status:** 📋 Ready to Start  
**Priority Level:** 🟡 P2 (Medium Priority)  
**Total Estimated Hours:** 19 hours  
**Target Completion:** 5/5 tasks (100%)

---

## 📊 Sprint 4 Overview

### Goals
✅ Optimize chatbot message history for performance  
✅ Implement real-time cart updates via Supabase  
✅ Add order status transition validation  
✅ Refactor magic link verification code  
✅ Implement session timeout protection  

### Expected Outcomes
- **Performance:** Chatbot history queries 70% faster
- **UX:** Real-time cart updates across tabs/devices
- **Data Integrity:** Enforce valid order status transitions
- **Code Quality:** Magic link code more maintainable
- **Security:** Auto-logout after inactivity

### Business Impact
- **User Experience:** Instant updates reduce confusion
- **Support:** Fewer "cart disappeared" issues
- **Compliance:** Order state transitions validated
- **Security:** Auto-logout protects against unauthorized access
- **Maintenance:** Cleaner magic link code easier to debug

---

## 🎯 Sprint 4 Tasks

### TASK-026: Optimize Chatbot Message History
**Priority:** P2  
**Estimated Time:** 3 hours  
**Status:** 🟡 Not Started  
**Owner:** [Your Name]  

#### Objective
Optimize chatbot message storage and retrieval for performance. Implement pagination and archiving to keep active conversations fast.

#### Context
Currently:
- All messages stored in single query
- Loads entire conversation history
- Slow as conversations grow (100+ messages)
- No pagination or archiving
- Database queries unoptimized

#### Implementation Steps

```
Step 1: Analyze Current Implementation
├── File: apps/web/src/app/chatbot/page.tsx
├── Check: How messages are loaded
├── Check: Pagination strategy (if any)
├── Check: Database query optimization
└── Findings documented in PR
```

```
Step 2: Implement Message Pagination
├── Database Query:
│   ├── Fetch only last 20 messages on initial load
│   ├── Use cursor-based pagination (more efficient)
│   ├── Query: SELECT * FROM chatbot_messages 
│   │          WHERE conversation_id = ? 
│   │          ORDER BY created_at DESC 
│   │          LIMIT 20
│   └── Add index: (conversation_id, created_at DESC)
├── API Endpoint:
│   ├── GET /api/chatbot/messages?conversationId={id}&cursor={cursor}
│   ├── Return: { messages, nextCursor }
│   └── Rate limit: 5 requests/second
└── Frontend:
    ├── Load initial 20 messages
    ├── Show "Load more" button
    ├── Lazy load older messages on scroll
    └── Keep UI responsive
```

```
Step 3: Create Message Archiving
├── Table: chatbot_conversation_archive
│   ├── id UUID PRIMARY KEY
│   ├── conversation_id UUID REFERENCES chatbot_conversations(id)
│   ├── messages JSONB (array of last 20 messages)
│   ├── archived_at TIMESTAMP
│   ├── message_count INTEGER
│   └── last_message_at TIMESTAMP
├── Trigger: Archive conversation after 30 days of inactivity
├── Benefit: Reduces live query size
└── Recovery: Can restore from archive if needed
```

```
Step 4: Add Database Indexes
├── Index 1: (conversation_id, created_at DESC)
│   └── For: Paginated message queries
├── Index 2: (conversation_id, created_at ASC)
│   └── For: Backward scroll/archive
├── Index 3: (user_id, created_at DESC)
│   └── For: User's conversations list
└── Verification:
    ├── Run EXPLAIN ANALYZE on queries
    ├── Verify index usage
    ├── Benchmark: <100ms for pagination
    └── Benchmark: <200ms for full conversation
```

```
Step 5: Optimize Message Component
├── Implement React.memo for message items
├── Virtualization: Only render visible messages
├── File: apps/web/src/components/chatbot/message-list.tsx
├── Use: react-window for virtualization
├── Benefit: Render 1000 messages with smooth scrolling
└── Testing:
    ├── Load 100 messages, verify smooth scroll
    ├── Load 1000 messages, verify still responsive
    ├── Test scroll performance
    └── Memory usage check
```

```
Step 6: Update UI/UX
├── Show message count at top
├── Add "Load older messages" button
├── Show loading indicator while paginating
├── Display pagination status
├── Smooth scroll behavior
└── Mobile optimization
```

#### Acceptance Criteria
- [ ] Message pagination implemented (load 20 at a time)
- [ ] "Load more" works smoothly
- [ ] Database indexes created and verified
- [ ] Archive strategy documented
- [ ] Virtualization implemented (1000 messages smooth)
- [ ] Query time <100ms for paginated queries
- [ ] Unit tests for pagination logic
- [ ] Integration tests for message loading
- [ ] Performance benchmark shows 70% improvement
- [ ] Mobile works smoothly with many messages

#### Testing Checklist
- [ ] Load conversation with 50 messages (fast)
- [ ] Scroll to load older messages
- [ ] Load conversation with 200 messages (smooth)
- [ ] Test on mobile (scroll performance)
- [ ] Verify database indexes used (EXPLAIN)
- [ ] Test memory usage with 1000 messages
- [ ] Test concurrent message loads
- [ ] Verify archive doesn't lose data

#### Definition of Done
- [ ] Code committed to feature branch
- [ ] PR created with performance metrics
- [ ] Code reviewed by peer
- [ ] All tests passing
- [ ] Performance benchmarks verified
- [ ] Merged to main
- [ ] Deployed to staging
- [ ] Validated in staging (load test)

---

### TASK-027: Implement Real-time Cart Updates
**Priority:** P2  
**Estimated Time:** 4 hours  
**Status:** 🟡 Not Started  
**Owner:** [Your Name]  

#### Objective
Add real-time cart synchronization across browser tabs and devices using Supabase realtime subscriptions.

#### Context
Currently:
- Cart updates only on single tab/browser
- No cross-device synchronization
- Users might see stale cart data
- No real-time inventory deduction
- No collision detection for concurrent updates

#### Implementation Steps

```
Step 1: Enable Supabase Real-time
├── Table: carts
├── Enable real-time events: INSERT, UPDATE, DELETE
├── Setup: Supabase > Replication > Enable for carts table
├── Rows: carts.user_id = auth.uid() (RLS-filtered)
└── Verify: Check Supabase real-time logs
```

```
Step 2: Create Real-time Cart Subscription Hook
├── File: apps/web/src/hooks/useRealTimeCart.ts
├── Functionality:
│   ├── Subscribe to cart changes for current user
│   ├── Listen for INSERT, UPDATE, DELETE events
│   ├── Update local state on change
│   ├── Handle disconnection gracefully
│   └── Merge remote and local updates
├── Usage:
│   const { cart, addItem, removeItem } = useRealTimeCart();
└── Implementation:
    ├── Use Supabase.from('carts').on('*', ...).subscribe()
    ├── Handle 'INSERT': Add item to cart
    ├── Handle 'UPDATE': Update item quantity
    ├── Handle 'DELETE': Remove item
    └── Handle 'PRESENCE': Show other users in team cart (optional)
```

```
Step 3: Implement Conflict Resolution
├── Scenario: User A and B add same item concurrently
├── Strategy: Last write wins (simple) OR Merge updates (complex)
├── Implementation:
│   ├── Track version number for each cart_item
│   ├── On conflict: Compare version, keep higher
│   ├── OR: Sum quantities if same item added
│   └── Log conflicts for debugging
├── Testing:
│   ├── Simulate concurrent updates
│   ├── Verify no duplicate items
│   ├── Verify quantities correct
│   └── Verify no data loss
```

```
Step 4: Add Real-time Notifications
├── Show toast when: "Item added by team member"
├── Show toast when: "Cart updated on other device"
├── Show toast when: "Item removed (out of stock)"
├── Show toast when: "Price changed"
├── Be non-intrusive (auto-dismiss in 3s)
└── Only show if significant change
```

```
Step 5: Update Cart Component
├── File: apps/web/src/components/cart/cart-items.tsx
├── Features:
│   ├── Show real-time updates
│   ├── Indicate sync status (✓ synced, ↻ syncing, ✗ error)
│   ├── Show spinner during real-time update
│   ├── Disable buttons while syncing
│   └── Graceful fallback if real-time unavailable
└── User Feedback:
    ├── Show "Updated by X" for remote changes
    ├── Highlight recently changed items
    ├── Show last sync time
    └── Show connection status
```

```
Step 6: Handle Offline Scenarios
├── When offline:
│   ├── Queue local changes
│   ├── Show "Offline" indicator
│   ├── Allow read-only access to cart
│   └── Warn before checkout
├── When back online:
│   ├── Sync queued changes
│   ├── Resolve any conflicts
│   ├── Refresh cart
│   └── Show sync complete toast
└── Testing:
    ├── Go offline (dev tools)
    ├── Add/remove items
    ├── Go back online
    ├── Verify sync worked
```

```
Step 7: Add Analytics
├── Track: Real-time sync success rate (target >99%)
├── Track: Avg sync time (target <500ms)
├── Track: Conflict frequency
├── Track: User preferences (sync on/off)
└── Dashboard: Real-time cart stats
```

#### Acceptance Criteria
- [ ] Supabase real-time enabled for carts
- [ ] Real-time subscription hook created
- [ ] Real-time updates work in same tab
- [ ] Real-time updates work across tabs
- [ ] Real-time updates work across devices
- [ ] Conflict resolution implemented
- [ ] Offline mode works
- [ ] Toast notifications show updates
- [ ] Sync status indicator present
- [ ] Unit tests for sync logic
- [ ] Integration tests for real-time
- [ ] Manual testing: multi-device sync

#### Testing Checklist
- [ ] Open cart in 2 browser tabs
- [ ] Add item in tab 1, see update in tab 2 instantly
- [ ] Open app on phone and desktop
- [ ] Add item on desktop, see on phone instantly
- [ ] Test concurrent updates (same item)
- [ ] Go offline, make changes, go online
- [ ] Verify changes synced correctly
- [ ] Test with 10+ items in cart
- [ ] Test on slow network (throttle)
- [ ] Verify no duplicate items

#### Definition of Done
- [ ] Code committed to feature branch
- [ ] PR created with setup instructions
- [ ] Code reviewed by peer
- [ ] All tests passing
- [ ] Manual testing with multiple devices
- [ ] Merged to main
- [ ] Deployed to staging
- [ ] Real-time working in staging
- [ ] Monitored for sync errors

---

### TASK-028: Add Order Status Transition Validation
**Priority:** P2  
**Estimated Time:** 4 hours  
**Status:** 🟡 Not Started  
**Owner:** [Your Name]  

#### Objective
Implement validation to enforce valid order status transitions and prevent invalid state changes.

#### Context
Currently:
- Any status can transition to any other status
- No business logic enforcement
- Orders can jump from pending directly to shipped
- No audit trail of transitions
- Potential data integrity issues

#### Implementation Steps

```
Step 1: Define Valid Transitions
├── Create Status Transition Table:
│   ├── pending → processing (payment verified)
│   ├── pending → cancelled (user or admin)
│   ├── processing → shipped (items picked/packed)
│   ├── processing → failed (payment issue)
│   ├── shipped → delivered (carrier confirmation)
│   ├── shipped → returned (customer returned)
│   ├── failed → pending (retry payment)
│   ├── cancelled → pending (reopen)
│   └── delivered → completed (final state)
├── Invalid transitions:
│   ├── completed → any (terminal state)
│   ├── shipped → pending (regression)
│   └── delivered → pending (regression)
└── Special cases:
    ├── Admin can force any transition (with audit log)
    ├── Automated transitions (payment confirmed, carrier)
    └── User-initiated transitions (cancel, return)
```

```
Step 2: Create Validation Rules Engine
├── File: lib/order-status-validator.ts
├── Function: validateTransition(currentStatus, nextStatus, user)
├── Returns: { valid: boolean, reason?: string }
├── Logic:
│   ├── Check if transition in allowed list
│   ├── Check user permissions (admin, owner, system)
│   ├── Check order state prerequisites
│   ├── Check business rules (items in stock, etc.)
│   └── Log attempted transitions (even invalid)
└── Example:
    validateTransition('pending', 'shipped', user)
    // Returns: { valid: false, reason: "Order not in processing status" }
```

```
Step 3: Create Status Transition Table
├── Database: CREATE TABLE order_status_transitions (
│   id UUID PRIMARY KEY,
│   order_id UUID REFERENCES orders(id),
│   from_status VARCHAR,
│   to_status VARCHAR,
│   changed_by UUID REFERENCES profiles(id),
│   reason TEXT,
│   metadata JSONB,
│   created_at TIMESTAMP DEFAULT NOW()
├── Indexes:
│   ├── (order_id, created_at DESC)
│   ├── (changed_by, created_at DESC)
│   └── (from_status, to_status)
└── RLS:
    ├── Order owner can see transitions
    ├── Admin can see all
    └── Service role can insert
```

```
Step 4: Update Order Update Endpoint
├── File: app/api/orders/{id}/status.ts
├── Changes:
│   ├── Extract new status from request
│   ├── Call validateTransition()
│   ├── If invalid, return 400 with reason
│   ├── If valid, update status
│   ├── Log transition with reason
│   └── Trigger notifications
└── Error responses:
    ├── 400: { error: "Invalid transition from pending to shipped" }
    ├── 403: { error: "Unauthorized: admin only transition" }
    ├── 409: { error: "Order in processing, cannot cancel" }
```

```
Step 5: Create Admin Transition Overrides
├── Endpoint: POST /api/admin/orders/{id}/force-status
├── Parameters:
│   ├── new_status: string
│   ├── reason: string (required)
│   └── notify_customer: boolean
├── Validation:
│   ├── Admin only
│   ├── Requires reason
│   └── Logs to audit trail
├── Usage: Handle edge cases, customer support
└── Audit: All admin transitions logged and notified
```

```
Step 6: Create Transition History UI
├── File: app/admin/orders/{id}/transitions.tsx
├── Display:
│   ├── Timeline of all transitions
│   ├── From/to status
│   ├── Who made change
│   ├── When (timestamp)
│   ├── Reason
│   └── Any metadata
└── Sorting: Most recent first
```

```
Step 7: Add Notifications
├── On status change, notify:
│   ├── Order owner (email + in-app)
│   ├── Admin dashboard
│   ├── Organization admins
│   └── Customer (if customer-initiated)
├── Message template:
│   ├── "Your order is now being processed"
│   ├── "Your order has shipped! Track here: {link}"
│   ├── "Your order has been delivered"
│   └── "Your order was cancelled"
```

```
Step 8: Add Validation Tests
├── Unit tests:
│   ├── Test valid transitions
│   ├── Test invalid transitions
│   ├── Test admin overrides
│   └── Test permission checks
├── Integration tests:
│   ├── Create order, transition through states
│   ├── Verify history logged
│   ├── Verify notifications sent
│   └── Verify RLS enforced
```

#### Acceptance Criteria
- [ ] Status transition rules defined
- [ ] Validation engine created
- [ ] Transition history table created
- [ ] Order update endpoint validates transitions
- [ ] Admin override capability
- [ ] History UI shows all transitions
- [ ] Notifications sent on status change
- [ ] Invalid transitions blocked with reason
- [ ] Unit tests for validation logic
- [ ] Integration tests for transitions
- [ ] No regressions in order flow

#### Testing Checklist
- [ ] Create order (starts as pending)
- [ ] Transition pending → processing (succeeds)
- [ ] Try pending → shipped (fails with reason)
- [ ] Try pending → completed (fails)
- [ ] Admin forces pending → shipped (succeeds with log)
- [ ] View transition history
- [ ] Verify notifications sent
- [ ] Verify all transitions logged
- [ ] Test permission checks
- [ ] Performance: validation <50ms

#### Definition of Done
- [ ] Code committed to feature branch
- [ ] PR created with transition rules doc
- [ ] Code reviewed by peer
- [ ] All tests passing
- [ ] Manual testing completed
- [ ] Merged to main
- [ ] Deployed to staging
- [ ] Validated in staging (create order, transition)

---

### TASK-029: Refactor Magic Link Verification
**Priority:** P2  
**Estimated Time:** 5 hours  
**Status:** 🟡 Not Started  
**Owner:** [Your Name]  

#### Objective
Refactor magic link verification code for clarity, maintainability, and testability. Break into smaller functions with clear responsibilities.

#### Context
Currently:
- Magic link logic scattered across multiple files
- No clear separation of concerns
- Difficult to test
- Hard to debug
- Difficult to extend (e.g., add new verification types)

#### Implementation Steps

```
Step 1: Analyze Current Implementation
├── Search: All files using magic links
├── Find: apps/web/src/app/auth/magic-link
├── Find: lib/auth/magic-link
├── Document: Current flow
└── Identify: Pain points and improvements
```

```
Step 2: Create Type System
├── File: lib/auth/types.ts
├── Types:
│   ├── MagicLinkToken { token, expiresAt, type, userId, email }
│   ├── VerificationType: 'signup' | 'signin' | 'reset_password'
│   ├── VerificationResult { success, userId, redirectUrl }
│   └── VerificationError { code, message }
└── Benefits:
    ├── Type safety
    ├── Clear contracts
    └── Better IDE support
```

```
Step 3: Create Magic Link Service
├── File: lib/auth/magic-link-service.ts
├── Class: MagicLinkService
├── Methods:
│   ├── generateToken(email, type): Promise<token>
│   ├── sendMagicLink(email, type, redirectUrl): Promise<void>
│   ├── verifyToken(token): Promise<VerificationResult>
│   ├── revokeToken(token): Promise<void>
│   └── isTokenValid(token): boolean
└── Benefits:
    ├── Single responsibility
    ├── Easy to test
    ├── Reusable across app
    └── Clear interface
```

```
Step 4: Create Token Management
├── File: lib/auth/token-manager.ts
├── Functions:
│   ├── createToken(email, type, expiresIn = 24h)
│   ├── storeToken(token, data): Save to db
│   ├── retrieveToken(token): Get from db
│   ├── deleteToken(token): Remove from db
│   ├── isExpired(token): Check expiration
│   └── cleanup(): Delete old tokens
└── Features:
    ├── Automatic expiration check
    ├── Secure token generation (crypto)
    ├── Rate limiting on token creation
    └── Token rotation support
```

```
Step 5: Create Email Service Integration
├── File: lib/auth/email-service.ts
├── Functions:
│   ├── sendMagicLinkEmail(email, token, type)
│   ├── sendVerificationEmail(email, token)
│   ├── sendPasswordResetEmail(email, token)
│   ├── sendWelcomeEmail(email)
│   └── buildMagicLinkUrl(token): Generate URL
└── Features:
    ├── Template system
    ├── Email personalization
    ├── Resend capability
    ├── Rate limiting
    └── Delivery tracking
```

```
Step 6: Create Verification Handlers
├── File: lib/auth/verification-handlers.ts
├── Handlers for each type:
│   ├── handleSignupVerification(token)
│   ├── handleSigninVerification(token)
│   ├── handlePasswordResetVerification(token)
│   └── handleEmailChangeVerification(token)
├── Each handler:
│   ├── Validates token
│   ├── Creates user or session
│   ├── Sends confirmation email
│   ├── Logs activity
│   └── Returns redirect URL
└── Benefits:
    ├── Clear separation
    ├── Easy to extend
    ├── Testable
    └── Reusable
```

```
Step 7: Update API Endpoint
├── File: app/api/auth/verify-magic-link.ts
├── Changes:
│   ├── Inject MagicLinkService
│   ├── Call appropriate handler
│   ├── Return clear error messages
│   ├── Log all attempts
│   └── Return JSON (not redirect)
├── Example:
   const result = await magicLinkService.verifyToken(token);
   if (!result.success) {
     return res.status(400).json({ error: result.error });
   }
   return res.json({ redirectUrl: result.redirectUrl });
```

```
Step 8: Create Comprehensive Tests
├── Unit Tests:
│   ├── Token generation
│   ├── Token validation
│   ├── Token expiration
│   ├── Token cleanup
│   ├── Email sending
│   └── Each verification type
├── Integration Tests:
│   ├── Full signup flow
│   ├── Full signin flow
│   ├── Password reset flow
│   ├── Token expiration flow
│   └── Rate limiting
└── Test file: lib/auth/__tests__/magic-link-service.test.ts
```

```
Step 9: Update Documentation
├── File: docs/MAGIC_LINK_FLOW.md
├── Document:
│   ├── Token lifecycle
│   ├── Verification types
│   ├── Error handling
│   ├── Security considerations
│   ├── API reference
│   └── Examples (code snippets)
└── Audience:
    ├── Developers
    ├── Support team
    ├── Security reviewers
```

```
Step 10: Refactor UI Components
├── File: app/auth/verify-magic-link/page.tsx
├── Changes:
│   ├── Use new MagicLinkService
│   ├── Show clear status messages
│   ├── Handle errors gracefully
│   ├── Show loading state
│   ├── Auto-redirect on success
│   └── Provide resend option
└── UX improvements:
    ├── Show token expiration time
    ├── Clear error explanations
    ├── Resend option with countdown
    ├── Try again button
    └── Support link
```

#### Acceptance Criteria
- [ ] Type system created and complete
- [ ] MagicLinkService class created
- [ ] Token manager utility created
- [ ] Email service integration done
- [ ] Verification handlers for each type
- [ ] API endpoint refactored
- [ ] All existing functionality preserved
- [ ] Error handling comprehensive
- [ ] Unit tests >90% coverage
- [ ] Integration tests covering all flows
- [ ] Documentation complete
- [ ] No regressions in auth flow

#### Testing Checklist
- [ ] Signup magic link works
- [ ] Signin magic link works
- [ ] Password reset magic link works
- [ ] Expired token rejected
- [ ] Invalid token rejected
- [ ] Email sent successfully
- [ ] Token deleted after use
- [ ] Rate limiting works
- [ ] All error messages clear
- [ ] Unit tests pass
- [ ] Integration tests pass

#### Definition of Done
- [ ] Code committed to feature branch
- [ ] PR created with refactoring overview
- [ ] Code reviewed by peer
- [ ] All tests passing
- [ ] Manual testing completed
- [ ] Documentation updated
- [ ] Merged to main
- [ ] Deployed to staging
- [ ] No regressions in staging

---

### TASK-030: Implement Session Timeout
**Priority:** P2  
**Estimated Time:** 3 hours  
**Status:** 🟡 Not Started  
**Owner:** [Your Name]  

#### Objective
Implement automatic session timeout after inactivity to improve security and prevent unauthorized access on shared devices.

#### Context
Currently:
- Sessions persist indefinitely
- No inactivity timeout
- Users can leave device logged in
- Shared devices at risk
- No session management

#### Implementation Steps

```
Step 1: Configure Supabase Session Timeout
├── Supabase Settings:
│   ├── Go to Project Settings > Auth
│   ├── Set Session Timeout: 7 days absolute max
│   ├── Set Idle Timeout: 1 hour (can customize)
│   └── Save settings
├── This sets backend timeout
└── Frontend still needs detection/warning
```

```
Step 2: Create Activity Tracker Hook
├── File: hooks/useActivityTracker.ts
├── Functionality:
│   ├── Track user activity (clicks, keys, scrolls)
│   ├── Reset inactivity timer on activity
│   ├── Count down to session expiration
│   ├── Emit warning when < 5 min left
│   └── Auto-logout when time expired
├── Events to track:
│   ├── Mouse clicks
│   ├── Keyboard input
│   ├── Scroll events
│   ├── Page focus
│   └── Form input
└── Configuration:
    ├── INACTIVITY_TIMEOUT: 3600000ms (1 hour)
    ├── WARNING_TIME: 300000ms (5 min before timeout)
    ├── THROTTLE_TRACKING: 5000ms (update every 5s)
    └── EXEMPT_ROUTES: ['/login', '/signup', '/verify-email']
```

```
Step 3: Create Session Manager Service
├── File: lib/session-manager.ts
├── Features:
│   ├── Track session start time
│   ├── Track last activity time
│   ├── Calculate time remaining
│   ├── Trigger warning modal
│   ├── Extend session on activity
│   ├── Force logout on timeout
│   └── Handle network issues
├── Session Extension:
│   ├── POST /api/auth/extend-session
│   ├── Validates user still authenticated
│   ├── Refreshes session tokens
│   ├── Returns new expiration
│   └── Rate limit: max 1/min
└── Integration:
    ├── Initialize on app start
    ├── Subscribe to activity events
    ├── Emit timeouts to listeners
    └── Handle logout gracefully
```

```
Step 4: Create Session Timeout Warning Modal
├── File: components/modals/session-timeout-warning.tsx
├── Features:
│   ├── Show warning when 5 min left
│   ├── Display countdown timer
│   ├── "Extend Session" button
│   ├── "Logout Now" button
│   ├── Close button (dismiss for 1 min)
│   └── Auto-hide on activity (if not critical)
├── Display:
│   ├── "Your session expires in 5:00"
│   ├── "Click 'Extend Session' to stay logged in"
│   ├── Show time ticking down
│   └── Red styling (urgency)
└── Behavior:
    ├── Show once per warning period
    ├── Dismiss on action
    ├── Reappear if still inactive
    ├── Modal stays on top
    └── Cannot interact with app behind modal
```

```
Step 5: Implement Session Extension
├── On "Extend Session" button:
│   ├── Call POST /api/auth/extend-session
│   ├── Refresh Supabase session
│   ├── Reset inactivity timer
│   ├── Close warning modal
│   ├── Show "Session extended" toast
│   └── Update session expiration display
├── Rate limiting:
│   ├── Max 10 extensions per 24 hours
│   ├── Max 1 extension per minute
│   ├── Show error if exceeded
│   └── Log abuse attempts
└── Logging:
    ├── Log session extension
    ├── Track extension frequency
    ├── Monitor abuse patterns
```

```
Step 6: Implement Logout on Timeout
├── On session timeout:
│   ├── Call POST /api/auth/logout
│   ├── Clear Supabase session
│   ├── Clear local storage
│   ├── Clear cookies
│   ├── Navigate to login page
│   ├── Show message: "Session expired, please login again"
│   └── Save return URL for post-login redirect
├── Data cleanup:
│   ├── Clear auth context
│   ├── Clear user data cache
│   ├── Cancel pending requests
│   └── Close real-time subscriptions
└── Error handling:
    ├── Handle logout failures gracefully
    ├── Still redirect to login
    ├── Show error toast
    ├── Log errors for debugging
```

```
Step 7: Add Session Management UI
├── Show session status in header:
│   ├── "Session expires: XX:XX"
│   ├── Countdown timer
│   ├── Visual indicator (green/yellow/red)
│   └── Click for details
├── User Profile > Settings > Sessions:
│   ├── List active sessions
│   ├── Show device type (web, mobile)
│   ├── Show last activity
│   ├── Show IP address
│   ├── "Logout this session" button
│   ├── "Logout all sessions" button
│   └── Show session history
└── Admin Dashboard:
    ├── View user sessions
    ├── Force logout any user
    ├── Monitor session abuse
    └── Alert on suspicious patterns
```

```
Step 8: Handle Edge Cases
├── Session extension after timeout:
│   ├── Should fail with 401
│   ├── User redirected to login
│   └── Return URL preserved
├── Network unavailable:
│   ├── Continue tracking activity locally
│   ├── Try session extension when online
│   ├── Fall back to local timeout
│   └── Don't clear session until confirmed
├── Tab switching:
│   ├── Pause timeout when tab inactive
│   ├── Resume when tab active
│   ├── Sync across tabs (via localStorage events)
│   └── Share session expiration across tabs
└── Concurrent sessions:
    ├── Track multiple sessions per user
    ├── Each device has own timeout
    ├── Logout one device doesn't affect others
    ├── List sessions in settings
```

```
Step 9: Create Tests
├── Unit Tests:
│   ├── Activity tracking
│   ├── Timeout calculation
│   ├── Session extension logic
│   ├── Logout logic
│   └── Edge cases
├── Integration Tests:
│   ├── Full timeout flow