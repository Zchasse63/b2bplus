You are a senior full-stack architect and technical lead conducting a comprehensive project audit. Your mission is to autonomously discover, analyze, and document everything in this codebase to create a complete picture of the project's current state and a clear roadmap to production.
CRITICAL INSTRUCTIONS:

Explore the ENTIRE codebase systematically - leave no directory unexamined
Document everything you find, even if it seems incomplete or broken
When you encounter unknowns, flag them for research rather than guessing
Be brutally honest about the state of things - this audit is about reality, not optimism
Generate actionable outputs that can go directly into sprint planning


PHASE 0: AUTONOMOUS DISCOVERY
Before any analysis, you must completely map the project. Spend adequate time here - thoroughness now prevents missed issues later.
0.1 Project Root Analysis
Execute these commands and document findings:
bash# Get complete project structure (excluding node_modules, .git, etc.)
find . -type f -name "*.json" -o -name "*.yaml" -o -name "*.yml" -o -name "*.toml" -o -name "*.env*" 2>/dev/null | head -100

# Find all configuration files
ls -la

# Check for monorepo structure
ls -la packages/ 2>/dev/null || ls -la apps/ 2>/dev/null || echo "Not a monorepo"

# Get package.json details
cat package.json 2>/dev/null

# Check for multiple package.jsons (monorepo indicator)
find . -name "package.json" -not -path "*/node_modules/*" 2>/dev/null
Document:
PROJECT IDENTITY
================
Project Name: [from package.json or folder name]
Repository Type: [monorepo/single-app/multi-service]
Primary Language: [TypeScript/JavaScript/Python/etc.]
Package Manager: [npm/yarn/pnpm/bun]
Node Version Required: [from .nvmrc, package.json engines, etc.]
0.2 Complete Tech Stack Discovery
Analyze package.json, requirements.txt, and imports to identify:
Frontend Framework & Libraries:
bash# Check for framework indicators
grep -l "react\|vue\|angular\|svelte\|solid" package.json 2>/dev/null
cat package.json | grep -A 50 '"dependencies"'
Document:

Framework: [React/Next.js/Vue/Nuxt/Angular/Svelte/etc.] + version
Meta-framework: [Next.js/Remix/Nuxt/SvelteKit/etc.] + version
Styling: [Tailwind/CSS Modules/Styled Components/Sass/etc.]
UI Component Library: [shadcn/ui/MUI/Chakra/Radix/etc.]
State Management: [Zustand/Redux/Jotai/Context/TanStack Query/etc.]
Form Handling: [React Hook Form/Formik/native/etc.]
Routing: [App Router/Pages Router/React Router/etc.]

Backend Framework & Libraries:

Runtime: [Node.js/Bun/Deno/Python] + version
Framework: [Express/Fastify/Hono/Next.js API/FastAPI/etc.]
API Style: [REST/GraphQL/tRPC/etc.]
Validation: [Zod/Yup/Joi/class-validator/etc.]

Database & Data Layer:
bash# Check for database packages
grep -E "prisma|drizzle|typeorm|sequelize|mongoose|@supabase|postgres|mysql|mongodb" package.json
Document:

Database: [PostgreSQL/MySQL/MongoDB/SQLite/etc.]
Database Provider: [Supabase/PlanetScale/Neon/Railway/self-hosted/etc.]
ORM/Query Builder: [Prisma/Drizzle/TypeORM/Supabase Client/etc.]
Migrations: [Prisma Migrate/Drizzle Kit/custom/etc.]

AI & ML Integrations:
bash# Check for AI SDK packages
grep -E "openai|anthropic|@ai-sdk|langchain|llamaindex|replicate|huggingface|cohere|groq|together" package.json
Document:

AI SDK: [Vercel AI SDK/LangChain/LlamaIndex/direct API/etc.]
AI Providers: [OpenAI/Anthropic/Groq/Together/Replicate/etc.]
Tool Calling Framework: [Vercel AI SDK tools/LangChain tools/custom/etc.]
Embedding Provider: [OpenAI/Cohere/local/etc.]
Vector Database: [Pinecone/Supabase pgvector/Weaviate/Chroma/etc.]

Authentication:
bashgrep -E "next-auth|@auth|clerk|supabase.*auth|passport|lucia|arctic" package.json
Document:

