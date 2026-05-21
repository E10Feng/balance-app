# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working on This Codebase

Before making any complex changes (new features, architectural decisions, refactors spanning multiple files), always invoke the brainstorming skill first:

```
/brainstorm
```

This applies to Claude Code agents and subagents alike. Brainstorm before planning, plan before implementing.

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
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini API key for AI coach |
| `VAPID_PUBLIC_KEY` | Web Push VAPID public key (`npx web-push generate-vapid-keys`) |
| `VAPID_PRIVATE_KEY` | Web Push VAPID private key |
| `VAPID_EMAIL` | Contact email for VAPID (`mailto:you@example.com`) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Same as `VAPID_PUBLIC_KEY` (exposed to client) |
| `CRON_SECRET` | Bearer token for `/api/reminders/send` (`openssl rand -hex 32`) |

## Architecture

### Request flow

Unauthenticated requests to `/(app)/*` routes are intercepted by `app/(app)/layout.tsx`, which calls `auth()` from `lib/auth.ts` and redirects to `/login`. Every API route independently calls `auth()` and returns 401 if the session is missing — there is no middleware file.

New users with no `name` set are detected by `GET /api/plan` returning `{ error: 'needs_onboarding' }`, which triggers a client-side redirect to `/onboarding` from the home page.

### Authentication

`lib/auth.ts` configures NextAuth v5 with:
- **Resend** magic-link email provider
- **DrizzleAdapter** mapping to the custom table names in `lib/schema.ts` (the NextAuth tables use short names: `user`, `account`, `session`, `verificationToken`)
- **Database sessions** (`strategy: 'database'`) — sessions live in Neon, not JWTs
- Session callback injects `user.id` into the session object; all API routes read `session.user.id` to scope queries

### Database

`lib/db.ts` — single Drizzle + Neon serverless client exported as `db`. All queries go through this instance.

`lib/schema.ts` — all table definitions plus Drizzle relations. Two logical groups:
- **Auth tables** (`user`, `account`, `session`, `verificationToken`) — required by `@auth/drizzle-adapter`, names must match exactly
- **App tables** (`exercise`, `exercise_level`, `user_exercise_plan`, `session_log`, `exercise_log`, `push_subscription`) — one `session_log` per user per day, one `exercise_log` per exercise per session

The `users` table has two Plan 2 columns: `name` (text, nullable) and `reminder_time` (text, nullable, e.g. `"09:00"`).

Relations defined at the bottom of `lib/schema.ts` enable Drizzle `with:` joins (e.g. `with: { exercise: true }` on `userExercisePlan` queries).

### Exercise data

`lib/seed-exercises.ts` — static TypeScript arrays (`EXERCISES`, `EXERCISE_LEVELS`). These are the source of truth for exercise content and are imported directly by the exercise player and library UI — no DB query needed for browsing. The seed API route writes them to the database so the plan engine can reference them.

Each exercise has 5 levels. `durationSeconds` is set for static/strength exercises; `reps` is set for dynamic balance exercises (never both).

### Progression engine

`lib/progression.ts` — pure functions, no DB access:
- `computeNextLevel(currentLevel, recentHistory)` — advances after 3 consecutive completions, regresses after 3 consecutive misses or any `too_hard` rating, clamped 1–5
- `buildDefaultPlan(exerciseIds, currentLevels?)` — builds up to 4 exercises at their current levels

This is the **fallback** engine used to seed today's plan when no plan exists. The AI coach (Gemini) drives future plan updates after each session check-in.

### AI Coach

`lib/coach/` contains three modules:

