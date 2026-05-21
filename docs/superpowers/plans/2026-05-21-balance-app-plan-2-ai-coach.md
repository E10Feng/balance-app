# BalanceWell — Implementation Plan 2: AI Coach + Reminders + PWA

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Gemini 2.5 Flash AI coach with tool-calling, animated Coach Mei persona, post-session check-in flow, onboarding, email/push reminders, and PWA support.

**Architecture:** Vercel AI SDK `streamText` powers the coach chat endpoint; `generateText` handles the post-session check-in silently. Coach tools (`get_user_history`, `get_exercise_library`, `update_exercise_plan`) run server-side and commit directly to Neon. Onboarding detects `user.name === null` and intercepts the layout redirect. Web Push uses VAPID keys; Resend sends email reminders triggered by a dedicated API route.

**Tech Stack:** Vercel AI SDK (`ai`), `@ai-sdk/google` (Gemini 2.5 Flash), `web-push`, `@types/web-push`, Resend (already installed), Vitest + React Testing Library (already installed)

**Prerequisites — add to `.env.local` before Task 3:**
```
GOOGLE_GENERATIVE_AI_API_KEY=   # from aistudio.google.com
VAPID_PUBLIC_KEY=               # generated in Task 9
VAPID_PRIVATE_KEY=              # generated in Task 9
VAPID_EMAIL=mailto:your@email.com
```

---

## File Structure

```
lib/
  coach/
    tools.ts          # AI tool definitions (get_user_history, get_exercise_library, update_exercise_plan)
    system-prompt.ts  # Builds system prompt from user context
    guardrails.ts     # Pain keyword detection + level validation
  push.ts             # VAPID setup + sendPushNotification helper
  reminders.ts        # sendEmailReminder + sendPushReminder helpers

app/api/
  coach/route.ts          # POST — streaming chat endpoint
  checkin/route.ts        # POST — saves check-in, triggers coach to update plan
  push/
    subscribe/route.ts    # POST — save push subscription
    unsubscribe/route.ts  # DELETE — remove push subscription
  reminders/
    send/route.ts         # POST — send today's reminders (called by cron or manually)
  user/route.ts           # PATCH — update user name + reminder_time

app/(app)/
  checkin/page.tsx      # Post-session check-in screen (2 questions + Coach Mei celebrating)
  onboarding/page.tsx   # 3-step onboarding: name → reminder time → done
  settings/page.tsx     # Reminder time + large text toggle + account info
  coach/page.tsx        # Replace placeholder with real streaming chat UI
  layout.tsx            # Modify: redirect new users (name === null) to /onboarding

components/
  CoachMei.tsx    # Animated persona — 4 Lottie states with emoji fallback

public/
  manifest.json                    # PWA manifest
  animations/coach/
    idle.json          # Placeholder Lottie (copy from exercises placeholder)
    thinking.json
    speaking.json
    celebrating.json
```

**Modified files:**
- `lib/schema.ts` — add `pushSubscriptions` table
- `app/(app)/exercises/[id]/page.tsx` — redirect to `/checkin` after final exercise
- `app/layout.tsx` — add PWA meta tags + manifest link

---

## Task 1: Install Dependencies

**Files:** `package.json`

- [ ] **Step 1: Install Plan 2 packages**

```bash
npm install ai @ai-sdk/google web-push
npm install -D @types/web-push
```

- [ ] **Step 2: Verify install**

```bash
node -e "require('ai'); require('@ai-sdk/google'); require('web-push'); console.log('ok')"
```
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add AI SDK, Gemini provider, and web-push dependencies"
```

---

## Task 2: Coach Guardrails + System Prompt (Pure Logic)

**Files:**
- Create: `lib/coach/guardrails.ts`
- Create: `lib/coach/system-prompt.ts`
- Create: `lib/__tests__/coach-guardrails.test.ts`
- Create: `lib/__tests__/coach-system-prompt.test.ts`

- [ ] **Step 1: Write failing guardrails test**

Create `lib/__tests__/coach-guardrails.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { containsPainKeywords, validatePlanUpdate } from '../coach/guardrails';

describe('containsPainKeywords', () => {
  it('detects pain', () => expect(containsPainKeywords('my knee hurts')).toBe(true));
  it('detects fell', () => expect(containsPainKeywords('I fell yesterday')).toBe(true));
  it('is case-insensitive', () => expect(containsPainKeywords('I FEEL PAIN')).toBe(true));
  it('returns false for normal text', () => expect(containsPainKeywords('this is great')).toBe(false));
});