Auth Provider: [NextAuth/Clerk/Supabase Auth/Auth.js/Lucia/custom/etc.]
Auth Methods: [Email/Password, OAuth providers, Magic Links, etc.]

External Services & APIs:
bash# Find API keys in env files
cat .env.example 2>/dev/null || cat .env.local.example 2>/dev/null
grep -r "API_KEY\|SECRET\|TOKEN" --include=".env*" 2>/dev/null
Document ALL external integrations:

Payment: [Stripe/Lemon Squeezy/PayPal/etc.]
Email: [Resend/SendGrid/Postmark/AWS SES/etc.]
Storage: [AWS S3/Cloudflare R2/Supabase Storage/etc.]
Analytics: [PostHog/Mixpanel/Plausible/Vercel Analytics/etc.]
Monitoring: [Sentry/LogRocket/Datadog/etc.]
Other APIs: [list all third-party integrations]

Infrastructure & Deployment:
bash# Check for deployment configs
ls -la vercel.json netlify.toml fly.toml render.yaml railway.json Dockerfile docker-compose* 2>/dev/null
Document:

Hosting Platform: [Vercel/Netlify/Railway/Fly.io/AWS/etc.]
CI/CD: [GitHub Actions/GitLab CI/CircleCI/etc.]
Containerization: [Docker/none]
CDN: [Vercel Edge/Cloudflare/etc.]

