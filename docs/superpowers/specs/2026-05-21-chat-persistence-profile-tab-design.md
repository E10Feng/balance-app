# Chat Persistence + Profile Tab Design

## Goal

Two improvements to the BalanceWell app:
1. Coach chat history survives tab switching within the same browser session
2. A new Profile tab (rightmost) shows the user's name, email, streak, and member since date

---

## Feature 1: Chat Persistence

### Mechanism

A custom hook `usePersistentChat` in `lib/hooks/usePersistentChat.ts` wraps `useChat` from `@ai-sdk/react`:

- On mount: reads `sessionStorage.getItem('coach-messages')`, parses the JSON, and passes the result as `initialMessages` to `useChat`
- On every `messages` update: writes `JSON.stringify(messages)` back to `sessionStorage` under the same key
- `sessionStorage` is tab-scoped — cleared automatically when the browser tab closes, matching the requested lifetime

### Files

- **Create:** `lib/hooks/usePersistentChat.ts`
- **Modify:** `app/(app)/coach/page.tsx` — swap `useChat` import for `usePersistentChat`

### Interface

```typescript
// lib/hooks/usePersistentChat.ts
export function usePersistentChat(options: Parameters<typeof useChat>[0]) {
  // reads sessionStorage on init, writes on message change
  // returns same shape as useChat
}
```

The coach page passes the same options it currently passes to `useChat` — no other changes needed.

---

## Feature 2: Nav Redesign (5 items, Coach center button)

### Layout

Left → right: **Home · Exercises · Coach · Progress · Profile**

### Coach center button

- Rendered as a `bg-primary` filled circle (~60×60px), centered vertically within the `h-20` nav bar
- Icon is white, slightly larger than the other nav icons
- No active indicator strip (the filled circle serves as its own permanent visual anchor)
- Active state: circle becomes slightly darker (`bg-primary/90`) when on `/coach`

### Other items

Unchanged sizing and active state behavior. Profile gets a person/user SVG icon.

### Files

- **Modify:** `components/BottomNav.tsx` — add Profile to NAV array, render Coach as the oversized circle variant, add PersonIcon

---

## Feature 3: Profile Page

### Route

`app/(app)/profile/page.tsx`

### Content

| Element | Source |
|---|---|
| Name (large heading) | `GET /api/user` → `name` |
| Email (read-only, muted) | Client session (`useSession`) |
| Streak ("🔥 N day streak") | `GET /api/progress` → `streak` |
| Member since (formatted date) | `GET /api/user` → `createdAt` |
| Settings button | Link to `/settings` |

The page makes two parallel fetches on mount: `GET /api/user` and `GET /api/progress`.

### API change

`GET /api/user` currently returns only `{ reminderTime }`. Extend to return `{ name, reminderTime, createdAt }`. Email comes from the client-side session via `useSession()` — no API change needed for that field.

### Home screen cleanup

Remove the gear icon link from `app/(app)/page.tsx` — Settings is now reachable via Profile → Settings button.

### Files

- **Create:** `app/(app)/profile/page.tsx`
- **Modify:** `app/api/user/route.ts` — add `name` and `createdAt` to GET response
- **Modify:** `app/(app)/page.tsx` — remove gear icon and settings Link import
- **Modify:** `components/BottomNav.tsx` — add Profile nav item (covered in Feature 2)

---

## Data Flow Summary

```
sessionStorage['coach-messages']
    ↑ write on message change
    ↓ read on mount
usePersistentChat hook → useChat → /api/coach (unchanged)

Profile page
    → GET /api/user      → { name, reminderTime, createdAt }
    → GET /api/progress  → { streak, ... }
    → useSession()       → { email }
```

---

## Out of Scope

- Syncing chat history to the database (sessionStorage lifetime is sufficient)
- Editing name/email from the profile page (Settings handles this)
- Avatar or photo upload