describe('validatePlanUpdate', () => {
  it('clamps levels to 1–5', () => {
    const result = validatePlanUpdate([{ exercise_id: 'a', level: 10 }], {});
    expect(result[0].level).toBe(5);
  });

  it('limits advancement to +1 per exercise', () => {
    const result = validatePlanUpdate(
      [{ exercise_id: 'a', level: 4 }],
      { 'a': 2 }
    );
    expect(result[0].level).toBe(3);
  });

  it('allows regression freely', () => {
    const result = validatePlanUpdate(
      [{ exercise_id: 'a', level: 1 }],
      { 'a': 4 }
    );
    expect(result[0].level).toBe(1);
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
npx vitest run lib/__tests__/coach-guardrails.test.ts
```
Expected: FAIL — `Cannot find module '../coach/guardrails'`

- [ ] **Step 3: Implement guardrails**

Create `lib/coach/guardrails.ts`:
```typescript
const PAIN_KEYWORDS = ['pain', 'hurt', 'hurts', 'hurting', 'ache', 'aching', 'fall', 'fell', 'injured', 'injury'];

export const PAIN_RESPONSE = "I'm concerned about what you've shared. Please stop exercising and speak with your doctor before continuing. Your safety is the most important thing. 🌿";

export function containsPainKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  return PAIN_KEYWORDS.some((kw) => lower.includes(kw));
}

export function validatePlanUpdate(
  entries: Array<{ exercise_id: string; level: number }>,
  currentLevels: Record<string, number>
): Array<{ exercise_id: string; level: number }> {
  return entries.map((e) => {
    const current = currentLevels[e.exercise_id];
    let level = e.level;
    if (current !== undefined && level > current + 1) level = current + 1;
    level = Math.min(5, Math.max(1, level));
    return { ...e, level };
  });
}
```

- [ ] **Step 4: Write failing system prompt test**

Create `lib/__tests__/coach-system-prompt.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '../coach/system-prompt';

describe('buildSystemPrompt', () => {
  it('includes the user name', () => {
    const prompt = buildSystemPrompt({ userName: 'Ming', todayPlan: [], recentSummary: '' });
    expect(prompt).toContain('Ming');
  });

  it('includes the plan exercises', () => {
    const prompt = buildSystemPrompt({
      userName: 'Ming',
      todayPlan: [{ name: 'Tandem Stance', level: 2 }],
      recentSummary: '',
    });
    expect(prompt).toContain('Tandem Stance');
    expect(prompt).toContain('Level 2');
  });

  it('includes the safety rules', () => {
    const prompt = buildSystemPrompt({ userName: 'Ming', todayPlan: [], recentSummary: '' });
    expect(prompt).toContain('pain');
    expect(prompt).toContain('4 exercises');
  });
});
```

- [ ] **Step 5: Implement system prompt builder**

Create `lib/coach/system-prompt.ts`:
```typescript
type Props = {
  userName: string;
  todayPlan: Array<{ name: string; level: number }>;
  recentSummary: string;
};

export function buildSystemPrompt({ userName, todayPlan, recentSummary }: Props): string {
  const planStr = todayPlan.length
    ? todayPlan.map((p) => `${p.name} (Level ${p.level})`).join(', ')
    : 'No plan set yet';

  return `You are Coach Mei, a warm and encouraging balance exercise coach for older adults. Your user is ${userName}, exercising at home in Taiwan.

Current plan: ${planStr}
Recent history: ${recentSummary || 'No recent sessions yet.'}

Rules you must follow:
- Never advance more than 1 level per exercise per day
- Never prescribe more than 4 exercises per session
- If the user mentions pain, instruct them to stop and consult a doctor — do not modify the plan
- Keep all responses under 3 sentences, plain simple language
- Be warm, patient, and encouraging — never clinical or cold
- When you update the exercise plan, always confirm the change in your reply`;
}
```

- [ ] **Step 6: Run all tests**

```bash
npx vitest run lib/__tests__/coach-guardrails.test.ts lib/__tests__/coach-system-prompt.test.ts
```
Expected: 7/7 PASS

- [ ] **Step 7: Commit**

```bash
git add lib/coach/ lib/__tests__/coach-guardrails.test.ts lib/__tests__/coach-system-prompt.test.ts
git commit -m "feat: add AI coach guardrails and system prompt builder"
```

---

## Task 3: AI Coach Tools

**Files:**
- Create: `lib/coach/tools.ts`

> **Before this task:** Add `GOOGLE_GENERATIVE_AI_API_KEY` to `.env.local`. Get a free API key at [aistudio.google.com](https://aistudio.google.com).

- [ ] **Step 1: Write the tools file**

Create `lib/coach/tools.ts`:
```typescript
import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/lib/db';
import { sessionLogs, userExercisePlan } from '@/lib/schema';
import { eq, and, gte, desc } from 'drizzle-orm';
import { EXERCISES, EXERCISE_LEVELS } from '@/lib/seed-exercises';
import { validatePlanUpdate } from './guardrails';

export function makeCoachTools(userId: string, todayDate: string) {
  return {
    get_user_history: tool({
      description: "Get the user's exercise history and session check-ins for the last N days",
      parameters: z.object({ days: z.number().min(1).max(30).describe('Number of days of history to fetch') }),
      execute: async ({ days }) => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffStr = cutoff.toISOString().split('T')[0];
        const sessions = await db.query.sessionLogs.findMany({
          where: and(eq(sessionLogs.userId, userId), gte(sessionLogs.date, cutoffStr)),
          with: { exerciseLogs: true },
          orderBy: desc(sessionLogs.date),
        });
        return { sessions };
      },
    }),

    get_exercise_library: tool({
      description: 'Get available exercises and their 5 difficulty levels',
      parameters: z.object({
        category: z.enum(['static_balance', 'dynamic_balance', 'strength_support']).optional()
          .describe('Filter by category, or omit for all'),
      }),
      execute: async ({ category }) => {
        const filtered = category ? EXERCISES.filter((e) => e.category === category) : EXERCISES;
        return { exercises: filtered, levels: EXERCISE_LEVELS };
      },
    }),

    update_exercise_plan: tool({
      description: "Update the user's exercise plan for tomorrow. Call this after reviewing history.",
      parameters: z.object({
        exercises: z.array(z.object({
          exercise_id: z.string().describe('Exercise ID from the library'),
          level: z.number().min(1).max(5).describe('Difficulty level 1-5'),
        })).min(1).max(4),
      }),
      execute: async ({ exercises: proposed }) => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        // Get current plan for level validation
        const currentPlan = await db.query.userExercisePlan.findMany({
          where: and(eq(userExercisePlan.userId, userId), eq(userExercisePlan.scheduledDate, todayDate)),
        });
        const currentLevels = Object.fromEntries(currentPlan.map((p) => [p.exerciseId, p.level]));

        const validated = validatePlanUpdate(proposed, currentLevels);

        // Replace tomorrow's plan
        await db.delete(userExercisePlan).where(
          and(eq(userExercisePlan.userId, userId), eq(userExercisePlan.scheduledDate, tomorrowStr))
        );
        await db.insert(userExercisePlan).values(
          validated.map((e, i) => ({
            id: crypto.randomUUID(),
            userId,
            exerciseId: e.exercise_id,
            level: e.level,
            scheduledDate: tomorrowStr,
            order: i + 1,
          }))
        );

        return { success: true, updatedExercises: validated };
      },
    }),
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: No errors (or only pre-existing errors unrelated to coach/tools.ts)

- [ ] **Step 3: Commit**

```bash
git add lib/coach/tools.ts
git commit -m "feat: add AI coach tools (get_user_history, get_exercise_library, update_exercise_plan)"
```

---

## Task 4: Coach API Endpoint (Streaming)

**Files:**
- Create: `app/api/coach/route.ts`
- Create: `app/api/checkin/route.ts`

- [ ] **Step 1: Create the streaming coach endpoint**

Create `app/api/coach/route.ts`:
```typescript
import { auth } from '@/lib/auth';
import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { NextResponse } from 'next/server';
import { makeCoachTools } from '@/lib/coach/tools';
import { buildSystemPrompt } from '@/lib/coach/system-prompt';
import { containsPainKeywords, PAIN_RESPONSE } from '@/lib/coach/guardrails';
import { db } from '@/lib/db';
import { users, userExercisePlan } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

const today = () => new Date().toISOString().split('T')[0];

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

  const { messages } = await req.json() as { messages: Array<{ role: string; content: string }> };
  const lastMessage = messages[messages.length - 1]?.content ?? '';

  if (containsPainKeywords(lastMessage)) {
    return NextResponse.json({ type: 'text', text: PAIN_RESPONSE });
  }

  const date = today();
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  const plan = await db.query.userExercisePlan.findMany({
    where: and(eq(userExercisePlan.userId, userId), eq(userExercisePlan.scheduledDate, date)),
    with: { exercise: true },
  });

  const result = streamText({
    model: google('gemini-2.5-flash-preview-05-20'),
    system: buildSystemPrompt({
      userName: user?.name ?? 'friend',
      todayPlan: plan.map((p) => ({ name: p.exercise.name, level: p.level })),
      recentSummary: 'Use get_user_history tool to fetch recent sessions.',
    }),
    messages: messages as Parameters<typeof streamText>[0]['messages'],
    tools: makeCoachTools(userId, date),
    maxSteps: 5,
  });

  return result.toDataStreamResponse();
}
```

- [ ] **Step 2: Create the post-session check-in API**

Create `app/api/checkin/route.ts`:
```typescript
import { auth } from '@/lib/auth';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessionLogs, users, userExercisePlan } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { makeCoachTools } from '@/lib/coach/tools';
import { buildSystemPrompt } from '@/lib/coach/system-prompt';

const today = () => new Date().toISOString().split('T')[0];

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

  const { sessionId, overall, notes } = await req.json() as {
    sessionId: string;
    overall: number | null;
    notes: string;
  };

  const date = today();

  // Save check-in to session log
  await db.update(sessionLogs)
    .set({ checkInOverall: overall, checkInNotes: notes, completedAt: new Date() })
    .where(and(eq(sessionLogs.id, sessionId), eq(sessionLogs.userId, userId)));

  // Build context for coach
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  const plan = await db.query.userExercisePlan.findMany({
    where: and(eq(userExercisePlan.userId, userId), eq(userExercisePlan.scheduledDate, date)),
    with: { exercise: true },
  });

  // Trigger coach silently to update tomorrow's plan
  await generateText({
    model: google('gemini-2.5-flash-preview-05-20'),
    system: buildSystemPrompt({
      userName: user?.name ?? 'friend',
      todayPlan: plan.map((p) => ({ name: p.exercise.name, level: p.level })),
      recentSummary: 'Use get_user_history to review recent sessions then update tomorrow\'s plan.',
    }),
    messages: [{
      role: 'user',
      content: `The user just finished their session. Check-in: overall feeling ${overall ?? 'not rated'}/5. Notes: "${notes || 'none'}". Review their last 7 days and update tomorrow's plan accordingly.`,
    }],
    tools: makeCoachTools(userId, date),
    maxSteps: 5,
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Smoke-test the coach endpoint manually**

With dev server running and signed in:
```bash
curl -X POST http://localhost:3000/api/coach \
  -H "Content-Type: application/json" \
  -H "Cookie: <paste your session cookie>" \
  -d '{"messages":[{"role":"user","content":"Hello, what exercises do I have today?"}]}'
```
Expected: Streaming response with coach text. If no cookie, returns `{"error":"Unauthorized"}`.

- [ ] **Step 4: Commit**

```bash
git add app/api/coach/ app/api/checkin/
git commit -m "feat: add streaming coach API and post-session check-in endpoint"
```

---

## Task 5: CoachMei Animated Persona Component

**Files:**
- Create: `components/CoachMei.tsx`
- Create: `public/animations/coach/idle.json` (placeholder)
- Create: `public/animations/coach/thinking.json` (placeholder)
- Create: `public/animations/coach/speaking.json` (placeholder)
- Create: `public/animations/coach/celebrating.json` (placeholder)
- Create: `components/__tests__/CoachMei.test.tsx`

- [ ] **Step 1: Create placeholder Lottie files for all 4 states**

Copy `public/animations/exercises/placeholder.json` to four coach state files:
```bash
cp public/animations/exercises/placeholder.json public/animations/coach/idle.json
cp public/animations/exercises/placeholder.json public/animations/coach/thinking.json
cp public/animations/exercises/placeholder.json public/animations/coach/speaking.json
cp public/animations/exercises/placeholder.json public/animations/coach/celebrating.json
```

- [ ] **Step 2: Write CoachMei test**

Create `components/__tests__/CoachMei.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CoachMei from '../CoachMei';

vi.mock('next/dynamic', () => ({
  default: () => () => null,
}));

describe('CoachMei', () => {
  it('renders emoji fallback when animation not loaded', () => {
    render(<CoachMei state="idle" />);
    expect(screen.getByText('🌿')).toBeInTheDocument();
  });

  it('applies correct size', () => {
    render(<CoachMei state="celebrating" size={100} />);
    const el = screen.getByText('🌿').parentElement;
    expect(el).toHaveStyle({ width: '100px', height: '100px' });
  });
});
```

- [ ] **Step 3: Run test to confirm it fails**

```bash
npx vitest run components/__tests__/CoachMei.test.tsx
```
Expected: FAIL

- [ ] **Step 4: Implement CoachMei component**

Create `components/CoachMei.tsx`:
```typescript
'use client';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

export type MeiState = 'idle' | 'thinking' | 'speaking' | 'celebrating';

const STATE_URLS: Record<MeiState, string> = {
  idle: '/animations/coach/idle.json',
  thinking: '/animations/coach/thinking.json',
  speaking: '/animations/coach/speaking.json',
  celebrating: '/animations/coach/celebrating.json',
};

type Props = { state: MeiState; size?: number };

export default function CoachMei({ state, size = 80 }: Props) {
  const [animData, setAnimData] = useState<object | null>(null);

  useEffect(() => {
    setAnimData(null);
    fetch(STATE_URLS[state])
      .then((r) => r.json())
      .then(setAnimData)
      .catch(() => setAnimData(null));
  }, [state]);

  const style = { width: size, height: size };

  if (!animData) {
    return (
      <div
        style={style}
        className="rounded-full bg-secondary flex items-center justify-center text-3xl flex-shrink-0"
      >
        🌿
      </div>
    );
  }

  return (
    <div style={style} className="flex-shrink-0">
      <Lottie animationData={animData} loop />
    </div>
  );
}
```

- [ ] **Step 5: Run test to confirm it passes**

```bash
npx vitest run components/__tests__/CoachMei.test.tsx
```
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add components/CoachMei.tsx components/__tests__/CoachMei.test.tsx public/animations/coach/
git commit -m "feat: add CoachMei animated persona with 4 states and Lottie fallback"
```

---

## Task 6: Coach Screen (Replace Placeholder)

**Files:**
- Modify: `app/(app)/coach/page.tsx`

- [ ] **Step 1: Replace the placeholder with the full coach UI**

Replace `app/(app)/coach/page.tsx`:
```typescript
'use client';
import { useChat } from 'ai/react';
import CoachMei, { type MeiState } from '@/components/CoachMei';
import { useEffect, useRef } from 'react';

const QUICK_REPLIES = [
  'What exercises do I have today?',
  'Is this exercise safe for me?',
  'Can I skip today?',
  'Make it easier',
  'Make it harder',
  'I feel pain',
];

export default function CoachPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, append, status } = useChat({
    api: '/api/coach',
  });
  const bottomRef = useRef<HTMLDivElement>(null);

  const meiState: MeiState = isLoading ? 'thinking'
    : messages.length > 0 && messages[messages.length - 1].role === 'assistant' ? 'speaking'
    : 'idle';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function sendQuickReply(text: string) {
    append({ role: 'user', content: text });
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-bg max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 p-6 pt-10 flex-shrink-0">
        <CoachMei state={meiState} size={64} />
        <div>
          <p className="font-heading text-2xl font-semibold text-dark">Coach Mei</p>
          <p className="text-secondary text-sm">● Online — ready to help</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 flex flex-col gap-4 pb-4">
        {messages.length === 0 && (
          <div className="bg-surface rounded-2xl rounded-tl-sm p-4 text-lg text-dark self-start max-w-[85%]">
            Hello! 😊 I&apos;m Coach Mei, your balance coach. How are you feeling today?
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`p-4 rounded-2xl text-lg max-w-[85%] ${
              m.role === 'user'
                ? 'bg-primary text-white self-end rounded-tr-sm'
                : 'bg-surface text-dark self-start rounded-tl-sm'
            }`}
          >
            {m.content}
          </div>
        ))}
        {isLoading && (
          <div className="bg-surface rounded-2xl rounded-tl-sm p-4 text-lg text-mid self-start">
            <span className="animate-pulse">···</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick replies — only before first message */}
      {messages.length === 0 && (
        <div className="px-6 pb-3 flex flex-wrap gap-2 flex-shrink-0">
          {QUICK_REPLIES.map((r) => (
            <button
              key={r}
              onClick={() => sendQuickReply(r)}
              className="bg-surface border-2 border-primary-light text-primary text-sm font-medium px-4 py-2.5 rounded-full transition-colors hover:bg-primary-light"
            >
              {r}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-3 px-6 pb-6 flex-shrink-0">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Type a message..."
          className="flex-1 text-xl p-4 rounded-2xl border-2 border-primary-light bg-surface text-dark outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="w-14 h-14 rounded-full bg-primary flex items-center justify-center disabled:opacity-50 flex-shrink-0"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Test coach screen manually**

```bash
npm run dev
```
Navigate to `/coach`. Expected: Coach Mei emoji avatar, greeting message, quick reply buttons, and typing a message gets a streaming response from Gemini.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/coach/page.tsx"
git commit -m "feat: replace coach placeholder with full streaming chat UI and Coach Mei persona"
```

---

## Task 7: Post-Session Check-In Flow

**Files:**
- Create: `app/(app)/checkin/page.tsx`
- Modify: `app/(app)/exercises/[id]/page.tsx`

- [ ] **Step 1: Create the check-in page**

Create `app/(app)/checkin/page.tsx`:
```typescript
'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CoachMei from '@/components/CoachMei';

const EMOJI_RATINGS = ['😟', '😕', '😐', '🙂', '😊'];
const QUICK_CHIPS = ['Too easy', 'Too hard', 'Felt great', 'Feeling tired', 'Some discomfort'];

export default function CheckInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId') ?? '';

  const [overall, setOverall] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function addChip(chip: string) {
    setNotes((prev) => prev ? `${prev}, ${chip}` : chip);
  }

  async function handleSubmit() {
    setSubmitting(true);
    await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, overall, notes }),
    });
    router.push('/');
  }

  return (
    <div className="flex flex-col min-h-screen bg-bg p-6 pt-10 max-w-md mx-auto">
      <div className="flex flex-col items-center gap-4 mb-8">
        <CoachMei state="celebrating" size={100} />
        <h1 className="font-heading text-3xl font-semibold text-dark text-center">Great work today! 🎉</h1>
        <p className="text-mid text-xl text-center">Help Coach Mei plan tomorrow&apos;s session.</p>
      </div>

      <div className="flex flex-col gap-6">
        <div>
          <p className="text-dark text-xl font-medium mb-4">How did today feel overall?</p>
          <div className="flex justify-between gap-2">
            {EMOJI_RATINGS.map((emoji, i) => (
              <button
                key={i}
                onClick={() => setOverall(i + 1)}
                className={`flex-1 py-4 rounded-2xl text-3xl border-2 transition-all ${
                  overall === i + 1 ? 'border-primary bg-primary-light' : 'border-primary-light bg-surface'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-dark text-xl font-medium mb-3">Anything to tell Coach Mei?</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => addChip(chip)}
                className="bg-surface border-2 border-primary-light text-primary text-base font-medium px-4 py-2 rounded-full"
              >
                {chip}
              </button>
            ))}
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Or type something..."
            rows={3}
            className="w-full text-lg p-4 rounded-2xl border-2 border-primary-light bg-surface text-dark outline-none focus:border-primary resize-none"
          />
        </div>
      </div>

      <div className="flex gap-3 mt-8">
        <button
          onClick={() => router.push('/')}
          className="flex-1 py-5 rounded-2xl border-2 border-muted text-mid text-lg font-medium"
        >
          Skip
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting || overall === null}
          className="flex-[2] py-5 rounded-2xl bg-primary text-white text-lg font-semibold disabled:opacity-60"
        >
          {submitting ? 'Updating plan...' : 'Send to Coach Mei'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Modify exercise player to redirect to check-in after last exercise**

In `app/(app)/exercises/[id]/page.tsx`, find the `handleDone` function and replace it:

```typescript
// Find and replace the handleDone function
// Old:
async function handleDone() {
  await fetch('/api/logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      exerciseId: id,
      level,
      durationSeconds: duration - remaining,
      userRating: rating,
      sessionId,
    }),
  });
  router.back();
}

// New — also add isLastExercise prop check:
```

Add a new search param `isLast` and update `handleDone`:
```typescript
  const isLast = searchParams.get('isLast') === 'true';

  async function handleDone() {
    const res = await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exerciseId: id,
        level,
        durationSeconds: duration - remaining,
        userRating: rating,
        sessionId,
      }),
    });
    const data = await res.json() as { sessionId: string };
    if (isLast) {
      router.push(`/checkin?sessionId=${data.sessionId}`);
    } else {
      router.back();
    }
  }
