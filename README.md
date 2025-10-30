# B2B+ Platform

Food service disposables ordering platform with container optimization.

> **👋 New to this project?** Start with [PROJECT-GUIDE.md](./PROJECT-GUIDE.md) for a complete overview!

## 🎯 Project Overview

B2B+ is a comprehensive B2B e-commerce solution targeting the food service industry with a unique container optimization feature. The platform enables businesses to order disposables efficiently while optimizing container loading through 3D visualization and bin packing algorithms.

**Target Market:** 80% mobile orders in B2B food service industry  
**Current Status:** Phases 0-4 Complete (MVP-ready core platform)  
**Timeline:** 7-10 weeks to MVP, 28-38 weeks to full platform  
**Monthly Costs:** $48-63 (current), $73-129 (full platform)

## 🏗️ Architecture

This is a **Turborepo monorepo** containing:

- **apps/web** - Next.js 14 web application (App Router, TypeScript, Tailwind CSS)
- **apps/mobile** - Expo/React Native mobile application (Expo Router, TypeScript)
- **packages/shared** - Shared business logic, utilities, types, and validation schemas
- **packages/ui** - Shared UI components (React Native compatible)
- **packages/supabase** - Supabase client and database types

## 🚀 Tech Stack

### Frontend
- **Web:** Next.js 14 (App Router), React 18, Tailwind CSS 3
- **Mobile:** Expo SDK 51+, React Native 0.74+, Expo Router
- **Monorepo:** Turborepo with npm workspaces

### Backend & Services
- **Database:** Supabase (Postgres with Row Level Security)
- **Auth:** Supabase Auth
- **Storage:** Supabase Storage
- **Edge Functions:** Supabase Edge Functions (Deno)

### AI/ML
- **Semantic Search:** OpenAI text-embedding-3-small
- **Excel Mapping:** OpenAI GPT-5-mini
- **Data Cleaning:** OpenAI GPT-5-mini (Phase 6)

### 3D & Optimization
- **3D Visualization:** React Three Fiber (R3F), Three.js
- **Bin Packing:** binpackingjs (pure algorithm, no LLMs)

### Mobile Features
- **Offline:** WatermelonDB (bidirectional sync)
- **Notifications:** Expo Notifications, Twilio (SMS), Resend (email)

## 📋 Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Expo CLI (for mobile development)
- Supabase CLI (optional, for local development)

## 🔐 Demo Login Credentials

For testing and development, use these pre-configured demo accounts:

### Regular User (Member)
- **Email:** `test@testmail.app`
- **Password:** `TestPassword123!`
- **Access:** Standard user workflows, cart operations, order placement

### Admin User
- **Email:** `admin@testmail.app`
- **Password:** `AdminPassword123!`
- **Access:** Admin features, user management, approval workflows

> **Note:** These accounts are automatically created by the test data migration. See [TEST-DATA-DOCUMENTATION.md](./TEST-DATA-DOCUMENTATION.md) for complete test data reference.

---

## 🛠️ Getting Started

### 1. Clone and Install

```bash
cd /Users/zach/projects/b2b-plus
npm install
```

### 2. Environment Variables

Copy the example environment file and configure:

```bash
# Web app
cp apps/web/.env.local.example apps/web/.env.local

# Mobile app
cp apps/mobile/.env.example apps/mobile/.env
```

**Required Environment Variables:**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]

# OpenAI (for semantic search and AI features)
OPENAI_API_KEY=[openai-key]

# Twilio (for SMS notifications)
TWILIO_ACCOUNT_SID=[twilio-sid]
TWILIO_AUTH_TOKEN=[twilio-token]
TWILIO_PHONE_NUMBER=[twilio-number]

# Resend (for email notifications)
RESEND_API_KEY=[resend-key]

# Mobile (Expo)
EXPO_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
```

### 3. Run Development Servers

**Web App:**
```bash
cd apps/web
npm run dev
# Open http://localhost:3000
```

**Mobile App:**
```bash
cd apps/mobile
npm start
# Scan QR code with Expo Go app
```

**All Apps (Turborepo):**
```bash
npm run dev
```

## 📦 Project Structure

```
b2b-plus/
├── apps/
│   ├── web/              # Next.js web application
│   │   ├── app/          # App Router pages
│   │   ├── components/   # Web-specific components
│   │   └── public/       # Static assets
│   └── mobile/           # Expo mobile application
│       ├── app/          # Expo Router screens
│       ├── components/   # Mobile-specific components
│       └── assets/       # Mobile assets
├── packages/
│   ├── shared/           # Shared business logic
│   │   ├── utils/        # Utility functions
│   │   ├── types/        # TypeScript types
│   │   ├── constants/    # Constants
│   │   └── validation/   # Zod schemas
│   ├── ui/               # Shared UI components
│   │   └── components/   # Button, Input, Card, etc.
│   └── supabase/         # Supabase client
│       ├── client.ts     # Supabase client instance
│       └── types.ts      # Database types
├── supabase/             # Supabase configuration
│   ├── migrations/       # Database migrations
│   └── functions/        # Edge Functions
├── Phase 5-16/           # Future phase documentation
├── Manual Tasks - Master Folder/  # Manual work tracking
├── turbo.json            # Turborepo configuration
├── package.json          # Root package.json
└── eas.json              # EAS Build configuration
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests for specific app
cd apps/web && npm test
cd apps/mobile && npm test
```

**Current Test Coverage:** 70%+ across Phases 2-4

## 📱 Mobile Development

### iOS Simulator
```bash
cd apps/mobile
npm run ios
```

### Android Emulator
```bash
cd apps/mobile
npm run android
```

### EAS Build
```bash
# Development build
eas build --profile development --platform ios