0.3 Complete Directory Structure Mapping
Generate full tree:
bash# Comprehensive directory listing
find . -type d -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/.next/*" -not -path "*/dist/*" -not -path "*/.turbo/*" | head -200
Document the structure with annotations:
CODEBASE STRUCTURE
==================
/
├── src/                    # [Main source code]
│   ├── app/               # [Next.js App Router / Main app]
│   ├── components/        # [React components]
│   ├── lib/               # [Utilities and helpers]
│   ├── hooks/             # [Custom React hooks]
│   ├── types/             # [TypeScript types]
│   ├── services/          # [API/business logic services]
│   └── ...
├── prisma/                 # [Database schema and migrations]
├── supabase/              # [Supabase configurations]
├── public/                # [Static assets]
├── scripts/               # [Build/deploy/utility scripts]
├── docs/                  # [Documentation]
├── tests/                 # [Test files]
└── ...

[Add ALL directories you discover with brief annotations]
0.4 Document & File Inventory
Find ALL documentation and planning files:
bash# Find all markdown files
find . -name "*.md" -not -path "*/node_modules/*" 2>/dev/null

# Find planning/design documents
find . -type f \( -name "*.md" -o -name "*.txt" -o -name "*.pdf" -o -name "*.doc*" \) -not -path "*/node_modules/*" 2>/dev/null

# Find TODO files
find . -name "TODO*" -o -name "ROADMAP*" -o -name "PLANNING*" -o -name "NOTES*" 2>/dev/null
Categorize ALL documents found:
File PathTypeLast ModifiedStatusAction Recommended/README.mdDocumentation[date][Current/Outdated/Stale][Keep/Update/Archive/Delete]/docs/api.mdAPI Docs[date][Current/Outdated/Stale][Keep/Update/Archive/Delete]...............
Status Definitions:

Current: Accurately reflects the codebase
Outdated: Contains correct concepts but needs updates
Stale: No longer relevant to current architecture
Unknown: Cannot determine relevance without more context

0.5 Environment & Configuration Inventory
Find and document ALL configuration:
bash# All env files
find . -name ".env*" -not -path "*/node_modules/*" 2>/dev/null

# All config files
find . -name "*.config.*" -o -name "tsconfig*" -o -name "tailwind*" -not -path "*/node_modules/*" 2>/dev/null
Create Environment Variable Matrix:
Variable NameUsed InRequiredHas DefaultDocumentedStatusDATABASE_URLBackendYesNoYes✅OPENAI_API_KEYAI ServiceYesNoNo⚠️..................

PHASE 1: COMPREHENSIVE AUDIT
Now conduct deep analysis of everything discovered.
1.1 Database & Data Layer Audit
Schema Analysis:
bash# If using Prisma
cat prisma/schema.prisma 2>/dev/null

# If using Drizzle
find . -name "schema.ts" -path "*/drizzle/*" -exec cat {} \; 2>/dev/null

# If using Supabase, check for migration files
ls -la supabase/migrations/ 2>/dev/null
Document for EACH table/model:
Table NameFields CountRelationshipsIndexesRLS EnabledLast MigrationIssuesusers12profiles (1:1)email, idYes2024-01-15None.....................
Data Integrity Checks:

 All foreign keys have corresponding relationships defined
 Indexes exist for frequently queried columns
 Enum types are properly defined
 Default values are sensible
 Timestamps (created_at, updated_at) exist where needed
 Soft delete vs hard delete strategy is consistent
 RLS policies are in place (if using Supabase)

Supabase-Specific Audit (if applicable):

 RLS policies exist for all tables
 RLS policies are tested and working
 Storage buckets have proper policies
 Edge Functions are documented
 Database webhooks are configured correctly
 Realtime subscriptions are optimized
 Connection pooling is configured (Supavisor)

Issues Found:
[List all database/data layer issues with severity]
1.2 API & Routing Audit
Discover ALL API Routes:
bash# Next.js App Router API routes
find . -path "*/app/api/*" -name "route.ts" -o -path "*/app/api/*" -name "route.js" 2>/dev/null

# Next.js Pages Router API routes
find . -path "*/pages/api/*" -name "*.ts" -o -path "*/pages/api/*" -name "*.js" 2>/dev/null

# Express/Fastify routes
grep -r "app.get\|app.post\|app.put\|app.delete\|router.get\|router.post" --include="*.ts" --include="*.js" 2>/dev/null | head -50
Document EACH endpoint:
EndpointMethodAuth RequiredValidationRate LimitedTestedStatus/api/usersGETYes (JWT)ZodNoNo⚠️/api/auth/loginPOSTNoZodYesYes✅.....................
API Completeness Checklist:

 All endpoints have input validation
 All endpoints have proper error handling
 All endpoints return consistent response shapes
 Authentication is applied where needed
 Authorization checks exist for protected resources
 Rate limiting is applied to sensitive endpoints
 CORS is properly configured
 API versioning strategy exists (if needed)

Issues Found:
[List all API/routing issues with severity]
1.3 AI Tooling & SDK Audit
This section is CRITICAL - thoroughly analyze ALL AI integrations.
Discover AI Implementation:
bash# Find all AI-related files
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -not -path "*/node_modules/*" -exec grep -l "openai\|anthropic\|ai-sdk\|generateText\|streamText\|useChat\|useCompletion\|tools:" {} \; 2>/dev/null

# Find tool definitions
grep -r "tools:\|tool\(" --include="*.ts" --include="*.tsx" -A 5 2>/dev/null | head -100
AI Provider Configuration:
ProviderSDK VersionAPI Key Env VarConfiguredTestedStatusOpenAI4.xOPENAI_API_KEYYesYes✅Anthropic0.xANTHROPIC_API_KEYYesNo⚠️Groq0.xGROQ_API_KEYYesYes✅..................
AI SDK Usage Analysis:
FeatureImplementation LocationSDK Method UsedStreamingError HandlingStatusChat Interface/app/chat/page.tsxuseChat()YesBasic⚠️Tool Calling/lib/ai/tools.tsgenerateText()NoComprehensive✅..................
Tool Calling Audit:
For EACH tool defined:
Tool NameDescriptionParametersValidationExecute FunctionError HandlingTestedStatussearchDatabaseSearches user dataquery: stringZodYesTry/catchNo⚠️........................
AI Integration Checklist:

 All AI API keys are in environment variables (not hardcoded)
 Fallback providers configured for reliability
 Rate limiting implemented for AI endpoints
 Token usage tracking in place
 Cost monitoring/alerts configured
 Streaming properly implemented where used
 Error messages are user-friendly (not raw API errors)
 Timeout handling for long-running generations
 Tool calling has proper validation
 Tool execution errors are handled gracefully
 AI responses are sanitized before display
 Prompt injection protections in place

Research Required:
[List any AI SDK features, patterns, or configurations you need to research]
Issues Found:
[List all AI tooling issues with severity]
1.4 Security Audit
Authentication Flow Analysis:
bash# Find auth-related files
find . -type f \( -name "*auth*" -o -name "*login*" -o -name "*session*" \) -not -path "*/node_modules/*" 2>/dev/null
Document the auth flow:
AUTHENTICATION FLOW
===================
1. User submits credentials at: [location]
2. Credentials validated by: [method/service]
3. Session/token created: [type - JWT/session/etc.]
4. Token stored: [location - cookie/localStorage/etc.]
5. Token attached to requests via: [method]
6. Token validated on backend by: [middleware/method]
7. Session expires after: [duration]
8. Refresh mechanism: [yes/no, method]
Security Checklist:
Authentication:

 Password hashing uses modern algorithm (bcrypt/argon2)
 Password requirements enforced (length, complexity)
 Rate limiting on login attempts
 Account lockout after failed attempts
 Secure session management
 CSRF protection enabled
 Secure cookie settings (httpOnly, secure, sameSite)

Authorization:

 Role-based access control implemented
 Resource-level permissions checked
 API routes verify authorization
 Frontend routes protected
 No privilege escalation vulnerabilities

Data Protection:

 Sensitive data encrypted at rest
 HTTPS enforced everywhere
 PII handling compliant with regulations
 Input sanitization on all user inputs
 SQL injection prevention (parameterized queries)
 XSS prevention (output encoding)
 File upload validation and sanitization

Infrastructure:

 Security headers configured (CSP, HSTS, etc.)
 Dependencies scanned for vulnerabilities
 Secrets management secure (not in code)
 Error messages don't leak sensitive info
 Logging doesn't include sensitive data

Issues Found:
[List all security issues with severity - CRITICAL issues first]
1.5 UI/UX Completeness Audit
Component Inventory:
bash# Find all components
find . -path "*/components/*" -name "*.tsx" -o -path "*/components/*" -name "*.jsx" 2>/dev/null | wc -l

# List component directories
ls -la src/components/ 2>/dev/null || ls -la components/ 2>/dev/null
UI Completeness Matrix:
Feature AreaComponents ExistStyledResponsiveAccessibleLoading StatesError StatesStatusAuthenticationYesYesYesPartialYesNo⚠️DashboardYesYesPartialNoNoNo⚠️SettingsPartialNoNoNoNoNo❌........................
UX Flow Analysis:
For each major user flow:
FLOW: [Flow Name]
================
1. Entry Point: [where user starts]
2. Steps: [list each step]
3. Success State: [what happens on success]
4. Error States: [what happens on errors]
5. Edge Cases: [what about empty states, loading, etc.]
6. Missing: [what's not implemented]
UI/UX Checklist:

 Consistent design language throughout
 Loading states for all async operations
 Error states with helpful messages
 Empty states for lists/data
 Form validation with inline feedback
 Responsive design (mobile, tablet, desktop)
 Keyboard navigation support
 Screen reader compatibility
 Color contrast meets WCAG standards
 Focus indicators visible
 Touch targets adequate size (mobile)
 Animations respect reduced motion preference

Issues Found:
[List all UI/UX issues with severity]
1.6 Code Quality & Architecture Audit
Code Organization Analysis:

 Clear separation of concerns
 Consistent file naming conventions
 Logical folder structure
 No circular dependencies
 Shared code properly abstracted
 Types/interfaces well-organized

Code Quality Checks:
bash# Check for TypeScript strict mode
grep "strict" tsconfig.json

# Check for linting configuration
cat .eslintrc* 2>/dev/null || cat eslint.config.* 2>/dev/null

# Check for formatting configuration
cat .prettierrc* 2>/dev/null || cat prettier.config.* 2>/dev/null
Technical Debt Inventory:
LocationIssueTypeEffort to FixPriority/src/lib/utils.tsDuplicated validation logicDuplication2hMedium/src/components/Form.tsxAny types usedType Safety4hHigh...............
TODO/FIXME/HACK Inventory:
bash# Find all TODO comments
grep -r "TODO\|FIXME\|HACK\|XXX" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" 2>/dev/null
LocationCommentAgeStill RelevantAction/src/api/users.ts:45TODO: Add paginationUnknownYesImplement...............
1.7 Testing Coverage Audit
Discover Test Files:
bash# Find all test files
find . -name "*.test.*" -o -name "*.spec.*" -o -name "__tests__" -not -path "*/node_modules/*" 2>/dev/null

# Check test configuration
cat jest.config.* vitest.config.* playwright.config.* 2>/dev/null
Testing Coverage Matrix:
AreaUnit TestsIntegration TestsE2E TestsCoverage %StatusAuthYesPartialNo45%⚠️API RoutesPartialNoNo20%❌ComponentsYesN/ANo60%⚠️AI ToolsNoNoNo0%❌..................
Critical Paths Without Tests:
[List critical user flows that have no test coverage]
1.8 Performance Audit
Performance Checklist:

 Images optimized (next/image, compression)
 Code splitting implemented
 Lazy loading for heavy components
 Database queries optimized (no N+1)
 Caching strategy in place
 Bundle size reasonable
 Core Web Vitals passing

Performance Concerns Found:
[List performance issues with impact assessment]
1.9 Deployment & DevOps Audit
Current Deployment Setup:
bash# Check deployment configs
cat vercel.json 2>/dev/null
cat netlify.toml 2>/dev/null
cat .github/workflows/*.yml 2>/dev/null
Deployment Checklist:

 Build process documented
 Environment variables documented
 CI/CD pipeline configured
 Preview deployments working
 Production deployment tested
 Rollback procedure documented
 Database migrations automated
 Health checks configured
 Error monitoring configured
 Log aggregation configured

Missing for Production:
[List what's needed before production deployment]

PHASE 2: SYNTHESIS & ROADMAP
2.1 Executive Summary
Project Health Score: [X/10]
Provide scores for each area:

Database & Data Layer: [X/10]
API & Routing: [X/10]
AI Tooling: [X/10]
Security: [X/10]
UI/UX: [X/10]
Code Quality: [X/10]
Testing: [X/10]
Performance: [X/10]
DevOps: [X/10]

Current State Summary:
[2-3 paragraph summary of project's current state]
2.2 Complete Issues Registry
Compile ALL issues found into a single prioritized list:
CRITICAL (Blocks Production)
#AreaIssueLocationEffortDependencies1SecurityNo rate limiting on auth/api/auth/*4hNone..................
HIGH (Should Fix Before Production)
#AreaIssueLocationEffortDependencies..................
MEDIUM (Production OK, Fix Soon After)
#AreaIssueLocationEffortDependencies..................
LOW (Nice to Have)
#AreaIssueLocationEffortDependencies..................
2.3 Document Cleanup Plan
FileActionReasonEffort/docs/old-api-spec.mdDELETERefers to deprecated v1 API5min/PLANNING.mdARCHIVEHistorical planning, may be useful reference5min/README.mdUPDATEMissing setup instructions1h............
2.4 Research Tasks
Topics requiring investigation before implementation:
TopicWhy NeededResources to CheckAssigned ToDueVercel AI SDK streaming with toolsCurrent implementation may be outdatedAI SDK docs, GitHub issues[TBD][TBD]Supabase RLS best practicesNeed to validate current policiesSupabase docs[TBD][TBD]...............
2.5 Production Readiness Checklist
Must Have:

 All CRITICAL issues resolved
 All HIGH issues resolved
 Security audit passed
 Authentication flow tested
 Payment flow tested (if applicable)
 Error monitoring configured
 Backup strategy in place
 Environment variables documented
 Deployment process documented

Should Have:

 MEDIUM issues resolved
 60%+ test coverage on critical paths
 Performance benchmarks met
 Documentation complete
 Runbook for common issues

Nice to Have:

 LOW issues resolved
 80%+ test coverage
 Automated performance testing
 Chaos engineering tests

2.6 Implementation Roadmap
Wave 1: Critical Fixes (Week 1)
[List specific tasks with effort estimates]
Wave 2: High Priority (Week 2-3)
[List specific tasks with effort estimates]
Wave 3: Production Prep (Week 4)
[List specific tasks with effort estimates]
Wave 4: Post-Launch (Week 5+)
[List specific tasks with effort estimates]
2.7 Maintenance Recommendations
Daily:

Monitor error rates
Check AI API usage

Weekly:

Review security alerts
Check dependency updates
Review performance metrics

Monthly:

Run full security scan
Update dependencies
Review and clean up logs


DELIVERABLE FILES
Create the following files in the project:

AUDIT_SUMMARY.md - Executive summary and health scores
ISSUES_REGISTRY.md - Complete prioritized issues list
PRODUCTION_CHECKLIST.md - Checklist for production readiness
CLEANUP_PLAN.md - Document cleanup recommendations
IMPLEMENTATION_ROADMAP.md - Sprint-ready task breakdown