```

Also update `app/(app)/page.tsx` — the "Start Exercises" / "Continue Exercises" button and each exercise card `onClick` need to pass `isLast=true` for the last pending exercise. Find the exercise map in `app/(app)/page.tsx` and update:

```typescript
// In the plan.map, track which is the last pending exercise
const pendingItems = data.plan.filter((p) => !p.completed);
const lastPendingId = pendingItems[pendingItems.length - 1]?.exerciseId;

// Then in ExerciseCard onClick:
onClick={() => router.push(
  `/exercises/${item.exerciseId}?level=${item.level}&sessionId=${data.sessionId ?? ''}&isLast=${item.exerciseId === lastPendingId}`
)}

// And the Start/Continue button:
onClick={() => router.push(
  `/exercises/${firstPending.exerciseId}?level=${firstPending.level}&sessionId=${data.sessionId ?? ''}&isLast=${firstPending.exerciseId === lastPendingId}`
)}
```

- [ ] **Step 3: Test the check-in flow manually**

```bash
npm run dev
```
Complete all exercises for the day. Expected: after the last exercise's Done button, redirected to `/checkin`. Submit the check-in → redirected to home. Check Neon console to verify `session_log.check_in_overall` was saved and tomorrow's `user_exercise_plan` was updated by Gemini.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/checkin/page.tsx" "app/(app)/exercises/[id]/page.tsx" "app/(app)/page.tsx"
git commit -m "feat: add post-session check-in with Coach Mei and Gemini plan update"
```

