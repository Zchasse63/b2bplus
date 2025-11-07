# Phase 3: Customer-Facing UI
## Weeks 9-14 | Medium Priority 🟢

**Part of**: [Master Implementation Plan](./MASTER_IMPLEMENTATION_PLAN.md)
**Previous Phase**: [Phase 2: AI Backend Logic](./PHASE_2_AI_BACKEND_LOGIC.md)
**Timeline**: 6 weeks
**Status**: ✅ COMPLETE
**Completed**: January 5, 2025
**Priority**: MEDIUM - Customer-visible AI features

---

## Overview

Phase 3 builds user interfaces for customers to interact with AI features. All backend logic from Phase 2 is already functional; this phase makes it accessible to users.

**Why This Phase Comes Third**:
- Requires backend APIs from Phase 2
- Requires secure foundation from Phase 1
- Customer-facing features drive adoption and ROI
- Visible impact on user experience

**What This Phase Delivers**:
- ✅ AI Chatbot UI (ChatGPT-style interface)
- ✅ Public Chatbot for lead generation
- ✅ Reorder notification system
- ✅ Customer analytics dashboard
- ✅ Enhanced product search
- ✅ Customer 360 view (admin)

---

## Week 9: AI Chatbot UI (Authorized Users)

### Task 9.1: Chatbot Page (2 days)

**File**: `apps/web/app/(app)/chat/page.tsx`

**Design Requirements**:
- Full-page chat interface (NOT a tiny corner widget)
- ChatGPT/Claude-style conversation UI
- Message history with user/AI avatars
- Input box with send button
- "New conversation" button
- Mobile-responsive

**Component Structure**:
```typescript
'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  async function sendMessage() {
    if (!input.trim()) return;
    
    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: new Date() }]);
    setLoading(true);
    
    try {
      const response = await fetch('/api/chatbot/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          conversationId
        })
      });
      
      const data = await response.json();
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      }]);
      
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }
      
      // Show suggestions if provided
      if (data.suggestions) {
        // Display as clickable chips
      }
      
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">AI Assistant</h1>
        <button onClick={() => { setMessages([]); setConversationId(null); }}>
          New Conversation
        </button>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <h2 className="text-xl mb-4">How can I help you today?</h2>
            <p>Ask me about orders, products, or anything else!</p>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] rounded-lg p-4 ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-900'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-4">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <div className="border-t p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type your message..."
            className="flex-1 border rounded-lg px-4 py-2"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Deliverable**: Full-page chatbot interface

---

### Task 9.2: Quick Action Buttons (1 day)

**Enhancement**: Add prominent quick action buttons above chat input.

```typescript
const quickActions = [
  { label: "What did I order last month?", message: "Show me my orders from last month" },
  { label: "Check my recent orders", message: "What are my recent orders?" },
  { label: "Find products", message: "I'm looking for products" },
  { label: "Show me what you can do", message: "What can you help me with?" }
];

// Display as buttons that send pre-written messages
{quickActions.map(action => (
  <button
    key={action.label}
    onClick={() => {
      setInput(action.message);
      sendMessage();
    }}
    className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
  >
    {action.label}
  </button>
))}
```

**Deliverable**: Quick action buttons for common queries

---

### Task 9.3: Chatbot Suggestions (1 day)

**Enhancement**: Display AI-suggested follow-up questions as clickable chips.

```typescript
{data.suggestions && (
  <div className="flex flex-wrap gap-2 mt-2">
    {data.suggestions.map((suggestion, idx) => (
      <button
        key={idx}
        onClick={() => {
          setInput(suggestion);
          sendMessage();
        }}
        className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm hover:bg-blue-100"
      >
        {suggestion}
      </button>
    ))}
  </div>
)}
```

**Deliverable**: Suggested follow-up questions

---

### Task 9.4: Navigation Integration (1 day)

**Updates**:
- Add "AI Assistant" to main navigation
- Badge showing unread notifications
- Mobile-friendly chat interface
- Keyboard shortcut (Cmd+K to open chat)

**File**: `apps/web/components/layout/Navigation.tsx`

```typescript
<nav>
  <Link href="/chat" className="flex items-center space-x-2">
    <MessageSquare className="w-5 h-5" />
    <span>AI Assistant</span>
    {unreadCount > 0 && (
      <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
        {unreadCount}
      </span>
    )}
  </Link>
</nav>
```

**Deliverable**: Chatbot integrated into navigation

---

## Week 10: Public Chatbot UI (Non-Authorized Users)

### Task 10.1: Landing Page Chatbot (2 days)

**File**: `apps/web/components/landing/PublicChatbot.tsx`

**Design**: Prominent chat section on landing page (NOT tiny corner widget)

```typescript
'use client';

