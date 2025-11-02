# B2B+ Current Tech Stack Analysis

## Frontend Framework
- **Next.js 14.2.33** - React framework with App Router
- **React 18.3.1** - Latest React version
- **TypeScript 5** - Type-safe development

## UI Component Library
- **shadcn/ui** (implicit - via Radix UI + Tailwind)
- **Radix UI** - Headless UI components (18 components installed):
  - Accordion, Alert Dialog, Avatar, Checkbox, Dialog
  - Dropdown Menu, Label, Navigation Menu, Popover
  - Select, Separator, Slider, Slot, Switch
  - Tabs, Toast
- **Lucide React** - Icon library (0.344.0)

## Styling
- **Tailwind CSS 3.4.1** - Utility-first CSS framework
- **tailwind-merge** - Merge Tailwind classes
- **tailwindcss-animate** - Animation utilities
- **class-variance-authority** - Component variants
- **clsx** - Conditional class names
- **@tailwindcss/forms** - Form styling

## Backend & Data
- **Supabase** - Backend-as-a-service
  - @supabase/supabase-js 2.39.0
  - @supabase/ssr 0.1.0
- **Custom packages:**
  - @b2b-plus/shared
  - @b2b-plus/supabase
  - @b2b-plus/ui

## Additional Features
- **react-dropzone 14.2.3** - File upload
- **Resend 4.0.0** - Email service
- **OpenAI 4.67.3** - AI integration

## Testing
- Jest + React Testing Library
- TypeScript support

## Key Characteristics
1. **Modern stack** - Latest versions of all major libraries
2. **Type-safe** - Full TypeScript implementation
3. **Headless UI** - Radix UI provides unstyled, accessible components
4. **Tailwind-based** - All styling via Tailwind CSS
5. **Monorepo structure** - Custom packages for shared code
6. **AI-powered** - OpenAI integration for smart features
7. **Email ready** - Resend integration

## shadcn/ui Architecture
shadcn/ui is NOT a component library you install. Instead:
- It's a collection of **copy-paste components**
- Built on **Radix UI** (headless, accessible)
- Styled with **Tailwind CSS**
- Customizable at the source level
- No npm package dependency (except Radix UI)

This is why we see Radix UI packages but no "shadcn" package.
