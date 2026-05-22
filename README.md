# BalanceWell

A mobile-first web app for community-dwelling older adults (65+) to reduce fall risk through daily balance exercises.

## What it does

- **Daily exercises** — personalised plan of up to 4 balance exercises each day, with Lottie animations for visual guidance
- **AI Coach (Coach Mei)** — conversational Gemini-powered coach that answers questions, adjusts difficulty, and updates tomorrow's plan based on how you felt today
- **Progress tracking** — streak counter, weekly completion grid, and per-exercise level bars
- **Post-session check-in** — emoji rating + notes after each session; Coach Mei silently updates the next day's plan in the background
- **Reminders** — daily email and browser push notifications at a user-chosen time
- **Onboarding** — name and reminder time set on first sign-in
- **PWA** — installable on mobile home screen, works offline for the UI

## Tech stack

- **Framework:** Next.js 15 App Router
- **Database:** Neon (serverless Postgres) + Drizzle ORM
- **Auth:** NextAuth v5 with Google OAuth
- **AI:** Gemini 2.5 Flash Lite via Vercel AI SDK v6
- **Email:** Resend
- **Push notifications:** Web Push (VAPID)
- **Styling:** Tailwind CSS v3
- **Testing:** Vitest + React Testing Library
- **Deployment:** Vercel

## Local development

```bash
npm install
npm run dev       # http://localhost:3000
```

Copy `.env.local.example` (or ask a teammate) for the required environment variables — see `CLAUDE.md` for the full list.

```bash
npx vitest run    # run tests
npx tsc --noEmit  # type check
```

## Deployment

Live at: **https://balance-app-brown.vercel.app**

See `docs/DEPLOY_CHECKLIST.md` for the full deployment guide.