---

## Task 8: Onboarding Flow

**Files:**
- Create: `app/(app)/onboarding/page.tsx`
- Create: `app/api/user/route.ts`
- Modify: `app/(app)/layout.tsx`

- [ ] **Step 1: Create user update API**

Create `app/api/user/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, reminderTime } = await req.json() as { name?: string; reminderTime?: string };
  const updates: Partial<typeof users.$inferInsert> = {};
  if (name !== undefined) updates.name = name;
  if (reminderTime !== undefined) updates.reminderTime = reminderTime;

  const [updated] = await db.update(users)
    .set(updates)
    .where(eq(users.id, session.user.id))
    .returning();

  return NextResponse.json({ user: updated });
}
```

- [ ] **Step 2: Create the onboarding page (3 steps)**

Create `app/(app)/onboarding/page.tsx`:
```typescript
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const REMINDER_TIMES = ['07:00', '08:00', '09:00', '10:00', '14:00', '16:00', '18:00', '20:00'];
const REMINDER_LABELS: Record<string, string> = {
  '07:00': '7:00 AM', '08:00': '8:00 AM', '09:00': '9:00 AM', '10:00': '10:00 AM',
  '14:00': '2:00 PM', '16:00': '4:00 PM', '18:00': '6:00 PM', '20:00': '8:00 PM',
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [reminderTime, setReminderTime] = useState('09:00');
  const [saving, setSaving] = useState(false);

  async function handleFinish() {
    setSaving(true);
    await fetch('/api/user', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), reminderTime }),
    });
    router.push('/');
  }

  return (
    <div className="flex flex-col min-h-screen bg-bg p-8 pt-16 max-w-md mx-auto">
      {step === 1 && (
        <>
          <div className="text-6xl mb-6 text-center">🌿</div>
          <h1 className="font-heading text-4xl font-semibold text-dark mb-2">
            Welcome to<br /><span className="italic text-primary">BalanceWell</span>
          </h1>
          <p className="text-mid text-xl mb-10">
            Your daily balance exercise companion. Let&apos;s get started.
          </p>
          <label className="text-dark text-xl font-medium mb-3">What should Coach Mei call you?</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your first name"
            className="w-full text-xl p-5 rounded-2xl border-2 border-primary-light bg-surface text-dark outline-none focus:border-primary mb-6"
          />
          <button
            onClick={() => setStep(2)}
            disabled={!name.trim()}
            className="w-full bg-primary text-white text-xl font-semibold py-5 rounded-2xl disabled:opacity-50"
          >
            Continue →
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <h1 className="font-heading text-4xl font-semibold text-dark mb-2">
            When should we<br /><span className="italic text-primary">remind you?</span>
          </h1>
          <p className="text-mid text-xl mb-8">
            We&apos;ll send a daily reminder at this time.
          </p>
          <div className="grid grid-cols-2 gap-3 mb-8">
            {REMINDER_TIMES.map((t) => (
              <button
                key={t}
                onClick={() => setReminderTime(t)}
                className={`py-4 rounded-2xl text-xl font-medium border-2 transition-all ${
                  reminderTime === t
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface text-dark border-primary-light'
                }`}
              >
                {REMINDER_LABELS[t]}
              </button>
            ))}
          </div>
          <button
            onClick={handleFinish}
            disabled={saving}
            className="w-full bg-primary text-white text-xl font-semibold py-5 rounded-2xl disabled:opacity-60"
          >
            {saving ? 'Setting up...' : "Let's go! 🌿"}
          </button>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add onboarding redirect to app layout**

Modify `app/(app)/layout.tsx` to check for missing name:
```typescript
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const user = await db.query.users.findFirst({ where: eq(users.id, session.user.id) });

  // New users with no name go through onboarding (skip if already on /onboarding)
  // Note: we can't read the pathname in a layout, so we check via cookie/header isn't possible.
  // Instead, the onboarding page is accessible directly and the layout only redirects once.
  if (!user?.name) redirect('/onboarding');

  return (
    <div className="max-w-md mx-auto min-h-screen pb-20">
      {children}
      <BottomNav />
    </div>
  );
}
```

> **Note:** This redirect will loop if `/onboarding` is inside `(app)/`. Move onboarding outside the auth layout group:
> The onboarding page must be at `app/(auth)/onboarding/page.tsx` (no bottom nav, no name check) OR handle the redirect differently. **Use this approach instead** — remove the redirect from layout and add it to the home page:

Update `app/(app)/layout.tsx` back to the original (no name check):
```typescript
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import BottomNav from '@/components/BottomNav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <div className="max-w-md mx-auto min-h-screen pb-20">
      {children}
      <BottomNav />
    </div>
  );
}
```

And add the name check to `app/(app)/page.tsx` — add this at the top of the `useEffect`:
```typescript
  useEffect(() => {
    fetch('/api/plan')
      .then((r) => r.json())
      .then((d) => {
        // Redirect new users to onboarding
        if (d.error === 'needs_onboarding') {
          router.push('/onboarding');
          return;
        }
        setData(d);
      });
  }, []);
