# Developer Onboarding Guide

Welcome to B2B Plus! This guide will help you get up and running quickly.

## Prerequisites

- Node.js 18+ and npm/pnpm
- Git
- Docker (optional, for local Supabase)
- VS Code (recommended)

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Zchasse63/b2bplus.git
cd b2bplus
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Fill in the required variables:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (for server-side operations)
- `GEMINI_API_KEY`: Your Google Gemini API key
- `SENDGRID_API_KEY`: Your SendGrid API key
- `STRIPE_SECRET_KEY`: Your Stripe secret key

### 4. Set Up Local Database

```bash
# Start Supabase locally
supabase start

# Run migrations
supabase migration up
```

### 5. Start Development Server

```bash
# Web app
cd apps/web
pnpm dev

# Mobile app
cd apps/mobile
pnpm start
```

## Project Structure

```
b2b-plus/
├── apps/
│   ├── web/                 # Next.js web application
│   │   ├── app/            # App Router pages and routes
│   │   ├── components/     # React components
│   │   ├── lib/            # Utilities and helpers
│   │   └── __tests__/      # Tests
│   └── mobile/             # React Native mobile app
├── packages/
│   ├── supabase/           # Supabase client and types
│   └── shared/             # Shared utilities
├── supabase/
│   ├── migrations/         # Database migrations
│   └── functions/          # Edge functions
└── docs/                   # Documentation
```

## Architecture Overview

### Frontend (Next.js)
- **App Router**: File-based routing in `app/` directory
- **Components**: Reusable React components in `components/`
- **Styling**: Tailwind CSS for styling
- **State Management**: React hooks and context API

### Backend (Supabase)
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth with JWT
- **Storage**: Supabase Storage for files
- **Edge Functions**: Serverless functions for custom logic

### Mobile (React Native)
- **Expo**: Managed React Native framework
- **Navigation**: React Navigation for routing
- **State**: Redux for state management

## Key Technologies

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS
- **Testing**: Jest, Playwright
- **AI**: Google Gemini API
- **Email**: SendGrid
- **Payments**: Stripe
- **Monitoring**: Sentry

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes

- Follow the coding standards (see below)
- Write tests for new functionality
- Update documentation as needed

### 3. Run Tests

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Type checking
pnpm type-check

# Linting
pnpm lint
```

### 4. Commit Changes

```bash
git add .
git commit -m "feat: description of changes"
```

Follow conventional commits:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation
- `test:` for tests
- `refactor:` for refactoring
- `chore:` for maintenance

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Create a pull request on GitHub with a clear description.

## Coding Standards

### TypeScript
- Use strict mode
- Avoid `any` types
- Use interfaces for object shapes
- Add JSDoc comments for public functions

### React Components
- Use functional components with hooks
- Keep components small and focused
- Use TypeScript for props
- Add proper error boundaries

### Database
- Use parameterized queries
- Implement Row Level Security (RLS)
- Add indexes for frequently queried columns
- Write migrations for schema changes

### Testing
- Write unit tests for utilities
- Write integration tests for API routes
- Write E2E tests for critical user flows
- Aim for 80%+ code coverage

## Common Tasks

### Add a New API Route

1. Create file: `apps/web/app/api/your-route/route.ts`
2. Implement GET/POST/PUT/DELETE handlers
3. Add authentication if needed
4. Add input validation with Zod
5. Write tests in `__tests__/api/`

### Add a New Database Table

1. Create migration: `supabase migration new add_your_table`
2. Write SQL in migration file
3. Add RLS policies
4. Update TypeScript types in `packages/supabase/`
5. Run migration: `supabase migration up`

### Add a New Component

1. Create file: `apps/web/components/your-component.tsx`
2. Use TypeScript for props
3. Add Storybook story if complex
4. Write tests if interactive
5. Update component index if needed

## Debugging

### Browser DevTools
- Use Chrome DevTools for frontend debugging
- Check Network tab for API calls
- Use Console for errors

### VS Code Debugging
- Install Debugger for Chrome extension
- Set breakpoints in code
- Use Debug Console for inspection

### Database Debugging
- Use Supabase Studio to inspect data
- Check RLS policies in Supabase
- Review database logs

## Performance Tips

- Use React.memo for expensive components
- Implement pagination for large lists
- Cache API responses with Redis
- Use database indexes
- Monitor with Sentry

## Security Best Practices

- Never commit secrets to git
- Use environment variables for sensitive data
- Validate all user inputs
- Implement proper authentication
- Use HTTPS in production
- Keep dependencies updated

## Getting Help

- **Documentation**: Check `/docs` directory
- **Code Examples**: Look at existing implementations
- **Team**: Ask in Slack or team chat
- **Issues**: Check GitHub issues for known problems

## Useful Commands

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Run tests
pnpm test

# Run linting
pnpm lint

# Type checking
pnpm type-check

# Build for production
pnpm build

# Format code
pnpm format

# Database migrations
supabase migration new <name>
supabase migration up
supabase migration down
```

## Next Steps

1. Read the [Architecture Documentation](./architecture.md)
2. Review [API Documentation](../api/api-documentation.md)
3. Check out existing code examples
4. Pick a task from the issue tracker
5. Ask questions in team chat

Welcome aboard! 🚀

