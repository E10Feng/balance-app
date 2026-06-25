# Senior Fitness Assessment Module — Design

**Date:** 2026-06-25
**Status:** Approved for planning

## Context

A Google Doc spec describes a much larger "Functional Fitness Assessment App" built around the Senior Fitness Test (SFT) protocol: a 7-station physical assessment battery, an overall fitness score, and a personalized daily exercise prescription system. That spec is too large for a single implementation effort and overlaps significantly with BalanceWell's existing exercise/progression system.

This document scopes **only the first sub-project**: the 7-station assessment battery, its scoring against age/sex norms, and the combined report. It deliberately excludes:

- **Exercise library expansion** (new categories, richer per-exercise metadata) — separate sub-project.
- **Prescription/integration logic** (assessment results driving daily exercise plans, reassessment scheduling, trend comparisons) — separate sub-project, depends on this one's output.

## Goals

- Let an instructor/caregiver run a participant through all 7 SFT stations on a single device, with the participant's own BalanceWell account signed in.
- Score each station against published age (60–94) × sex norms, and compute BMI and an overall 6–18 point fitness score.
- Produce a final combined report with strengths, areas for improvement, and fall-prevention recommendations.
- Persist everything to Postgres, scoped to the signed-in user, so a later phase can use assessment results to drive exercise prescription.

## Non-goals (this phase)

- No new auth role for instructors — the participant's existing session is used.
- No PDF export — "print" means a print-friendly stylesheet only.
- No reassessment-comparison UI or scheduling — the data model supports history (multiple sessions), but trend analysis is deferred.
- No AI involvement — all scoring is deterministic, pure-function logic.

## Operator model

An instructor or caregiver operates the device while the participant performs the physical tests, using the participant's own logged-in BalanceWell account. No new account type or role is introduced.

## Units

Display and data entry use metric (cm, kg) throughout, matching what instructors in Taiwan will actually have (metric tape measures, kg scales). The published SFT norm tables are calibrated in imperial units (inches, pounds) for two stations (chair sit-and-reach, back scratch); conversion to imperial happens internally, only at the point of norm-table lookup. Time-based stations (up-and-go, walk, step) need no conversion. The 6-minute-walk predicted-distance formulas already use height in cm. BMI uses the standard metric formula (kg / m²) rather than the spec's imperial variant — equivalent result, no conversion needed.

## Data model

### `users` table additions

| Column | Type | Notes |
|---|---|---|
| `sex` | text, nullable | `'male' \| 'female'` — required to select the correct norm table |
| `date_of_birth` | date, nullable | Age is computed from this at assessment time, never stored as a raw stale number |

Both fields are editable from Settings or filled in when starting a participant's first assessment.

### `assessment_session` (new table)

| Column | Type | Notes |
|---|---|---|
| `id` | text, PK | |
| `user_id` | text, FK → `user.id`, cascade delete | |
| `date_of_test` | date | |
| `status` | text | `'in_progress' \| 'completed'` |
| `height_cm` | numeric, nullable | |
| `weight_kg` | numeric, nullable | |
| `bmi` | numeric, nullable | computed |
| `bmi_category` | text, nullable | `underweight \| normal \| overweight \| obesity` |
| `overall_score` | integer, nullable | 6–18, null until all scorable stations are done |
| `overall_category` | text, nullable | `below_average \| average \| above_average` |
| `walk_test_variant` | text, nullable | `'walk' \| 'step'` — which Station 7 alternative was used |
| `created_at` | timestamp | |
| `completed_at` | timestamp, nullable | |

One row per assessment attempt. Multiple sessions per user are supported (history), even though trend comparison UI is out of scope for this phase.

### `assessment_station_result` (new table)

