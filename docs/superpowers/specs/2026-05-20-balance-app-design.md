# BalanceWell — Design Spec
*Date: 2026-05-20*

## Overview

A responsive web app (PWA-capable) for community-dwelling adults aged 65+ in Taiwan. The app delivers daily balance exercises to reduce fall risk, with animated demonstrations, an agentic AI coach, progressive difficulty, and daily reminders. Built for self-operation by the older adult themselves — no caregiver intermediary required.

---

## Section 1 — Architecture & Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 15 (App Router) | SSR, PWA support, Vercel-native |
| Hosting | Vercel Hobby (free tier) | Zero ops, CDN in Asia, scales automatically |
| Database | Neon Postgres (free tier) | 0.5 GB sufficient for early user base |
| Auth | NextAuth.js — email magic link | No password to remember; appropriate for 65+ users |
| AI Coach | Vercel AI SDK + Gemini 2.5 Flash | Best multilingual value; free dev tier; tool-calling support |
| Email reminders | Resend (free tier: 3,000/month) | Reliable delivery, simple API |
| Push notifications | Web Push API (browser-native) | Free; works as PWA |
| Animations | Lottie (JSON vector animations) | Lightweight, smooth, scalable; video clips as fallback |
| Styling | Tailwind CSS | Utility-first, consistent design system |

**Estimated monthly cost at launch:** ~$0 until meaningful user volume. Scales primarily with Gemini API usage (~$0.01–0.05 per coaching session).

**Language:** English for initial development. i18n-ready structure (next-intl) for Traditional Chinese (Taiwan standard) in a future phase. Note: Taiwan uses Traditional Chinese script, not Simplified — confirm with target users before localisation.

---

## Section 2 — UI/UX Design

### Design Aesthetic: "Warm Editorial"

- **Heading font:** Fraunces (optical-size serif — warm, trustworthy, distinctive)
- **Body font:** DM Sans (round, legible at large sizes)
- **Palette:**
  - Background: `#F5F0E8` (warm cream)
  - Primary accent: `#C4714A` (terracotta)
  - Success/secondary: `#5B8A6E` (sage green)
  - Dark text: `#2C1810`
  - Surface: `#FDFAF5`
- **Motion:** Staggered fade-slide-up on screen transitions; CSS-animated SVG stick figures for exercise demonstrations

### Accessibility Rules (non-negotiable)

- Minimum **20px body text**, 28–32px headings — no exceptions
- Minimum **56×56px tap targets** on all interactive elements
- **WCAG AAA** contrast on all text — no grey-on-grey
- Every icon has a visible text label
- No hamburger menus, no nested submenus, no hidden gestures
- Large text toggle in Settings (+20% on all text sizes)

### Navigation

Bottom navigation bar, 4 items only: **Home · Exercises · Progress · Coach**. Every screen has a visible back button. Navigation is flat — maximum 2 levels deep at all times.

### Screen Flow

```
Home (today's routine + streak)
  → Exercise Player (full-screen, one exercise at a time)
      → Post-session Check-in (2 questions)
          → Done / Celebration screen
Exercises (browse full library)
Progress (weekly calendar + level bars + streak)
Coach (AI chat with quick-reply buttons)
Settings (reminder time, large text toggle, account)
```

### Onboarding (first launch only)

3 screens: Enter name → Enter email (magic link sent) → Set reminder time. No passwords, no walls of text.

---

## Section 3 — Core Features

### 1. Daily Exercise Routine
Each day presents up to 4 exercises from the user's current progression plan (written by the AI coach, or fallback rule engine). Exercises are delivered one at a time in a full-screen player: Lottie animation + instruction text + countdown timer. User taps "Done" after each exercise to confirm completion.

### 2. Exercise Library
15–20 exercises across three categories:

| Category | Examples |
|---|---|
| Static Balance | Two-foot stance, tandem stance, single-leg stand |
| Dynamic Balance | Heel-to-toe walk, side stepping, weight shifts |
| Strength Support | Sit-to-stand, calf raises, hip abduction |

Each exercise has 5 difficulty levels (e.g., longer hold duration, eyes closed, no wall support, head turns added).

### 3. Exercise Player
Full-screen view per exercise:
- Lottie animation (looping) with video fallback
- Large instruction text
- Circular countdown timer (CSS SVG ring)
- "Too hard" button — immediately triggers level regression and coach notification
- "Done" tap to confirm completion

### 4. Reminders
User sets one preferred daily time during onboarding. App sends both:
- **Email** via Resend: `"Time for your balance exercises, {name} 🌿"`
- **Browser push** via Web Push API (requires PWA install or notification permission)

### 5. AI Coach — Agentic Exercise Curation (Primary)

The coach (Gemini 2.5 Flash, "Coach Mei") is the primary driver of exercise progression. It has access to three tools:

- `get_user_history(days)` — reads exercise logs and session check-ins for the last N days
- `get_exercise_library(category?)` — lists available exercises and level variants
- `update_exercise_plan(exercises: [{exercise_id, level}])` — writes tomorrow's plan