export function PublicChatbot() {
  const [messages, setMessages] = useState([]);
  const [showLeadForm, setShowLeadForm] = useState(false);
  
  // Similar to authenticated chatbot but:
  // - Uses /api/chatbot/public endpoint
  // - Shows lead capture form after 2-3 messages
  // - Displays CTA to sign in for full access
  
  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Chat with us</h2>
      <p className="text-gray-600 mb-4">
        Have questions? Our AI assistant can help!
      </p>
      
      {/* Chat interface */}
      {/* ... */}
      
      {showLeadForm && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-bold mb-2">Get personalized assistance</h3>
          <form onSubmit={handleLeadSubmit}>
            <input name="contact_name" placeholder="Your Name" required />
            <input name="email" type="email" placeholder="Email" required />
            <input name="company_name" placeholder="Company Name" required />
            <button type="submit">Continue</button>
          </form>
        </div>
      )}
    </div>
  );
}
```

**Deliverable**: Public chatbot on landing page

---

### Task 10.2: Lead Capture Flow (1 day)

**Implementation**: After 2-3 messages, AI requests lead information inline.

**Deliverable**: Seamless lead capture in chat

---

### Task 10.3: Public Chat Limitations (1 day)

**Implementation**: Clear messaging about what requires sign-in.

```typescript
{aiResponse.ctaMessage && (
  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
    <p className="text-sm text-yellow-800">{aiResponse.ctaMessage}</p>
    <Link href="/login" className="text-blue-600 underline">
      Sign in for full access →
    </Link>
  </div>
)}
```

**Deliverable**: Clear CTAs for sign-in

---

## Week 11: Reorder Notifications UI

### Task 11.1: In-App Notification Center (2 days)

**File**: `apps/web/app/(app)/notifications/page.tsx`

**Features**:
- List all notifications (reorder predictions, price changes, etc.)
- Filter by type, status
- Mark as read/dismissed
- Notification badge in navigation

**Deliverable**: Notification center page

---

### Task 11.2: Reorder Notification Card (1 day)

**Component**: Display predicted products with checkboxes and "Add to Cart" button.

**Deliverable**: Interactive reorder notification cards

---

### Task 11.3: Email Notification Improvements (1 day)

**Template**: Beautiful HTML email with product images and one-click add to cart.

**Deliverable**: Professional email notifications

---

### Task 11.4: Notification Preferences (1 day)

**File**: `apps/web/app/(app)/settings/notifications/page.tsx`

**Settings**:
- Toggle reorder notifications on/off
- Set frequency (daily, weekly, monthly)
- Set threshold (notify when 80% through usage cycle)

**Deliverable**: Notification preferences page

---

## Week 12: Customer Analytics Dashboard

### Task 12.1: Dashboard Page (3 days)

**File**: `apps/web/app/(app)/analytics/page.tsx`

**Features**:
- Spending trends (charts)
- Top products
- Usage forecasts
- Cost-saving opportunities
- Seasonal patterns

**Deliverable**: Customer analytics dashboard

---

### Task 12.2: Interactive Charts (1 day)

**Library**: Recharts for visualizations

**Charts**:
- Spending over time (line chart)
- Product category breakdown (pie chart)
- Month-over-month comparison (bar chart)
- Forecast vs. actual (dual-axis chart)

**Deliverable**: Interactive data visualizations

---

### Task 12.3: AI Insights Cards (1 day)

**Component**: Display AI-generated insights as actionable cards.

```typescript
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {insights.map(insight => (
    <div key={insight.id} className="p-4 bg-white rounded-lg shadow">
      <h3 className="font-bold mb-2">{insight.title}</h3>
      <p className="text-gray-600 mb-3">{insight.description}</p>
      <button className="text-blue-600 hover:underline">
        {insight.actionLabel} →
      </button>
    </div>
  ))}
</div>
```

**Deliverable**: AI insights cards

---

## Week 13: Product Search Enhancement

### Task 13.1: Semantic Search UI (2 days)

**Enhancement**: Improve existing search bar with AI capabilities.

**Features**:
- Natural language queries work seamlessly
- No "AI search" label - just works
- Display results with relevance scores
- "Did you mean..." suggestions

**Deliverable**: Enhanced search experience

---

### Task 13.2: Search Filters with AI (1 day)

**Feature**: AI suggests filters based on query.

**Example**: Query "catering supplies" → AI suggests filters: "Plates", "Napkins", "Utensils"

**Deliverable**: AI-suggested search filters

---

### Task 13.3: Visual Search (Future) (2 days)

**Feature**: Upload image to find similar products.

**Implementation**: Use Gemini multimodal to analyze image and find matches.

**Deliverable**: Visual product search

---

## Week 14: Customer 360 View (Admin)

### Task 14.1: Customer Profile Page (2 days)

**File**: `apps/web/app/(app)/admin/customers/[id]/page.tsx`

**Features**:
- Contact details, order history
- AI-generated customer health score
- Churn risk indicator
- Lifetime value, average order value

**Deliverable**: Comprehensive customer profile

---

### Task 14.2: AI Insights Section (1 day)

**Component**: "AI Insights" card showing purchase patterns, predictions, opportunities.

**Deliverable**: AI insights for customer profiles

---

### Task 14.3: Activity Timeline (2 days)

**Component**: Chronological timeline of orders, support tickets, price changes, AI-detected events.

**Deliverable**: Customer activity timeline

---

## Dependencies

**This Phase Depends On**:
- ✅ [Phase 1: Foundation & Security](./PHASE_1_FOUNDATION_SECURITY.md) - RLS policies, data access
- ✅ [Phase 2: AI Backend Logic](./PHASE_2_AI_BACKEND_LOGIC.md) - All backend APIs

**This Phase Enables**:
- Customer adoption of AI features
- Visible ROI from AI investment
- Lead generation through public chatbot

---

## Success Criteria

- ✅ Customers can chat with AI assistant
- ✅ Public chatbot captures leads
- ✅ Reorder notifications displayed and actionable
- ✅ Analytics dashboard shows AI insights
- ✅ Product search uses AI seamlessly
- ✅ Admin can view customer 360 profiles
- ✅ Mobile-responsive on all pages
- ✅ Positive user feedback on AI features

---

## Next Phase

**[Phase 4: Admin AI Tools →](./PHASE_4_ADMIN_AI_TOOLS.md)**

Build admin-facing AI dashboards for opportunities, forecasts, and pricing.

