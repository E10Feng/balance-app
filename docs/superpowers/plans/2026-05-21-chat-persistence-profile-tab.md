# Chat Persistence + Profile Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist coach chat history in sessionStorage across tab switches, and add a Profile tab (rightmost) with a redesigned bottom nav that features an oversized Coach center button.

**Architecture:** A `usePersistentChat` hook wraps `useChat`, reading/writing sessionStorage on mount/message-change. The `GET /api/user` route is extended to return `name` and `createdAt`. A new `/profile` page fetches from `/api/user` and `/api/progress`. `BottomNav` is updated to 5 items with Coach rendered as a filled primary circle.

**Tech Stack:** Next.js 15 App Router, `@ai-sdk/react` (`useChat`), `next-auth/react` (`useSession`), Tailwind CSS v3, Vitest + React Testing Library

---

## File Map

| File | Action | What changes |
|---|---|---|
| `lib/hooks/usePersistentChat.ts` | Create | Wraps `useChat` with sessionStorage persistence |
| `lib/__tests__/usePersistentChat.test.tsx` | Create | Unit tests for the hook |
| `app/(app)/coach/page.tsx` | Modify | Swap `useChat` → `usePersistentChat` |
| `app/api/user/route.ts` | Modify | Add `name` + `createdAt` to GET response |
| `app/(app)/profile/page.tsx` | Create | Profile page (name, email, streak, member since, settings link) |
| `components/BottomNav.tsx` | Modify | 5 items, Coach center oversized, add Profile + PersonIcon |
| `app/(app)/page.tsx` | Modify | Remove gear icon + settings Link |

---

## Task 1: `usePersistentChat` Hook

**Files:**
- Create: `lib/hooks/usePersistentChat.ts`
- Create: `lib/__tests__/usePersistentChat.test.tsx`
- Modify: `app/(app)/coach/page.tsx`

- [ ] **Step 1: Write failing tests**

Create `lib/__tests__/usePersistentChat.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock @ai-sdk/react so we control the messages array
vi.mock('@ai-sdk/react', () => ({
  useChat: vi.fn(({ initialMessages }: { initialMessages?: unknown[] }) => ({
    messages: initialMessages ?? [],
    sendMessage: vi.fn(),
    status: 'idle' as const,
  })),
}));

import { usePersistentChat } from '../hooks/usePersistentChat';
import { DefaultChatTransport } from 'ai';

const transport = new DefaultChatTransport({ api: '/api/coach' });

describe('usePersistentChat', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('returns empty messages when sessionStorage is empty', () => {
    const { result } = renderHook(() => usePersistentChat({ transport }));
    expect(result.current.messages).toEqual([]);
  });

  it('reads initial messages from sessionStorage', () => {
    const stored = [{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hello' }] }];
    sessionStorage.setItem('coach-messages', JSON.stringify(stored));
    const { result } = renderHook(() => usePersistentChat({ transport }));
    expect(result.current.messages).toEqual(stored);
  });

  it('handles corrupt sessionStorage gracefully', () => {
    sessionStorage.setItem('coach-messages', 'not-valid-json{{{');
    const { result } = renderHook(() => usePersistentChat({ transport }));
    expect(result.current.messages).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
$env:PATH = "C:\Program Files\nodejs;$env:PATH"
npx vitest run lib/__tests__/usePersistentChat.test.tsx
```

Expected: FAIL — `usePersistentChat` not found.

- [ ] **Step 3: Implement the hook**

Create `lib/hooks/usePersistentChat.ts`:

```typescript
'use client';
import { useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import type { UIMessage } from 'ai';

const STORAGE_KEY = 'coach-messages';

function readStoredMessages(): UIMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UIMessage[]) : [];
  } catch {
    return [];
  }
}

export function usePersistentChat(options: Parameters<typeof useChat>[0]) {
  const chat = useChat({ ...options, initialMessages: readStoredMessages() });

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(chat.messages));
    } catch {
      // sessionStorage unavailable or full — fail silently
    }
  }, [chat.messages]);

  return chat;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run lib/__tests__/usePersistentChat.test.tsx
```

Expected: PASS (3 tests).

- [ ] **Step 5: Update coach page to use the hook**

In `app/(app)/coach/page.tsx`, make two changes:

Replace the import:
```typescript
// Before:
import { useChat } from '@ai-sdk/react';

// After:
import { usePersistentChat } from '@/lib/hooks/usePersistentChat';
```