- **`guardrails.ts`** — `containsPainKeywords(text)` checks the last user message against 18 symptom terms (pain, hurt, dizzy, sore, chest, etc.) before hitting Gemini. `PAIN_RESPONSE` is the safety message returned verbatim. `validatePlanUpdate(proposed, currentLevels)` enforces max +1 level advance per day and clamps levels 1–5.
- **`system-prompt.ts`** — `buildSystemPrompt({ userName, todayPlan, recentSummary })` builds the Gemini system prompt. Rules: 3-sentence responses, 4-exercise max, level cap, pain → stop and consult doctor, confirm plan changes.
- **`tools.ts`** — `makeCoachTools(userId, todayDate)` returns three AI SDK v6 tools: `get_user_history` (last N days of session logs), `get_exercise_library` (exercises by category), `update_exercise_plan` (writes tomorrow's plan, server-side validated).

**AI SDK v6 notes:** Tools use `inputSchema` (not `parameters`). `streamText` uses `stopWhen: stepCountIs(5)` (not `maxSteps`). Messages from `useChat` arrive as `UIMessage[]` and must be converted with `convertToModelMessages()` before passing to `streamText`. The pain guardrail must return a streaming response (not plain JSON) because `DefaultChatTransport` on the client expects SSE format.

### Push Notifications

`lib/push.ts` — configures `web-push` with VAPID keys at module load (throws a clear error if env vars are missing). Exports `sendPushNotification(subscription, payload)` which wraps `webpush.sendNotification` and re-throws with a `statusCode` property so callers can detect 410/404 and clean up stale subscriptions.

`app/api/push/subscribe/route.ts` — POST, upserts a subscription row keyed on `endpoint`.
`app/api/push/unsubscribe/route.ts` — DELETE, scoped to `(userId, endpoint)`.

### Reminders

`lib/reminders.ts` — `sendEmailReminder(to, name)` sends HTML email via Resend. `sendPushReminder(subscription, name)` sends a web push; catches 410/404 and deletes stale subscription rows from the DB.

`app/api/reminders/send/route.ts` — POST, secured with `Authorization: Bearer <CRON_SECRET>` using `timingSafeEqual` (timing-safe comparison). Queries users whose `reminder_time` matches the current UTC `HH:MM`, sends email + push to each. Call this via a cron job (e.g. Vercel Cron) every minute.

> **Note:** Reminder times are matched against UTC server clock. Users should set reminder times in UTC until timezone support is added.

### PWA

`public/manifest.json` — PWA manifest (name: BalanceWell, theme: `#C4714A`, icons with separate `any` and `maskable` entries).
`public/sw.js` — service worker: handles `push` events (shows notification) and `notificationclick` (opens the app URL).
`app/layout.tsx` — exports `viewport: Viewport` (for `themeColor`) and `metadata: Metadata` (for `manifest`, `appleWebApp`). Registers the service worker via `next/script` with `strategy="afterInteractive"`.

### API routes

| Route | Method | Purpose |
|---|---|---|
| `/api/plan` | GET | Today's plan + streak. Auto-seeds plan if none exists. Returns `{ error: 'needs_onboarding' }` if user has no name. |
| `/api/logs` | POST | Log a completed exercise. Creates `session_log` if none exists for today. |
| `/api/logs` | PATCH | Mark session fully complete (`completedAt`). Scoped to `userId`. |
| `/api/progress` | GET | Last 30 days of completed dates + today's exercise levels + streak. |
| `/api/coach` | POST | Streaming Gemini chat. Converts `UIMessage[]` → `ModelMessage[]` via `convertToModelMessages`. Pain guardrail intercepts before Gemini. |
| `/api/checkin` | POST | Saves check-in rating + notes to `session_log`, then fires Gemini plan update (fire-and-forget). |
| `/api/user` | GET | Returns current user's `reminderTime`. |
| `/api/user` | PATCH | Updates user `name` and/or `reminderTime`. |
| `/api/push/subscribe` | POST | Upserts a push subscription for the current user. |
| `/api/push/unsubscribe` | DELETE | Removes a push subscription scoped to `(userId, endpoint)`. |
| `/api/reminders/send` | POST | Sends email + push reminders to users whose `reminder_time` matches now. Bearer-token auth. |
| `/api/seed` | POST | Seed exercise library (dev only). |

### UI structure

```
app/(auth)/                     — No auth guard, no bottom nav
  login/page.tsx                — Magic link sign-in
  verify/page.tsx               — "Check your email" page
  onboarding/page.tsx           — Name entry + reminder time picker (new users)

app/(app)/                      — Auth guard in layout.tsx, bottom nav
  page.tsx                      — Home: fetches /api/plan, shows daily exercises, gear icon → /settings
  exercises/page.tsx            — Library: grouped by category
  exercises/[id]/page.tsx       — Player: Lottie animation + countdown timer + rating. Redirects to /checkin after last exercise.
  progress/page.tsx             — Week grid + level bars
  coach/page.tsx                — AI coach chat (Coach Mei)
  checkin/page.tsx              — Post-session check-in (emoji rating + notes)
  settings/page.tsx             — Reminder time, large text toggle, push toggle, sign out
```

`components/BottomNav.tsx` — fixed bottom nav with 4 items. Uses `usePathname()` for active state.
`components/CoachMei.tsx` — animated Coach Mei persona. Fetches Lottie JSON from `/animations/coach/<state>.json` for 4 states: `idle | thinking | speaking | celebrating`. Falls back to 🌿 emoji if fetch fails.

Lottie animation files live in `public/animations/exercises/<exercise-id>.json` (exercises) and `public/animations/coach/<state>.json` (coach). Both fall back to emoji on fetch failure.

### Design system

Tailwind CSS v3 with CSS custom properties (not Tailwind v4). All colours and fonts are defined as CSS variables in `app/globals.css` and mapped in `tailwind.config.ts`. Use the semantic Tailwind classes (`bg-primary`, `text-dark`, `font-heading`, etc.) rather than raw hex values.

Key tokens: `--primary: #C4714A` (terracotta), `--secondary: #5B8A6E` (sage green), `--dark: #2C1810`, `--bg: #F5F0E8` (warm cream). Fonts: **Fraunces** (`font-heading`) for headings, **DM Sans** (`font-body`) for body. Minimum body text 20px; minimum tap targets 56×56px.

## Known Deferred Items

- Real Lottie animations for Coach Mei (currently placeholder JSON)
- Real app icons in `public/icons/` (currently 1×1 terracotta placeholders)
- Verified Resend sending domain for reminder emails (currently `onboarding@resend.dev`, sandbox only)
- Timezone-aware reminder scheduling (currently matched against UTC server clock)
- `user_id` index on `push_subscription` table for query performance
- Vercel Cron job wiring for `/api/reminders/send` (must be called externally every minute)
- Check-in notes not screened by pain guardrail (only coach chat messages are)
