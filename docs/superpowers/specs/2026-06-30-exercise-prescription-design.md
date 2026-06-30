# Exercise Prescription & Daily Training System — Design

**Date:** 2026-06-30
**Status:** Approved for planning

## Context

The original Google Doc spec describes a "Personalized Exercise Prescription and Daily Training System" that uses Senior Fitness Test results to drive a Duolingo-style daily exercise program: a richer exercise library, a 3-tier dosage system per category, a structured daily workout generator, streak/completion tracking, reassessment scheduling, and trend comparison.

This is the second of the two sub-projects deferred when the assessment module (`docs/superpowers/specs/2026-06-25-senior-fitness-assessment-design.md`) was scoped — that module is complete and merged. This document covers using its output (assessment sessions, per-domain categories) to drive exercise prescription, replacing parts of BalanceWell's existing daily-plan system rather than running a second one alongside it.

## Goals

- Set each user's exercise intensity per category from their assessment results, replacing the existing 5-level daily-completion-driven progression engine.
- Expand the exercise library from 7 exercises across 3 categories to ~34 exercises across 8 categories (the assessment's 6 domains, plus warm-up and cool-down).
- Generate a structured daily workout (warm-up → strength → balance → flexibility → cardio → cool-down) that prioritizes categories where the user scored Below Average.
- Let users schedule periodic reassessment and see how they've improved since their last one.
- Keep the app fully usable without ever taking an assessment — assessment improves personalization, it isn't a gate.

## Non-goals (this phase)

- No badge/achievement system beyond the existing streak counter — open-ended game design, deferred.
- No push/email notifications for reassessment — dashboard banner only.
- No rich per-exercise content (Muscles Worked, Common Errors, separate Easier/Harder fields) — exercises keep the existing lightweight `description` + `instruction` + per-level `difficultyNotes` shape.
- No AI-generated exercise recommendations — prescription logic is deterministic, matching the assessment module's approach. (The doc itself frames AI recommendations as a future expansion, not this phase.)
- No daily auto-leveling — levels change only via reassessment.

## Data Model

### `exercises` table — category type change

`ExerciseCategory` expands from 3 values to 8:

```
'lower_body_strength' | 'upper_body_strength' | 'lower_body_flexibility' |
'upper_body_flexibility' | 'agility_balance' | 'aerobic_endurance' |
'warm_up' | 'cool_down'
```

These match the assessment's 6 domain names exactly (see `STATION_TO_DOMAIN` in `lib/assessment/scoring.ts`) plus `warm_up`/`cool_down`, which aren't assessed.

### `exercise_level` table — level range change

`level` becomes 1–3 instead of 1–5:
- 1 = Below Average dosage
- 2 = Average dosage
- 3 = Above Average dosage

Same `durationSeconds`/`reps`/`difficultyNotes` shape as today. Dosage ranges per the doc:

| Type | Level 1 | Level 2 | Level 3 |
|---|---|---|---|
| Strength (reps) | 1-2 sets, 8 reps | 2-3 sets, 10-12 reps | 3 sets, 12-15 reps |
| Balance (duration) | 10-20s | 20-30s | 30-60s |
| Cardio (duration) | 5-10 min | 10-20 min | 20-30 min |
| Flexibility (duration) | 15s hold | 20s hold | 30s hold (flexibility dosage isn't specified in the doc; using a hold-time progression consistent with the balance pattern) |
| Warm-up / Cool-down (duration) | 2 min | 3 min | 4 min (always level 2 in practice — see Prescription Engine) |

### `userCategoryLevel` (new table)

| Column | Type | Notes |
|---|---|---|
| `id` | text, PK | |
| `user_id` | text, FK → `user.id`, cascade delete | |
| `category` | text | one of the 8 `ExerciseCategory` values |
| `level` | integer | 1-3 |
| `updated_at` | timestamp | set whenever an assessment completes and recomputes this |

Composite unique constraint on `(user_id, category)`, upserted via `onConflictDoUpdate` (same atomic-upsert pattern used for `assessment_station_result`). This is the single source of truth the daily plan builder reads from — never written to by daily completions or Coach Mei.

### `users` table addition

| Column | Type | Notes |
|---|---|---|
| `reassessment_interval_weeks` | integer, nullable | `8 \| 12 \| 26 \| null` (null = off). Editable in Settings. |

### `userExercisePlan` table — unchanged shape

Same `(id, userId, exerciseId, level, scheduledDate, order)` columns. `level` now means tier 1-3. `order` reflects the daily slot position (0 = warm-up, 1-3 = strength, 4 = balance, 5 = flexibility, 6 = cardio, 7 = cool-down).

## Architecture

```
lib/prescription/
  levels.ts         — computeCategoryLevels(domainCategories): per-domain
                       below/average/above → per-category level 1-3
  daily-plan.ts      — buildDailyPlan(categoryLevels, belowAverageDomains,
                       exercisesByCategory): picks the 8-exercise daily structure

lib/assessment/
  trends.ts          — compareAssessments(previous, current): per-domain score
                       deltas, category-change labels, overall score delta

lib/seed-exercises.ts — expanded to ~34 exercises across 8 categories,
                         103 exercise_level rows (34 × 3, except warm_up/
                         cool_down which still get all 3 levels authored
                         even though only level 2 is ever assigned, for
                         schema consistency and future flexibility)
```

### Prescription Engine

`computeCategoryLevels(domains: Record<Domain, AssessmentCategory | null>)` runs once when an assessment session completes (in `app/api/assessment/sessions/[id]/route.ts`'s PATCH-to-completed handler, alongside the existing `computeOverallScore` call). Mapping: `below_average → 1`, `average → 2`, `above_average → 3`, `null` (Chair Stand/Arm Curl, unscored — see assessment module's addendum) `→ 2` (default to Average dosage since no norm-based signal exists yet). `warm_up` and `cool_down` are always set to level 2, since they aren't assessed domains. Result is upserted into `userCategoryLevel`, one row per category.

For users who've never completed an assessment, `userCategoryLevel` simply has no rows; the daily plan builder treats a missing row as level 2 (Average) — same fallback philosophy as today's `buildDefaultPlan`.

### Daily Plan Builder

`buildDailyPlan` replaces `buildDefaultPlan` in `lib/progression.ts` (the file's consecutive-completion advance/regress logic is removed entirely — levels are reassessment-only now). Picks a fixed 8-exercise structure:

- 1 warm-up
- 3 strength (split between `lower_body_strength`/`upper_body_strength`; the sub-category in the user's Below Average domains gets 2 of the 3 slots. If neither or both are Below Average, the split is 2/1 with the larger half going to `lower_body_strength` on even-numbered days of the month and `upper_body_strength` on odd-numbered days, so the tie-break is deterministic but still varies day to day)
- 1 balance (`agility_balance`)
- 1 flexibility (split similarly between `lower_body_flexibility`/`upper_body_flexibility`, weighted toward whichever is Below Average; same even/odd-day tie-break as strength when neither or both are Below Average, with `lower_body_flexibility` getting the tie-break win on even days)
- 1 cardio (`aerobic_endurance`)
- 1 cool-down

Each slot's exercise is picked at that category's assigned level deterministically (stable order — first exercise in the category's seed list, not randomized). This produces a stable day-1 plan; variety over time comes from Coach Mei swaps (see below), not from the generator re-rolling choices.

### Coach Mei Changes

- `lib/coach/system-prompt.ts`: explains the new model — each category has a fixed level set by the last assessment (or default Average), and Coach Mei can swap which specific exercise fills a slot (same category, same level) but can never change a category's level. Frames level changes as something that only happens by retaking the assessment.
- `lib/coach/tools.ts`: `update_exercise_plan`'s input schema drops support for level changes on existing entries; the tool can only substitute one exercise for another within the same category at the user's current fixed level for that category.
- `lib/coach/guardrails.ts`: `validatePlanUpdate` is simplified — instead of "clamp 1-5, max +1/day," it now rejects any proposed level that doesn't match the user's current `userCategoryLevel` value for that exercise's category, and rejects category changes (an exercise can only be swapped for another in the same category/slot).

## Reassessment & Trend Comparison

**Trigger:** `users.reassessmentIntervalWeeks` set in Settings (dropdown: 8/12/26 weeks, or "Off," default Off). The assessment dashboard (`app/(app)/assessment/page.tsx`) computes `due = latestCompletedSession.completedAt + interval`; if passed, shows a dismissible-per-session "Time for your reassessment!" banner above "Start New Assessment," linking into a new session. No push/email notification.

**Trend comparison:** `compareAssessments(previous: SessionDetail, current: SessionDetail)` in `lib/assessment/trends.ts` computes, per domain: raw score delta, unit, and a category-change label (e.g. `below_average → average`, `average → average`, `above_average → below_average`), plus an overall score delta when both sessions have one. Called from the report page when a previous completed session exists (queried via the existing `GET /api/assessment/sessions` list, picking the most recent completed session before the current one). The report page (`[sessionId]/report/page.tsx`) gains a "Compared to your last assessment" section listing these deltas (e.g. "Chair Stand: +4 reps") — this satisfies both the doc's trend-display requirement and its motivational-message idea, without separate notification infrastructure.

## Progress Dashboard (`/progress`)

- Per-exercise level bars (built for the old 1-5 system) are replaced with 8 category badges showing each category's current tier label (Below/Average/Above), sourced from `userCategoryLevel`.
- Weekly (X/7) and monthly (X/~30) completion percentages, computed from existing `session_log.completedAt` rows within the current week/month — no new tracking table needed.
- Existing streak counter (`session_log` consecutive-day count) is unchanged.

## Onboarding Nudge

`app/(app)/page.tsx` (home/dashboard): if the user has zero completed assessment sessions (checked via the existing `GET /api/assessment/sessions`), show a dismissible card above the daily plan — "Get a personalized plan — take your 10-minute fitness assessment" linking to `/assessment`. Dismissal is stored in `localStorage` (no schema change) so it doesn't reappear every visit, but does reappear in a new browser/device since it's non-blocking either way. The app remains fully usable without ever assessing (defaults to Average tier across all categories, per the Data Model section).

## Error Handling

- Missing `userCategoryLevel` row for a category → treated as level 2 (Average), same as a never-assessed user.
- Reassessment banner never blocks any action — it's purely informational, dismissible by completing or ignoring it.
- Coach Mei plan-update requests that violate the fixed-level constraint are rejected server-side (same pattern as the existing pain-keyword and level-clamp guardrails) — the Coach is told why via the tool's error response, not silently dropped.
- `compareAssessments` returns `null` deltas for any domain missing in either session (e.g. comparing against a pre-norms-fix old session) rather than throwing.

## Testing

- Vitest unit tests for `lib/prescription/levels.ts` (boundary mapping for all 3 categories × null case) and `lib/prescription/daily-plan.ts` (slot-weighting logic for below-average-domain prioritization, the 8-exercise total, deterministic exercise selection).
- Vitest unit tests for `lib/assessment/trends.ts` (delta calculation, category-change labels, missing-domain handling).
- No E2E, consistent with the assessment module's testing approach.

## Open Items for Later Phases

- Badge/achievement system.
- Push/email notifications for reassessment due-dates.
- Richer per-exercise content (Muscles Worked, Common Errors, Easier/Harder text fields).
- AI-generated exercise recommendations (explicitly framed as future work in the source doc).
- Wearable device data integration, fall-risk prediction models, PDF handouts, multi-language support (all explicitly listed as future expansion in the source doc).