Replace the hook call:
```typescript
// Before:
const { messages, sendMessage, status } = useChat({
  transport: new DefaultChatTransport({ api: '/api/coach' }),
});

// After:
const { messages, sendMessage, status } = usePersistentChat({
  transport: new DefaultChatTransport({ api: '/api/coach' }),
});
```

- [ ] **Step 6: Run full test suite**

```bash
npx vitest run
```

Expected: all 35 tests pass (32 existing + 3 new).

- [ ] **Step 7: Commit**

```bash
git add lib/hooks/usePersistentChat.ts lib/__tests__/usePersistentChat.test.tsx "app/(app)/coach/page.tsx"
git commit -m "feat: persist coach chat history in sessionStorage across tab switches"
```

---

## Task 2: Extend `GET /api/user`

**Files:**
- Modify: `app/api/user/route.ts`

- [ ] **Step 1: Update the GET handler**

In `app/api/user/route.ts`, replace the GET function body:

```typescript
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await db.query.users.findFirst({ where: eq(users.id, session.user.id) });
  return NextResponse.json({
    name: user?.name ?? null,
    reminderTime: user?.reminderTime ?? '09:00',
    createdAt: user?.createdAt ?? null,
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
$env:PATH = "C:\Program Files\nodejs;$env:PATH"
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Verify settings page still works**

The settings page calls `GET /api/user` and reads `d.reminderTime`. The new response still includes `reminderTime`, so no change is needed there.

- [ ] **Step 4: Commit**

```bash
git add app/api/user/route.ts
git commit -m "feat: extend GET /api/user to return name and createdAt"
```

---

## Task 3: Profile Page

**Files:**
- Create: `app/(app)/profile/page.tsx`

- [ ] **Step 1: Create the profile page**

Create `app/(app)/profile/page.tsx`:

```typescript
'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

type UserData = { name: string | null; reminderTime: string; createdAt: string | null };
type ProgressData = { streak: number };

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

const REMINDER_LABELS: Record<string, string> = {
  '07:00': '7:00 AM', '08:00': '8:00 AM', '09:00': '9:00 AM', '10:00': '10:00 AM',
  '14:00': '2:00 PM', '16:00': '4:00 PM', '18:00': '6:00 PM', '20:00': '8:00 PM',
};

export default function ProfilePage() {
  const { data: session } = useSession();
  const [user, setUser] = useState<UserData | null>(null);
  const [streak, setStreak] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/user').then((r) => r.json()).then(setUser);
    fetch('/api/progress').then((r) => r.json()).then((d: ProgressData) => setStreak(d.streak));
  }, []);

  if (!user) {
    return <div className="p-6 text-mid text-xl">Loading...</div>;
  }

  return (
    <div className="p-6 pt-10 flex flex-col gap-6 max-w-md mx-auto">
      <div>
        <p className="text-mid text-sm font-medium uppercase tracking-widest">Your account</p>
        <h1 className="font-heading text-4xl font-semibold text-dark mt-1">Profile</h1>
      </div>

      <div className="bg-surface rounded-2xl p-6 flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-heading font-semibold flex-shrink-0">
            {user.name ? user.name[0].toUpperCase() : '?'}
          </div>
          <div>
            <p className="font-heading text-2xl font-semibold text-dark">{user.name ?? '—'}</p>
            <p className="text-mid text-base">{session?.user?.email ?? '—'}</p>
          </div>
        </div>

        <div className="h-px bg-primary-light" />

        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <p className="text-dark text-lg">Current streak</p>
            <p className="font-heading text-xl font-semibold text-primary">
              {streak !== null ? `🔥 ${streak} day${streak === 1 ? '' : 's'}` : '—'}
            </p>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-dark text-lg">Daily reminder</p>
            <p className="text-mid text-lg">{REMINDER_LABELS[user.reminderTime] ?? user.reminderTime}</p>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-dark text-lg">Member since</p>
            <p className="text-mid text-lg">{formatDate(user.createdAt)}</p>
          </div>
        </div>
      </div>

      <Link
        href="/settings"
        className="w-full bg-surface border-2 border-primary-light text-primary text-xl font-semibold py-5 rounded-2xl text-center"
      >
        Settings
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manually verify in browser**

With dev server running, navigate to `http://localhost:3000/profile`.
Expected: profile card with name initial avatar, name, email, streak, reminder time, member since date, and Settings button.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/profile/page.tsx"
git commit -m "feat: add profile page with name, email, streak, and member since"
```

---

## Task 4: Nav Redesign + Home Page Cleanup

**Files:**
- Modify: `components/BottomNav.tsx`
- Modify: `app/(app)/page.tsx`

- [ ] **Step 1: Replace BottomNav**

Replace the entire contents of `components/BottomNav.tsx`:

```typescript
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavItem = {
  href: string;
  label: string;
  icon: React.FC<{ active: boolean }>;
  center?: boolean;
};

const NAV: NavItem[] = [
  { href: '/', label: 'Home', icon: HomeIcon },
  { href: '/exercises', label: 'Exercises', icon: PlayIcon },
  { href: '/coach', label: 'Coach', icon: ChatIcon, center: true },
  { href: '/progress', label: 'Progress', icon: BarIcon },
  { href: '/profile', label: 'Profile', icon: PersonIcon },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav aria-label="App navigation" className="fixed bottom-0 left-0 right-0 h-20 bg-surface border-t-2 border-primary-light flex max-w-md mx-auto z-50">
      {NAV.map(({ href, label, icon: Icon, center }) => {
        const active = path === href;
        if (center) {
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className="flex-1 flex flex-col items-center justify-center"
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${active ? 'bg-primary/90' : 'bg-primary'}`}>
                <Icon active={true} />
              </div>
            </Link>
          );
        }
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex-1 flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors relative ${active ? 'text-primary' : 'text-muted'}`}
          >
            {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-b-full" />}
            <Icon active={active} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--primary)' : 'var(--muted)'} strokeWidth="1.8" strokeLinecap="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  );
}

function PlayIcon({ active }: { active: boolean }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--primary)' : 'var(--muted)'} strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="10"/>
      <polygon points="10 8 16 12 10 16 10 8" fill={active ? 'var(--primary)' : 'var(--muted)'} stroke="none"/>
    </svg>
  );
}

function ChatIcon({ active: _ }: { active: boolean }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  );
}

function BarIcon({ active }: { active: boolean }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--primary)' : 'var(--muted)'} strokeWidth="1.8" strokeLinecap="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  );
}

