# IELTS Flow

Foundation for a Vietnamese IELTS self-study web app. Phase 1 currently focuses on the Next.js app shell, design system, quality gates, Supabase client foundation, env validation, shared UI states, and health checks.

## Stack

- Next.js App Router 16, React 19, TypeScript strict
- Tailwind CSS 4 with shadcn-compatible tokens
- Supabase SSR/client helpers
- Vitest, Testing Library, Playwright
- ESLint, Prettier, npm lockfile

## Setup

```powershell
npm ci
Copy-Item .env.example .env.local
npm.cmd run dev
```

Set these values before connecting real Supabase flows:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Scripts

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
npm.cmd run test:e2e
```

## Current Scope

Implemented in this foundation slice:

- Public landing route plus auth placeholders
- Dashboard shell routes for overview, learn, roadmap, progress, profile, and settings
- Responsive navigation with mobile dialog
- Shared loading, empty, error, and not-found states
- Supabase client/server helpers without service-role exposure
- Runtime public env validation
- Normalized health API envelopes at `/api/health/live` and `/api/health/ready`

Not implemented yet:

- Real auth flows, profile persistence, Supabase migrations, RLS tests
- Onboarding, practice, scoring, AI, content admin, analytics
- Production observability and feature flag rollout service

## Project Structure

```text
src/app                 App Router routes and API endpoints
src/components          Shared layout, UI, and state components
src/lib                 Env, API envelope, Supabase, utility code
tests/e2e              Playwright smoke and responsive tests
docs                   Product, architecture, schema, API, task, security docs
```
