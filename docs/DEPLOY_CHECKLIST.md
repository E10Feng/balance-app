# BalanceWell Deployment Checklist

Work through these in order. Check off each item as you complete it.

---

## 1. Assets (Content)

- [ ] **Exercise animations** — provide a Lottie JSON or short video clip for each of the 6 exercises. Files go in `public/animations/exercises/<exercise-id>.json`. Exercise IDs are: `single-leg-stand`, `tandem-stand`, `heel-toe-walk`, `sit-to-stand`, `side-leg-raise`, `calf-raise`.
- [ ] **Coach Mei animations** — provide 4 Lottie JSON files for `idle`, `thinking`, `speaking`, `celebrating`. Files go in `public/animations/coach/<state>.json`.
- [ ] **App icons** — provide a square PNG logo at 512×512px (and optionally 192×192px). Files go in `public/icons/icon-512.png` and `public/icons/icon-192.png`.

---

## 2. Email (Resend)

- [ ] **Verify a sending domain** in the [Resend dashboard](https://resend.com/domains) (e.g. `mail.yourdomain.com`). This allows reminders to be sent to any user, not just your own email.
- [ ] **Update the `from` address** in `lib/reminders.ts` and `lib/auth.ts` to use your verified domain (e.g. `BalanceWell <hello@yourdomain.com>`).

---

## 3. Vercel Deployment

- [ ] **Create a Vercel project** — go to [vercel.com](https://vercel.com), click "Add New Project", and import the `balance-app` GitHub repo.
- [ ] **Add environment variables** in the Vercel project settings (Settings → Environment Variables). Add every variable from your `.env.local`:
  - `DATABASE_URL`
  - `AUTH_SECRET`
  - `AUTH_RESEND_KEY`
  - `NEXTAUTH_URL` ← set this to your Vercel production URL (e.g. `https://balance-app.vercel.app`)
  - `GOOGLE_GENERATIVE_AI_API_KEY`
  - `VAPID_PUBLIC_KEY`
  - `VAPID_PRIVATE_KEY`
  - `VAPID_EMAIL`
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
  - `CRON_SECRET`
- [ ] **Deploy** — trigger a deployment (Vercel auto-deploys on every push to `master`).
- [ ] **Verify the deployment** — open the production URL and confirm the app loads.

---

## 4. Cron Job (Reminders)

- [ ] **Add `vercel.json`** to the project root to schedule the reminder endpoint to run every minute:
  ```json
  {
    "crons": [
      {
        "path": "/api/reminders/send",
        "schedule": "* * * * *"
      }
    ]
  }
  ```
  Note: Vercel Cron requires a Pro plan for sub-hourly schedules. Hourly (`0 * * * *`) works on the free Hobby plan.
- [ ] **Redeploy** after adding `vercel.json`.

---

## 5. Post-Deployment Testing

- [ ] Sign in with your email on the production URL — confirm the magic link email arrives.
- [ ] Complete the onboarding flow (name + reminder time).
- [ ] Complete an exercise and verify the check-in screen appears.
- [ ] Send a message to Coach Mei and verify a streaming response.
- [ ] Open Settings → enable Push Notifications → grant browser permission.
- [ ] Manually trigger a reminder: `curl -X POST https://your-app.vercel.app/api/reminders/send -H "Authorization: Bearer <CRON_SECRET>"` and verify an email and/or push notification arrives.
- [ ] Open Chrome DevTools → Application → Manifest → confirm BalanceWell is installable as a PWA.

---

## 6. Optional Polish (post-launch)

- [ ] Set up a custom domain on Vercel.
- [ ] Update `NEXTAUTH_URL` and Resend `from` to the custom domain.
- [ ] Add a `user_id` index to the `push_subscription` table for performance (`npx drizzle-kit generate` + push).
- [ ] Add timezone support for reminder scheduling (currently matches UTC clock).