**Post-session check-in (automatic):** After the user completes all exercises, a check-in screen appears with 2 questions:
1. "How did today feel overall?" (1–5 scale with emoji)
2. "Any exercises that felt too easy or too hard?" (free text or quick-reply chips)

The coach reads this feedback + the day's logs, then calls `update_exercise_plan` for the next session.

**On-demand chat:** User can open the Coach screen at any time and say "the tandem stance is too wobbly" or "I want something harder." The coach reads history, decides on changes, calls `update_exercise_plan`, and always confirms the change in its reply (e.g., "I've updated tomorrow's plan — I've made the tandem stance a little easier for you.").

**Coach system prompt (injected per request):**
```
You are Coach Mei, a warm and encouraging balance exercise coach 
for older adults. Your user is {name}, exercising at home in Taiwan.

Current plan: {today's exercises + levels}
Recent history (last 7 days): {completion rates, ratings, notes}

Rules you must follow:
- Never advance more than 1 level per exercise per day
- Never prescribe more than 4 exercises per session
- If the user mentions pain, instruct them to stop and consult 
  a doctor — do not modify the plan
- Keep all responses under 3 sentences, plain simple language
- Be warm, patient, and encouraging — never clinical or cold
```

**Cost control:** System prompt is cached via Gemini context caching. Each interaction targets under 500 output tokens. Check-ins are server-triggered, not per chat message.

### 6. Progression Fallback (Rule-based)
Used only when the AI coach is unavailable (API error, timeout):
- Advance 1 level after 3 consecutive completions of an exercise
- Regress 1 level after 3 consecutive missed days
- "Too hard" tap always regresses 1 level immediately

---

## Section 4 — Data Model

Six tables in Neon Postgres:

```sql
users
  id, name, email, created_at, reminder_time

exercises
  id, name, category (static_balance | dynamic_balance | strength_support),
  description, instruction, animation_url, video_url

exercise_levels
  id, exercise_id, level (1–5), duration_seconds, reps, difficulty_notes

user_exercise_plan
  id, user_id, exercise_id, level, scheduled_date, order
  -- Written by AI coach via update_exercise_plan tool (or fallback engine)

session_logs
  id, user_id, date, completed_at,
  check_in_overall (1–5), check_in_notes (text)

exercise_logs
  id, session_id, exercise_id, level, completed (bool),
  duration_seconds, user_rating (too_easy | just_right | too_hard)
```

**Key decisions:**
- Coach reads `exercise_logs` + `session_logs` directly — no pre-aggregated tables needed at this scale
- `user_exercise_plan` is always coach-owned; fallback rule engine also writes to it
- No `ai_conversation` table — chat is stateless per request; user context is injected from the above tables into each system prompt

---

## Section 5 — AI Coach Tool Design

### Tool Signatures

```typescript
// Returns last N days of exercise logs + session check-ins for the user
get_user_history({ days: number }) => {
  sessions: SessionLog[],
  exercises: ExerciseLog[]
}

// Returns all exercises, optionally filtered by category
get_exercise_library({ category?: string }) => Exercise[]

// Writes tomorrow's exercise plan — called by coach after check-in or chat
update_exercise_plan({
  exercises: Array<{ exercise_id: string, level: number }>
}) => { success: boolean }
```

### Safety Guardrails

Enforced at both the system prompt level AND server-side validation before `update_exercise_plan` commits to the database:

1. No single exercise may advance more than 1 level per day
2. No session may contain more than 4 exercises
3. All levels must be within 1–5 bounds
4. If any message contains pain-related keywords (`pain`, `hurt`, `fall`, `fell`), the tool call is blocked and a safety response is returned instead

### Coach Mei — Animated Persona

Coach Mei has a warm illustrated character rendered as a Lottie animation (consistent with exercise demos). She appears in three places: the Coach screen header, the post-session check-in screen, and the home screen teaser card.

**Animation states (four Lottie files):**

| State | Trigger |
|---|---|
| `idle` | Default — gentle breathing loop, soft smile |
| `thinking` | While waiting for Gemini API response |
| `speaking` | While the coach response is streaming in |
| `celebrating` | After user completes all exercises for the day |

**Visual design:** Illustrated (not photorealistic), gender-neutral-leaning-feminine, wearing comfortable casual clothes. Warm skin tones, silver hair — someone the 65+ user feels is "like them." Style: soft vector illustration, consistent with the Warm Editorial palette (terracotta + sage green accents).

**Source:** LottieFiles marketplace for the base character animation; can be custom-commissioned in a later phase. Initial implementation uses a high-quality free character Lottie with state variants.

### Quick-reply Chips (Coach screen)
Pre-seeded to cover the most common interactions without typing:
- "Is this exercise safe for me?"
- "Can I skip today?"
- "What does this exercise do?"
- "I feel pain"
- "Make it easier"
- "Make it harder"

---

## Out of Scope (Future Phases)

- SMS reminders (add Twilio when budget allows)
- Traditional Chinese localisation
- Family member remote progress view
- Wearable / sensor-based completion tracking
- Video exercise demonstrations (Lottie animations are primary)