| Column | Type | Notes |
|---|---|---|
| `id` | text, PK | |
| `session_id` | text, FK → `assessment_session.id`, cascade delete | |
| `station` | text | `chair_stand \| arm_curl \| sit_reach \| back_scratch \| up_and_go \| walk_test \| step_test` |
| `raw_data` | jsonb | Station-specific fields: trial values, rep counts, side tested, manual-override flag, etc. Shape varies per station by design — keeps the schema modular for future stations without new tables. |
| `score` | numeric, nullable | The single normalized value used for categorization (reps, best time, best distance) |
| `category` | text, nullable | `below_average \| average \| above_average`, or null if age is outside 60–94 |
| `unit` | text | e.g. `reps`, `seconds`, `cm`, `meters` |
| `created_at` | timestamp | |

Re-entering a completed station overwrites its row for that session (instructor retry support) rather than creating a duplicate.

This table covers 6 of the spec's 7 numbered stations. **Station 3 (Height/Weight/BMI) is not a row here** — it's reported separately from the below/average/above scale, so its inputs (`height_cm`, `weight_kg`) and outputs (`bmi`, `bmi_category`) live directly on `assessment_session` instead (see above). The dashboard and routing still treat it as a 7th station UI entry (see Architecture) for a consistent instructor workflow — it just persists through a different endpoint.

## Architecture

Next.js App Router, following existing BalanceWell conventions (one Drizzle client, per-route `auth()` checks, no middleware file).

```
app/(app)/assessment/
  page.tsx                          — Dashboard: participant info, start/resume session,
                                       7-station progress grid, "View Final Report" button
  [sessionId]/station/[stationKey]/page.tsx
                                    — Station flow: Purpose/Equipment/Procedure/Safety Notes
                                       (static content) + timer/input UI for that station
  [sessionId]/report/page.tsx       — Final combined report, print-friendly

lib/assessment/
  norms.ts                          — Age-band × sex norm tables, verbatim from the spec
  units.ts                          — cm↔inches, kg↔lb conversions (only where norms require it)
  scoring.ts                        — Pure functions: computeBMI, categorizeStation,
                                       computeOverallScore
  content.ts                        — Static per-station Purpose/Equipment/Procedure/Safety text

app/api/assessment/
  sessions/route.ts                 — POST create session, GET list sessions for user
  sessions/[id]/route.ts            — GET session detail (with station results), PATCH status
  sessions/[id]/bmi/route.ts        — PUT height/weight, computes & stores bmi/bmiCategory
                                       on the session row (Station 3)
  sessions/[id]/stations/[station]/route.ts
                                    — PUT upsert a station result (save-as-you-go, Stations 1-2, 4-7)
```

The dashboard's 7-station grid maps to: Station 1 Chair Stand, Station 2 Arm Curl, Station 3 Height/Weight (BMI), Station 4 Sit-and-Reach, Station 5 Back Scratch, Station 6 Up-and-Go, Station 7 Walk/Step — matching the spec's numbering. Station 3 is the one exception that PUTs to the session-level BMI endpoint rather than the generic station-result endpoint, per the data model above.

Each station's "Complete" action immediately writes its result to the database — there is no batch submit at the end. This mirrors the existing exercise player, where `exercise_log` rows are written as each exercise completes, and protects a 20–30 minute in-person session from data loss if the tab closes or the device is interrupted.

Stations can be entered in any order from the dashboard and redone at any time; redoing overwrites that station's row (or session-level BMI fields) for the current session.

## Station flow UX

- **Dashboard**: participant name/age/sex (from profile, editable), "Start New Assessment" (creates a session) or resume an in-progress one, a 7-button grid with a done/not-done indicator per station, and "View Final Report" (disabled until all 7 stations — including the chosen Station 7 variant — are complete).
- **Station page**: static Purpose/Equipment/Procedure/Safety Notes blocks (content lifted directly from the spec), followed by the input UI for that station.
- **Shared timer component** (chair stand, arm curl, up-and-go, walk/step): "Get Ready" → 3-2-1 countdown → "Start"/"Go" → large countdown-or-count-up display + progress bar → "Stop"/"Test Complete". Rep-based stations show a large "+1" count-rep button live during the timed window.
- **Two-trial stations** (sit-and-reach, back scratch, up-and-go): Trial 1 / Trial 2 inputs, best score auto-selected. A manual override field is always available for every numeric input, per the spec.
- **Station 7 variant picker**: chosen once per session on the dashboard (6-Minute Walk or 2-Minute Step); only that variant's result counts toward the overall score.
- Safety/stop-condition text (pain, dizziness, shortness of breath) is static instructor-facing copy per station — informational only, not the AI-driven pain guardrail used in Coach Mei chat.