```

And update `app/api/plan/route.ts` GET to check for name:
```typescript
  // Add after userId is resolved:
  const userRecord = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!userRecord?.name) return NextResponse.json({ error: 'needs_onboarding' }, { status: 200 });
```

Move onboarding page to `app/(auth)/onboarding/page.tsx` (no bottom nav wrapper):
```bash
mkdir -p "app/(auth)/onboarding"
# Move app/(app)/onboarding/page.tsx to app/(auth)/onboarding/page.tsx
```

- [ ] **Step 4: Test onboarding manually**

Sign in with a fresh account (or temporarily set `name = null` in Neon for your user). Expected: home page triggers redirect to `/onboarding`, enter name + pick reminder time, submit → redirected to home with your name visible in the greeting.

- [ ] **Step 5: Commit**

```bash
git add app/api/user/ "app/(auth)/onboarding/" "app/(app)/layout.tsx" "app/(app)/page.tsx" app/api/plan/
git commit -m "feat: add onboarding flow and user profile update API"
```

---

## Task 9: Settings Screen

**Files:**
- Create: `app/(app)/settings/page.tsx`
- Modify: `components/BottomNav.tsx` (add Settings as 5th item — or replace Coach teaser)

> **Design decision:** Keep bottom nav at 4 items. Settings is accessible via a gear icon on the Home screen header or a link inside the Coach screen. Don't add a 5th nav item.

- [ ] **Step 1: Add a settings link to the home screen header**

In `app/(app)/page.tsx`, add a settings link to the top of the page:
```typescript
// Add this import
import Link from 'next/link';