function PersonIcon({ active }: { active: boolean }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--primary)' : 'var(--muted)'} strokeWidth="1.8" strokeLinecap="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}
```

- [ ] **Step 2: Remove gear icon from home page**

In `app/(app)/page.tsx`, replace the header section. The current header is:

```typescript
      <div className="flex justify-between items-start">
        <div>
          <p className="text-mid text-sm font-medium uppercase tracking-widest">
            {DAYS[now.getDay()]}, {MONTHS[now.getMonth()]} {now.getDate()}
          </p>
          <h1 className="font-heading text-4xl font-semibold text-dark mt-1 leading-tight">
            {allDone ? 'Well done!' : now.getHours() < 12 ? 'Good morning,' : now.getHours() < 17 ? 'Good afternoon,' : 'Good evening,'}
          </h1>
        </div>
        <Link href="/settings" className="w-12 h-12 rounded-full bg-surface flex items-center justify-center mt-1 flex-shrink-0">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--mid)" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
        </Link>
      </div>
```

Replace with:

```typescript
      <div>
        <p className="text-mid text-sm font-medium uppercase tracking-widest">
          {DAYS[now.getDay()]}, {MONTHS[now.getMonth()]} {now.getDate()}
        </p>
        <h1 className="font-heading text-4xl font-semibold text-dark mt-1 leading-tight">
          {allDone ? 'Well done!' : now.getHours() < 12 ? 'Good morning,' : now.getHours() < 17 ? 'Good afternoon,' : 'Good evening,'}
        </h1>
      </div>
```

Also remove the unused `Link` import from `app/(app)/page.tsx` if it is no longer used elsewhere in the file (check — `Link` is only used for the gear icon, so remove it):

```typescript
// Remove this line:
import Link from 'next/link';
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run full test suite**

```bash
npx vitest run
```

Expected: all 35 tests pass.

- [ ] **Step 5: Manually verify in browser**

With dev server running at `http://localhost:3000`:
- Bottom nav shows 5 items: Home · Exercises · (large terracotta circle) · Progress · Profile
- Tapping Coach circle navigates to `/coach`
- Active indicator strip appears on non-center items; center circle darkens slightly
- Home page no longer has gear icon in top-right
- Profile tab navigates to `/profile` correctly

- [ ] **Step 6: Commit**

```bash
git add components/BottomNav.tsx "app/(app)/page.tsx"
git commit -m "feat: redesign nav with 5 items, oversized Coach center button, and Profile tab"
```