## Scoring logic

Pure functions, no DB access, mirroring the existing `lib/progression.ts` pattern:

- `computeBMI(weightKg, heightCm)` → `{ bmi, category }` using standard metric BMI.
- `categorizeStation(station, score, age, sex)` → `'below_average' | 'average' | 'above_average' | null`. Returns `null` when age is outside 60–94 (the spec's "Normative scoring is available only for ages 60–94" case) — the station still records its raw score, just no category.
- `computeOverallScore(stationCategories)` → `{ total, category, strengths, areasForImprovement, maintain, recommendation }`. Below Average = 1 point, Average = 2, Above Average = 3, across the 6 scored domains (BMI excluded). If any domain couldn't be categorized (age out of range), the overall score is not computed and the report flags which domains are missing.
- Fall-prevention recommendation text follows the spec's per-domain rules (chair stand → lower-body strengthening, up-and-go → balance/agility training, sit-and-reach/back-scratch → flexibility, endurance → aerobic training), plus the "multiple areas below average" combined message when applicable.

## Final report

`/assessment/[sessionId]/report` assembles: participant info, date, each station's score + category, BMI reported separately, overall score (6–18) + category with the spec's exact interpretation text, strengths/areas-for-improvement/maintain lists, fall-prevention recommendations, and the spec's required "not a medical diagnosis" disclaimer. "Save" is implicit (already persisted). "Print" uses a `@media print` stylesheet; PDF export is an explicit future item, not built now.

## Error handling

- Age outside 60–94: station records raw score, shows the spec's literal message in place of a category, excluded from the overall score; the report calls out which stations/domains couldn't be scored.
- Incomplete session: "View Final Report" stays disabled until all 7 stations (with the Station 7 variant resolved) are done.
- All numeric fields are instructor-editable at any time (manual override), per the spec's requirement on every timed/counted station.
- API routes follow existing conventions: each independently calls `auth()`, returns 401 if missing, and scopes all queries to `session.user.id`.

## Testing

- Vitest unit tests for `lib/assessment/scoring.ts` and `lib/assessment/units.ts`, mirroring `lib/__tests__/progression.test.ts`: norm-table boundary values for each station/age-band/sex combination, BMI category boundaries, the age-out-of-range path, and overall-score aggregation (including the missing-domain case).
- No E2E/browser testing in scope for this phase.

## Addendum (post-approval): missing Chair Stand / Arm Curl norms

The source spec references "previously provided" norms tables for Chair Stand and Arm Curl that were never actually included (unlike sit-and-reach, back-scratch, up-and-go, and the step test, which do have full age×sex tables inline). Decision: ship these two stations **raw-score-only** in this phase — `categorizeStation` returns `null` for them unconditionally, the same code path already used for the age-out-of-range case. Consequently, **the overall 6–18 point score cannot compute in this phase** (2 of its 6 required domains are always missing) and the report shows "Overall score unavailable — Chair Stand and Arm Curl norms not yet configured" instead of a number. No score-math rework will be needed later: adding the two norm tables to `lib/assessment/norms.ts` is sufficient to make the overall score start working.

## Open items for later phases

- Exercise library expansion (new categories, richer exercise metadata) — separate sub-project.
- Using assessment results to drive exercise prescription and starting levels — separate sub-project, depends on this one.
- Reassessment scheduling (8wk/12wk/6mo) and trend comparison UI.
- PDF export of the final report.
- Sourcing and adding Chair Stand / Arm Curl norm tables (see addendum above), which will unlock the overall fitness score.