// Add this inside the returned JSX, wrapping the date/greeting div:
<div className="flex justify-between items-start">
  <div>
    <p className="text-mid text-sm font-medium uppercase tracking-widest">
      {DAYS[now.getDay()]}, {MONTHS[now.getMonth()]} {now.getDate()}
    </p>
    <h1 className="font-heading text-4xl font-semibold text-dark mt-1 leading-tight">
      {allDone ? 'Well done!' : now.getHours() < 12 ? 'Good morning,' : now.getHours() < 17 ? 'Good afternoon,' : 'Good evening,'}
    </h1>
  </div>
  <Link href="/settings" className="w-12 h-12 rounded-full bg-surface flex items-center justify-center mt-1">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--mid)" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  </Link>
</div>
```

- [ ] **Step 2: Create the settings page**

Create `app/(app)/settings/page.tsx`:
```typescript
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';

const REMINDER_TIMES = ['07:00', '08:00', '09:00', '10:00', '14:00', '16:00', '18:00', '20:00'];
const REMINDER_LABELS: Record<string, string> = {
  '07:00': '7:00 AM', '08:00': '8:00 AM', '09:00': '9:00 AM', '10:00': '10:00 AM',
  '14:00': '2:00 PM', '16:00': '4:00 PM', '18:00': '6:00 PM', '20:00': '8:00 PM',
};