# Production build
eas build --profile production --platform all
```

## 🗄️ Database

The project uses Supabase with the following key tables:

- `organizations` - Multi-tenant organization data
- `profiles` - User profiles
- `products` - Product catalog with search vectors and embeddings
- `orders` - Order management with auto-generated order numbers
- `cart_items` - Shopping cart with price change detection
- `shipping_addresses` - Multiple delivery addresses per organization
- `pricing_tiers` - Dynamic pricing system (5-tier priority)
- `container_types` - Container optimization
- `categories` - Hierarchical product categories (Phase 5)
- `notifications_queue` - Multi-channel notification queue

**Database Extensions:**
- uuid-ossp (UUID generation)
- pg_trgm (Full-text search)
- pgvector (Semantic search)
- pg_cron (Scheduled jobs)

## 🔐 Authentication

Supabase Auth with Row Level Security (RLS) policies:
- Email/password authentication
- Magic link support
- Multi-tenant isolation (organization-level)
- Role-based access control
- JWT custom claims for organization context

## 📊 Development Phases

### ✅ Completed Phases

- **Phase 0:** ✅ Initial Setup & Project Structure (COMPLETE)
- **Phase 1:** ✅ Core Platform - Auth, Products, Cart, Ordering (COMPLETE)
- **Phase 2:** ✅ B2B Essentials - Checkout, Order History, Notifications (COMPLETE - 42/42 tasks)
- **Phase 3:** ✅ Advanced Features - Bulk Orders, AI Imports, Pricing, Offline (COMPLETE - 16/16 tasks)
- **Phase 4:** ✅ Container Builder - 3D Visualization, Bin Packing (COMPLETE - 16/16 tasks)

**Total Completed:** 74 tasks, ~11,000+ lines of code

### 🚧 Upcoming Phases (5-16)

- **Phase 5:** Enhanced UX & Cart Experience (25 tasks, 2-3 weeks) - **NEXT**
- **Phase 6:** Advanced Ordering & Templates (30 tasks, 3-4 weeks)
- **Phase 7:** Promotional & Pricing Enhancements (18 tasks, 2 weeks)
- **Phase 8:** Organization & Member Management (22 tasks, 2-3 weeks)
- **Phase 9:** Marketing & Campaigns (28 tasks, 3-4 weeks)
- **Phase 10:** Enhanced Tracking & Documents (20 tasks, 2 weeks)
- **Phase 11:** Performance & Optimization (24 tasks, 2-3 weeks)
- **Phase 12:** Security & Compliance (20 tasks, 2-3 weeks)
- **Phase 13:** Platform Features (18 tasks, 2 weeks)
- **Phase 14:** Testing & Quality Assurance (35 tasks, 3-4 weeks)
- **Phase 15:** Deployment & Monitoring (22 tasks, 2-3 weeks)
- **Phase 16:** Analytics & Business Intelligence (20 tasks, 2 weeks)

**Total Remaining:** 282 tasks, 28-38 weeks

**For detailed phase information:** See [MASTER-DEPENDENCIES.md](./MASTER-DEPENDENCIES.md)

## 📚 Documentation

### Getting Started
- **[PROJECT-GUIDE.md](./PROJECT-GUIDE.md)** - Start here! Complete project overview and onboarding guide
- **[README.md](./README.md)** - This file - technical setup and quick reference
- **[MASTER-DEPENDENCIES.md](./MASTER-DEPENDENCIES.md)** - Phase dependencies and execution strategies

### Implementation Guides
- `b2b-master-guide.txt` - Overall project overview and Phase 0
- `b2b-phase1-guide.txt` - Phase 1 implementation details
- `b2b-phase2-guide.txt` - Phase 2 implementation details
- `b2b-phase3-guide.txt` - Phase 3 implementation details
- `b2b-phase4-guide.txt` - Phase 4 implementation details

### Completion Summaries
- `PHASE2-COMPLETION-SUMMARY.md` - Phase 2 complete (42/42 tasks)
- `PHASE3-COMPLETION-SUMMARY.md` - Phase 3 complete (16/16 tasks)
- `PHASE4-COMPLETION-SUMMARY.md` - Phase 4 complete (16/16 tasks)

### Future Phases
- `Phase 5 - Enhanced UX & Cart Experience/` - Next phase documentation
- `Phase 6-16/` - Future phase documentation
- `Manual Tasks - Master Folder/` - Centralized manual work tracking

## 🤝 Contributing

This is a private project. For questions or issues, contact the development team.

### Development Workflow
1. Read [PROJECT-GUIDE.md](./PROJECT-GUIDE.md) for project overview
2. Review phase documentation before starting work
3. Follow implementation prompts in phase folders
4. Write tests for all new features
5. Update completion summaries when done

## 📄 License

Proprietary - All rights reserved

---

**Project Started:** October 11, 2025  
**Current Phase:** Phase 5 (Enhanced UX & Cart Experience)  
**Supabase Project:** [project-ref]  
**Region:** us-east-1  
**Last Updated:** October 13, 2025

