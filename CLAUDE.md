# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server on http://localhost:3000
npm run build        # Production build
npm run lint         # ESLint

npx vitest run                                    # Run all tests
npx vitest run lib/__tests__/progression.test.ts  # Run a single test file
npx vitest                                        # Watch mode

npx drizzle-kit generate   # Generate SQL migrations from schema changes
npx drizzle-kit push       # Push schema to Neon (requires DATABASE_URL)
```

> **Node.js path note (Windows):** Node is at `C:\Program Files\nodejs`. If `npx` is not found in a shell session, prepend: `$env:PATH = "C:\Program Files\nodejs;$env:PATH"` in PowerShell.

After schema changes, always run `drizzle-kit generate` then `drizzle-kit push`. Migration SQL lands in `drizzle/migrations/`.

To seed the exercise library into the database, run the dev server and call:
```bash
curl -X POST http://localhost:3000/api/seed
```
This is blocked in production (`NODE_ENV === 'production'` guard).

## Environment Variables

Required in `.env.local`:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string |
| `AUTH_SECRET` | NextAuth session signing key (`openssl rand -base64 32`) |
| `AUTH_RESEND_KEY` | Resend API key for magic link emails |
| `NEXTAUTH_URL` | App base URL (default: `http://localhost:3000`) |

## Architecture

### Request flow

Unauthenticated requests to `/(app)/*` routes are intercepted by `app/(app)/layout.tsx`, which calls `auth()` from `lib/auth.ts` and redirects to `/login`. Every API route independently calls `auth()` and returns 401 if the session is missing — there is no middleware file.

### Authentication

`lib/auth.ts` configures NextAuth v5 with:
- **Resend** magic-link email provider (custom `sendVerificationRequest` using the Resend SDK)
- **DrizzleAdapter** mapping to the custom table names in `lib/schema.ts` (the NextAuth tables use short names: `user`, `account`, `session`, `verificationToken`)
- **Database sessions** (`strategy: 'database'`) — sessions live in Neon, not JWTs
- Session callback injects `user.id` into the session object; all API routes read `session.user.id` to scope queries

### Database

`lib/db.ts` — single Drizzle + Neon serverless client exported as `db`. All queries go through this instance.

`lib/schema.ts` — all table definitions plus Drizzle relations. Two logical groups:
- **Auth tables** (`user`, `account`, `session`, `verificationToken`) — required by `@auth/drizzle-adapter`, names must match exactly
- **App tables** (`exercise`, `exercise_level`, `user_exercise_plan`, `session_log`, `exercise_log`) — one `session_log` per user per day, one `exercise_log` per exercise per session

Relations defined at the bottom of `lib/schema.ts` enable Drizzle `with:` joins (e.g. `with: { exercise: true }` on `userExercisePlan` queries).

### Exercise data

`lib/seed-exercises.ts` — static TypeScript arrays (`EXERCISES`, `EXERCISE_LEVELS`). These are the source of truth for exercise content and are imported directly by the exercise player and library UI — no DB query needed for browsing. The seed API route writes them to the database so the plan engine can reference them.

Each exercise has 5 levels. `durationSeconds` is set for static/strength exercises; `reps` is set for dynamic balance exercises (never both).

### Progression engine

`lib/progression.ts` — pure functions, no DB access:
- `computeNextLevel(currentLevel, recentHistory)` — advances after 3 consecutive completions, regresses after 3 consecutive misses or any `too_hard` rating, clamped 1–5
- `buildDefaultPlan(exerciseIds, currentLevels?)` — builds up to 4 exercises at their current levels

This is the **fallback** engine. Plan 2 will replace the primary driver with an AI coach (Gemini 2.5 Flash with tool-calling).

### API routes

| Route | Method | Purpose |
|---|---|---|
| `/api/plan` | GET | Today's plan + streak. Auto-seeds plan if none exists for today. |
| `/api/logs` | POST | Log a completed exercise. Creates `session_log` if none exists for today. |
| `/api/logs` | PATCH | Mark session fully complete (`completedAt`). Scoped to `userId` to prevent cross-user writes. |
| `/api/progress` | GET | Last 30 days of completed dates + today's exercise levels + streak. |
| `/api/seed` | POST | Seed exercise library (dev only). |

### UI structure

```
app/(auth)/         — Login + verify pages (no auth guard, no bottom nav)
app/(app)/          — All authenticated screens (auth guard in layout.tsx)
  page.tsx          — Home: fetches /api/plan, shows daily exercises
  exercises/page.tsx       — Library: grouped by category, reads from seed-exercises.ts directly
  exercises/[id]/page.tsx  — Player: Lottie animation + SVG countdown timer + rating
  progress/page.tsx         — Week grid + level bars, fetches /api/progress
  coach/page.tsx            — Placeholder (AI coach coming in Plan 2)
```

`components/BottomNav.tsx` — fixed bottom nav with 4 items. Uses `usePathname()` for active state, `aria-current="page"` on active link.

Lottie animation files live in `public/animations/exercises/<exercise-id>.json`. The player falls back to an emoji if the JSON fetch fails.

### Design system

Tailwind CSS v3 with CSS custom properties (not Tailwind v4). All colours and fonts are defined as CSS variables in `app/globals.css` and mapped in `tailwind.config.ts`. Use the semantic Tailwind classes (`bg-primary`, `text-dark`, `font-heading`, etc.) rather than raw hex values.

Key tokens: `--primary: #C4714A` (terracotta), `--secondary: #5B8A6E` (sage green), `--dark: #2C1810`, `--bg: #F5F0E8` (warm cream). Fonts: **Fraunces** (`font-heading`) for headings, **DM Sans** (`font-body`) for body. Minimum body text 20px; minimum tap targets 56×56px.

## Plan 2 (not yet built)

The design spec and implementation plan for Plan 2 are in `docs/superpowers/`. Plan 2 adds:
- AI coach (Gemini 2.5 Flash via Vercel AI SDK) with tool-calling to curate exercise plans
- Coach Mei animated persona (4 Lottie states: idle, thinking, speaking, celebrating)
- Post-session check-in flow
- Email reminders (Resend) + Web Push notifications
- Onboarding flow
- PWA manifest