export default function SettingsPage() {
  const router = useRouter();
  const [reminderTime, setReminderTime] = useState('09:00');
  const [largeText, setLargeText] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('largeText');
    if (stored === 'true') {
      setLargeText(true);
      document.documentElement.style.fontSize = '24px';
    }
  }, []);

  function toggleLargeText() {
    const next = !largeText;
    setLargeText(next);
    localStorage.setItem('largeText', String(next));
    document.documentElement.style.fontSize = next ? '24px' : '20px';
  }

  async function save() {
    setSaving(true);
    await fetch('/api/user', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reminderTime }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="p-6 pt-10 flex flex-col gap-6 max-w-md mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="w-12 h-12 rounded-full bg-surface flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--dark)" strokeWidth="2.5" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <h1 className="font-heading text-3xl font-semibold text-dark">Settings</h1>
      </div>

      <div className="bg-surface rounded-2xl p-5">
        <p className="font-heading text-xl text-dark mb-4">Daily Reminder</p>
        <div className="grid grid-cols-2 gap-3">
          {REMINDER_TIMES.map((t) => (
            <button
              key={t}
              onClick={() => setReminderTime(t)}
              className={`py-3 rounded-xl text-lg font-medium border-2 transition-all ${
                reminderTime === t ? 'bg-primary text-white border-primary' : 'bg-bg text-dark border-primary-light'
              }`}
            >
              {REMINDER_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-surface rounded-2xl p-5 flex items-center justify-between">
        <div>
          <p className="font-heading text-xl text-dark">Large Text</p>
          <p className="text-mid text-base mt-1">Increases all text size by 20%</p>
        </div>
        <button
          onClick={toggleLargeText}
          className={`w-14 h-8 rounded-full transition-colors ${largeText ? 'bg-primary' : 'bg-muted'}`}
        >
          <span className={`block w-6 h-6 rounded-full bg-white mx-1 transition-transform ${largeText ? 'translate-x-6' : 'translate-x-0'}`} />
        </button>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="w-full bg-primary text-white text-xl font-semibold py-5 rounded-2xl disabled:opacity-60"
      >
        {saved ? '✓ Saved!' : saving ? 'Saving...' : 'Save Settings'}
      </button>

      <button
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="w-full py-5 rounded-2xl border-2 border-muted text-mid text-xl font-medium"
      >
        Sign Out
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Verify settings page works**

```bash
npm run dev
```
Navigate to `/settings`. Expected: reminder time grid, large text toggle (changes font size immediately), save button, sign out button.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/settings/page.tsx" "app/(app)/page.tsx"
git commit -m "feat: add settings screen with reminder time and large text toggle"
```

---

## Task 10: Push Notification Subscription

**Files:**
- Modify: `lib/schema.ts` (add `pushSubscriptions` table)
- Create: `lib/push.ts`
- Create: `app/api/push/subscribe/route.ts`
- Create: `app/api/push/unsubscribe/route.ts`

- [ ] **Step 1: Generate VAPID keys and add to .env.local**

```bash
npx web-push generate-vapid-keys
```
Copy the output into `.env.local`:
```
VAPID_PUBLIC_KEY=<public key from output>
VAPID_PRIVATE_KEY=<private key from output>
VAPID_EMAIL=mailto:e.y.feng@wustl.edu
```

- [ ] **Step 2: Add push_subscriptions table to schema**

Append to `lib/schema.ts`:
```typescript
export const pushSubscriptions = pgTable('push_subscription', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

- [ ] **Step 3: Generate and push migration**

```bash
npx drizzle-kit generate
npx drizzle-kit push
```
Expected: `push_subscription` table created in Neon.

- [ ] **Step 4: Create push utility**

Create `lib/push.ts`:
```typescript
import webpush from 'web-push';

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url?: string }
) {
  await webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    },
    JSON.stringify(payload)
  );
}

export { webpush };
```

- [ ] **Step 5: Create subscription API routes**

Create `app/api/push/subscribe/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { pushSubscriptions } from '@/lib/schema';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { endpoint, keys } = await req.json() as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };

  await db.insert(pushSubscriptions).values({
    userId: session.user.id,
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
  }).onConflictDoUpdate({
    target: pushSubscriptions.endpoint,
    set: { p256dh: keys.p256dh, auth: keys.auth },
  });

  return NextResponse.json({ ok: true });
}
```

Create `app/api/push/unsubscribe/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { pushSubscriptions } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { endpoint } = await req.json() as { endpoint: string };

  await db.delete(pushSubscriptions).where(
    and(
      eq(pushSubscriptions.userId, session.user.id),
      eq(pushSubscriptions.endpoint, endpoint)
    )
  );

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: Add push subscription UI to Settings**

In `app/(app)/settings/page.tsx`, add a push notification toggle. Add to the top of the component:
```typescript
  const [pushEnabled, setPushEnabled] = useState(false);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      setPushEnabled(true);
    }
  }, []);

  async function togglePush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (pushEnabled) {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await fetch('/api/push/unsubscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
      }
      setPushEnabled(false);
    } else {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      });
      setPushEnabled(true);
    }
  }
```

Add to `.env.local`:
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<same public key as VAPID_PUBLIC_KEY>
```

