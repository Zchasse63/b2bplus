# B2B+ Platform

Food service disposables ordering platform with container optimization.

## 🎯 Project Overview

B2B+ is a comprehensive B2B e-commerce solution targeting the food service industry with a unique container optimization feature. The platform enables businesses to order disposables efficiently while optimizing container loading through 3D visualization and bin packing algorithms.

**Target Market:** 80% mobile orders in B2B food service industry  
**Timeline:** 3-4 months to MVP  
**Monthly Costs:** $111-161

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
- **Excel Mapping:** OpenAI GPT-4o-mini

### 3D & Optimization
- **3D Visualization:** React Three Fiber (R3F), Three.js
- **Bin Packing:** binpackingjs

### Mobile Features
- **Offline:** WatermelonDB
- **Notifications:** Expo Notifications, Twilio (SMS), Resend (email)

## 📋 Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Expo CLI (for mobile development)
- Supabase CLI (optional, for local development)

## 🛠️ Getting Started

### 1. Clone and Install

```bash
cd ~/Projects/b2b-plus
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
# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=https://ksprdklquoskvjqsicvv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Mobile (Expo)
EXPO_PUBLIC_SUPABASE_URL=https://ksprdklquoskvjqsicvv.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
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
- `products` - Product catalog with search vectors
- `orders` - Order management
- `cart_items` - Shopping cart
- `shipping_addresses` - Delivery addresses
- `pricing_tiers` - Dynamic pricing system
- `container_types` - Container optimization

## 🔐 Authentication

Supabase Auth with Row Level Security (RLS) policies:
- Email/password authentication
- Magic link support
- Multi-tenant isolation
- Role-based access control

## 📊 Development Phases

- **Phase 0:** ✅ Initial Setup & Project Structure (COMPLETE)
- **Phase 1:** Core Platform (Auth, Products, Cart, Ordering)
- **Phase 2:** B2B Essentials (Checkout, Order History, Notifications)
- **Phase 3:** Advanced Features (Bulk Orders, AI Imports, Pricing, Offline)
- **Phase 4:** Container Builder (3D Visualization, Bin Packing)
- **Phase 5:** Testing & Deployment

## 🤝 Contributing

This is a private project. For questions or issues, contact the development team.

## 📄 License

Proprietary - All rights reserved

---

**Project Started:** October 11, 2025  
**Supabase Project:** ksprdklquoskvjqsicvv  
**Region:** us-east-1