Add the push toggle UI block to settings (between Large Text and the Save button):
```typescript
      <div className="bg-surface rounded-2xl p-5 flex items-center justify-between">
        <div>
          <p className="font-heading text-xl text-dark">Push Notifications</p>
          <p className="text-mid text-base mt-1">Get reminded in your browser</p>
        </div>
        <button
          onClick={togglePush}
          className={`w-14 h-8 rounded-full transition-colors ${pushEnabled ? 'bg-primary' : 'bg-muted'}`}
        >
          <span className={`block w-6 h-6 rounded-full bg-white mx-1 transition-transform ${pushEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
        </button>
      </div>
```

- [ ] **Step 7: Commit**

```bash
git add lib/schema.ts lib/push.ts app/api/push/ "app/(app)/settings/page.tsx" drizzle/
git commit -m "feat: add push subscription API and VAPID setup"
```

---

## Task 11: Email + Push Reminder Sender

**Files:**
- Create: `lib/reminders.ts`
- Create: `app/api/reminders/send/route.ts`

- [ ] **Step 1: Create reminder helpers**

Create `lib/reminders.ts`:
```typescript
import { Resend } from 'resend';
import { sendPushNotification } from './push';

const resend = new Resend(process.env.AUTH_RESEND_KEY);

export async function sendEmailReminder(to: string, name: string) {
  await resend.emails.send({
    from: 'onboarding@resend.dev',
    to,
    subject: `Time for your balance exercises, ${name} 🌿`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h1 style="font-size: 28px; color: #2C1810;">Time to move, ${name}! 🌿</h1>
        <p style="font-size: 18px; color: #7A6355; margin: 16px 0;">
          Your daily balance exercises are ready. Just a few minutes keeps you steady and strong.
        </p>
        <a href="${process.env.NEXTAUTH_URL}" style="display: inline-block; background: #C4714A; color: white; font-size: 20px; font-weight: 600; padding: 16px 32px; border-radius: 16px; text-decoration: none;">
          Start Exercises
        </a>
      </div>
    `,
  });
}

export async function sendPushReminder(
  subscription: { endpoint: string; p256dh: string; auth: string },
  name: string
) {
  await sendPushNotification(subscription, {
    title: 'Time for your exercises! 🌿',
    body: `Hey ${name}, your daily balance routine is ready.`,
    url: '/',
  });
}
```

- [ ] **Step 2: Create the reminder sender endpoint**

Create `app/api/reminders/send/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, pushSubscriptions } from '@/lib/schema';
import { eq, sql } from 'drizzle-orm';
import { sendEmailReminder, sendPushReminder } from '@/lib/reminders';

// Called by a cron job or manually. No user auth — uses a shared secret.
export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentTime = new Date().toTimeString().slice(0, 5); // e.g. "09:00"

  // Find users whose reminder_time matches the current hour:minute
  const dueUsers = await db.query.users.findMany({
    where: eq(users.reminderTime, currentTime),
  });

  const results = await Promise.allSettled(
    dueUsers.map(async (user) => {
      if (!user.email || !user.name) return;

      // Send email
      await sendEmailReminder(user.email, user.name).catch(() => null);

      // Send push to all subscriptions
      const subs = await db.query.pushSubscriptions.findMany({
        where: eq(pushSubscriptions.userId, user.id),
      });
      await Promise.allSettled(subs.map((s) => sendPushReminder(s, user.name!)));
    })
  );

  return NextResponse.json({ sent: dueUsers.length, results: results.length });
}
```

Add to `.env.local`:
```
CRON_SECRET=<generate with: openssl rand -hex 32>
```

- [ ] **Step 3: Test manually**

```bash
# Set CRON_SECRET in .env.local first, then:
curl -X POST http://localhost:3000/api/reminders/send \
  -H "Authorization: Bearer <your-CRON_SECRET>"
```
Expected: `{"sent": N, "results": N}` where N is users whose reminder_time matches now.

- [ ] **Step 4: Commit**

```bash
git add lib/reminders.ts app/api/reminders/
git commit -m "feat: add email and push reminder sender with CRON_SECRET auth"
```

---

## Task 12: PWA Manifest + Service Worker

**Files:**
- Create: `public/manifest.json`
- Create: `public/sw.js`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create manifest**

Create `public/manifest.json`:
```json
{
  "name": "BalanceWell",
  "short_name": "BalanceWell",
  "description": "Daily balance exercises to reduce fall risk",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#F5F0E8",
  "theme_color": "#C4714A",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

Create placeholder icons (plain terracotta squares — replace with real icons later):

Create `public/icons/icon-192.png` and `public/icons/icon-512.png` — generate simple placeholder PNGs using any tool (browser canvas, online generator at [favicon.io](https://favicon.io)), or use the script below:

```bash
# If you have ImageMagick installed:
convert -size 192x192 xc:"#C4714A" public/icons/icon-192.png
convert -size 512x512 xc:"#C4714A" public/icons/icon-512.png
# If not, download placeholder PNGs from any favicon generator site
```

- [ ] **Step 2: Create service worker for push notifications**

Create `public/sw.js`:
```javascript
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'BalanceWell', {
      body: data.body ?? 'Time for your exercises!',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url ?? '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
```

- [ ] **Step 3: Register service worker and add manifest to layout**

Modify `app/layout.tsx`:
```typescript
import type { Metadata } from 'next';
import './globals.css';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'BalanceWell',
  description: 'Daily balance exercises to reduce fall risk',
  manifest: '/manifest.json',
  themeColor: '#C4714A',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BalanceWell',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>
        {children}
        <Script id="sw-register" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.register('/sw.js').catch(console.error);
            }
          `}
        </Script>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Verify PWA in browser**

```bash
npm run dev
```
Open Chrome DevTools → Application → Manifest. Expected: BalanceWell manifest loaded with correct name, colors, and icons. Application → Service Workers: `sw.js` registered.

- [ ] **Step 5: Commit**

```bash
git add public/manifest.json public/sw.js public/icons/ app/layout.tsx
git commit -m "feat: add PWA manifest and service worker for push notifications"
```

---

## Self-Review Checklist

| Spec requirement | Task |
|---|---|
| Gemini 2.5 Flash AI coach | Task 3 (coach API), Task 4 (streaming endpoint) |
| `get_user_history` tool | Task 3 (tools.ts) |
| `get_exercise_library` tool | Task 3 (tools.ts) |
| `update_exercise_plan` tool | Task 3 (tools.ts) |
| Pain keyword safety guardrail | Task 2 (guardrails.ts) — server AND prompt |
| Level advancement ≤ 1 per day | Task 3 (validatePlanUpdate in tools.ts) |
| Max 4 exercises per session | System prompt + tools.ts max(4) constraint |
| Coach Mei animated persona (4 states) | Task 5 (CoachMei.tsx) |
| Post-session check-in (2 questions) | Task 7 (checkin/page.tsx + checkin API) |
| On-demand coach chat | Task 6 (coach/page.tsx) |
| Coach confirms plan changes in reply | System prompt instruction |
| Quick-reply chips | Task 6 (QUICK_REPLIES array) |
| Onboarding flow (name → reminder time) | Task 8 |
| Settings (reminder time + large text) | Task 9 |
| Email reminders (Resend) | Task 11 (reminders.ts) |
| Web Push notifications | Tasks 10–11 (push.ts, subscription routes, sw.js) |
| PWA manifest | Task 12 |

**Deferred (Future):**
- Custom Lottie animations for Coach Mei (placeholder files used)
- Real app icons (placeholder PNG used)
- Vercel cron job wiring for `/api/reminders/send` (manual trigger works)
- i18n / Traditional Chinese
