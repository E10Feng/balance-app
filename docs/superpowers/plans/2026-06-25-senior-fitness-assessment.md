# Senior Fitness Assessment Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the 7-station Senior Fitness Test assessment battery (instructor-operated, results saved to the participant's BalanceWell account) with deterministic scoring against age/sex norms and a final combined report.

**Architecture:** Next.js App Router pages under `app/(app)/assessment/`, pure scoring/content logic in `lib/assessment/` (no DB access, fully unit-tested), API routes that save each station's result immediately (save-as-you-go, mirroring the existing exercise player), and two new Postgres tables plus two new `users` columns via Drizzle.

**Tech Stack:** Next.js 15 (App Router), Drizzle ORM + Neon Postgres, Vitest, Tailwind CSS v3, TypeScript.

**Reference:** Design spec at `docs/superpowers/specs/2026-06-25-senior-fitness-assessment-design.md` — read it before starting if anything below is unclear on intent.

---

## Task 1: Schema — add assessment tables and user profile fields

**Files:**
- Modify: `lib/schema.ts`

- [ ] **Step 1: Add new type exports and table imports**

At the top of `lib/schema.ts`, change the import line:

```ts
import {
  pgTable, text, integer, boolean,
  timestamp, date, primaryKey,
} from 'drizzle-orm/pg-core';
```

to:

```ts
import {
  pgTable, text, integer, boolean,
  timestamp, date, primaryKey, real, jsonb,
} from 'drizzle-orm/pg-core';
```

- [ ] **Step 2: Add `sex` and `dateOfBirth` to the `users` table**

Find the `users` table definition:

```ts
export const users = pgTable('user', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
  reminderTime: text('reminder_time').notNull().default('09:00'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

Replace it with:

```ts
export type Sex = 'male' | 'female';

export const users = pgTable('user', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
  reminderTime: text('reminder_time').notNull().default('09:00'),
  sex: text('sex').$type<Sex>(),
  dateOfBirth: date('date_of_birth'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

- [ ] **Step 3: Add assessment types and tables**

After the existing `pushSubscriptions` table definition (and before the relations block at the bottom of the file), add:

```ts
// ── Senior Fitness Assessment ────────────────────────────────
export type AssessmentStatus = 'in_progress' | 'completed';
export type AssessmentStation =
  | 'chair_stand' | 'arm_curl' | 'sit_reach' | 'back_scratch'
  | 'up_and_go' | 'walk_test' | 'step_test';
export type AssessmentCategory = 'below_average' | 'average' | 'above_average';
export type BmiCategory = 'underweight' | 'normal' | 'overweight' | 'obesity';
export type WalkTestVariant = 'walk' | 'step';

export const assessmentSessions = pgTable('assessment_session', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  dateOfTest: date('date_of_test').notNull(),
  status: text('status').$type<AssessmentStatus>().notNull().default('in_progress'),
  heightCm: real('height_cm'),
  weightKg: real('weight_kg'),
  bmi: real('bmi'),
  bmiCategory: text('bmi_category').$type<BmiCategory>(),
  overallScore: integer('overall_score'),
  overallCategory: text('overall_category').$type<AssessmentCategory>(),
  walkTestVariant: text('walk_test_variant').$type<WalkTestVariant>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});

export const assessmentStationResults = pgTable('assessment_station_result', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionId: text('session_id').notNull().references(() => assessmentSessions.id, { onDelete: 'cascade' }),
  station: text('station').$type<AssessmentStation>().notNull(),
  rawData: jsonb('raw_data').notNull(),
  score: real('score'),
  category: text('category').$type<AssessmentCategory>(),
  unit: text('unit').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

- [ ] **Step 4: Add relations**

In the relations block at the bottom of the file (after `pushSubscriptionRelations`), add:

```ts
export const assessmentSessionRelations = relations(assessmentSessions, ({ many }) => ({
  stationResults: many(assessmentStationResults),
}));

export const assessmentStationResultRelations = relations(assessmentStationResults, ({ one }) => ({
  session: one(assessmentSessions, { fields: [assessmentStationResults.sessionId], references: [assessmentSessions.id] }),
}));
```

- [ ] **Step 5: Verify the file compiles**

Run: `cd /Users/e10/balance-app && npx tsc --noEmit`
Expected: no new type errors introduced by this file (pre-existing unrelated errors, if any, are out of scope).

- [ ] **Step 6: Generate the migration**

Run: `cd /Users/e10/balance-app && npx drizzle-kit generate`
Expected: a new file appears under `drizzle/migrations/` (e.g. `0002_<name>.sql`) containing `CREATE TABLE "assessment_session"`, `CREATE TABLE "assessment_station_result"`, and `ALTER TABLE "user" ADD COLUMN "sex" ...` / `ADD COLUMN "date_of_birth" ...`.

- [ ] **Step 7: Commit**

```bash
git add lib/schema.ts drizzle/migrations/
git commit -m "feat: add assessment tables and user sex/dateOfBirth columns"
```

Note: do not run `npx drizzle-kit push` as part of this plan — that requires a live `DATABASE_URL` and is an environment-specific manual step the user runs themselves.

---

## Task 2: `lib/assessment/units.ts` — unit conversions

**Files:**
- Create: `lib/assessment/units.ts`
- Test: `lib/assessment/__tests__/units.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/assessment/__tests__/units.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { cmToInches, kgToLb } from '../units';

describe('cmToInches', () => {
  it('converts centimeters to inches', () => {
    expect(cmToInches(2.54)).toBeCloseTo(1, 5);
  });

  it('converts zero', () => {
    expect(cmToInches(0)).toBe(0);
  });

  it('converts a typical sit-and-reach measurement', () => {
    expect(cmToInches(25.4)).toBeCloseTo(10, 5);
  });
});

describe('kgToLb', () => {
  it('converts kilograms to pounds', () => {
    expect(kgToLb(1)).toBeCloseTo(2.20462, 4);
  });

  it('converts zero', () => {
    expect(kgToLb(0)).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /Users/e10/balance-app && npx vitest run lib/assessment/__tests__/units.test.ts`
Expected: FAIL — `Cannot find module '../units'`

- [ ] **Step 3: Write the implementation**

Create `lib/assessment/units.ts`:

```ts
export function cmToInches(cm: number): number {
  return cm / 2.54;
}

export function kgToLb(kg: number): number {
  return kg * 2.20462;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd /Users/e10/balance-app && npx vitest run lib/assessment/__tests__/units.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/assessment/units.ts lib/assessment/__tests__/units.test.ts
git commit -m "feat: add cm/kg unit conversion helpers for assessment scoring"
```

---

## Task 3: `lib/assessment/norms.ts` — age × sex norm tables

**Files:**
- Create: `lib/assessment/norms.ts`
- Test: `lib/assessment/__tests__/norms.test.ts`

This transcribes the norm tables from the design spec verbatim. Each table uses a single shape: a `NormBand` per 5-year age bracket with an `averageLow`/`averageHigh` boundary, plus a station-level `higherIsBetter` flag. For `higherIsBetter: true` stations, `score < averageLow` is below average and `score > averageHigh` is above average. For `higherIsBetter: false` stations (lower score is better, e.g. a faster time), `score > averageHigh` is below average and `score < averageLow` is above average.

Chair Stand and Arm Curl have **no norm tables** — the source spec referenced "previously provided" norms that were never actually included. These two stations ship raw-score-only in this phase (see `categorizeTableStation` in Task 5, which is never called for them).

- [ ] **Step 1: Write the failing test**

Create `lib/assessment/__tests__/norms.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SIT_REACH_NORMS, BACK_SCRATCH_NORMS, UP_AND_GO_NORMS, STEP_TEST_NORMS } from '../norms';

describe('norm tables', () => {
  const tables = {
    SIT_REACH_NORMS,
    BACK_SCRATCH_NORMS,
    UP_AND_GO_NORMS,
    STEP_TEST_NORMS,
  };

  for (const [name, table] of Object.entries(tables)) {
    it(`${name} has 7 age bands for men and women covering 60-94`, () => {
      expect(table.men).toHaveLength(7);
      expect(table.women).toHaveLength(7);
      expect(table.men[0].ageMin).toBe(60);
      expect(table.men[table.men.length - 1].ageMax).toBe(94);
      expect(table.women[0].ageMin).toBe(60);
      expect(table.women[table.women.length - 1].ageMax).toBe(94);
    });

    it(`${name} age bands are contiguous with no gaps`, () => {
      for (const bands of [table.men, table.women]) {
        for (let i = 1; i < bands.length; i++) {
          expect(bands[i].ageMin).toBe(bands[i - 1].ageMax + 1);
        }
      }
    });
  }

  it('SIT_REACH_NORMS is higher-is-better', () => {
    expect(SIT_REACH_NORMS.higherIsBetter).toBe(true);
  });

  it('BACK_SCRATCH_NORMS is lower-is-better', () => {
    expect(BACK_SCRATCH_NORMS.higherIsBetter).toBe(false);
  });

  it('UP_AND_GO_NORMS is lower-is-better', () => {
    expect(UP_AND_GO_NORMS.higherIsBetter).toBe(false);
  });

  it('STEP_TEST_NORMS is higher-is-better', () => {
    expect(STEP_TEST_NORMS.higherIsBetter).toBe(true);
  });

  it('matches a known SIT_REACH_NORMS value (men 65-69)', () => {
    const band = SIT_REACH_NORMS.men.find((b) => b.ageMin === 65);
    expect(band).toEqual({ ageMin: 65, ageMax: 69, averageLow: -3.0, averageHigh: 3.0 });
  });

  it('matches a known STEP_TEST_NORMS value (women 80-84)', () => {
    const band = STEP_TEST_NORMS.women.find((b) => b.ageMin === 80);
    expect(band).toEqual({ ageMin: 80, ageMax: 84, averageLow: 60, averageHigh: 91 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /Users/e10/balance-app && npx vitest run lib/assessment/__tests__/norms.test.ts`
Expected: FAIL — `Cannot find module '../norms'`

- [ ] **Step 3: Write the implementation**

Create `lib/assessment/norms.ts`:

```ts
export type NormBand = {
  ageMin: number;
  ageMax: number;
  averageLow: number;
  averageHigh: number;
};

export type NormTable = {
  higherIsBetter: boolean;
  men: NormBand[];
  women: NormBand[];
};

// Chair Sit and Reach Test (inches). Higher (more positive reach) is better.
export const SIT_REACH_NORMS: NormTable = {
  higherIsBetter: true,
  men: [
    { ageMin: 60, ageMax: 64, averageLow: -2.5, averageHigh: 4.0 },
    { ageMin: 65, ageMax: 69, averageLow: -3.0, averageHigh: 3.0 },
    { ageMin: 70, ageMax: 74, averageLow: -3.5, averageHigh: 2.5 },
    { ageMin: 75, ageMax: 79, averageLow: -4.0, averageHigh: 2.0 },
    { ageMin: 80, ageMax: 84, averageLow: -5.5, averageHigh: 1.5 },
    { ageMin: 85, ageMax: 89, averageLow: -5.5, averageHigh: 0.5 },
    { ageMin: 90, ageMax: 94, averageLow: -6.5, averageHigh: -0.5 },
  ],
  women: [
    { ageMin: 60, ageMax: 64, averageLow: -0.5, averageHigh: 5.0 },
    { ageMin: 65, ageMax: 69, averageLow: -0.5, averageHigh: 4.5 },
    { ageMin: 70, ageMax: 74, averageLow: -1.0, averageHigh: 4.0 },
    { ageMin: 75, ageMax: 79, averageLow: -1.5, averageHigh: 3.5 },
    { ageMin: 80, ageMax: 84, averageLow: -2.0, averageHigh: 3.0 },
    { ageMin: 85, ageMax: 89, averageLow: -2.5, averageHigh: 2.5 },
    { ageMin: 90, ageMax: 94, averageLow: -4.5, averageHigh: 1.0 },
  ],
};

// Back Scratch Test (inches). Lower (smaller or more negative gap) is better.
export const BACK_SCRATCH_NORMS: NormTable = {
  higherIsBetter: false,
  men: [
    { ageMin: 60, ageMax: 64, averageLow: 0, averageHigh: 6.5 },
    { ageMin: 65, ageMax: 69, averageLow: -1.0, averageHigh: 7.5 },
    { ageMin: 70, ageMax: 74, averageLow: -1.0, averageHigh: 8.0 },
    { ageMin: 75, ageMax: 79, averageLow: -2.0, averageHigh: 9.0 },
    { ageMin: 80, ageMax: 84, averageLow: -2.0, averageHigh: 9.5 },
    { ageMin: 85, ageMax: 89, averageLow: -3.0, averageHigh: 10.0 },
    { ageMin: 90, ageMax: 94, averageLow: -4.0, averageHigh: 10.5 },
  ],
  women: [
    { ageMin: 60, ageMax: 64, averageLow: 1.5, averageHigh: 3.0 },
    { ageMin: 65, ageMax: 69, averageLow: 1.5, averageHigh: 3.5 },
    { ageMin: 70, ageMax: 74, averageLow: 1.0, averageHigh: 4.0 },
    { ageMin: 75, ageMax: 79, averageLow: 0.5, averageHigh: 5.0 },
    { ageMin: 80, ageMax: 84, averageLow: 0, averageHigh: 5.5 },
    { ageMin: 85, ageMax: 89, averageLow: -1.0, averageHigh: 7.0 },
    { ageMin: 90, ageMax: 94, averageLow: -1.0, averageHigh: 8.0 },
  ],
};

// 8-Foot Up and Go Test (seconds). Lower (faster) is better.
export const UP_AND_GO_NORMS: NormTable = {
  higherIsBetter: false,
  men: [
    { ageMin: 60, ageMax: 64, averageLow: 3.8, averageHigh: 5.6 },
    { ageMin: 65, ageMax: 69, averageLow: 4.3, averageHigh: 5.7 },
    { ageMin: 70, ageMax: 74, averageLow: 4.2, averageHigh: 6.0 },
    { ageMin: 75, ageMax: 79, averageLow: 4.6, averageHigh: 7.2 },
    { ageMin: 80, ageMax: 84, averageLow: 5.2, averageHigh: 7.6 },
    { ageMin: 85, ageMax: 89, averageLow: 5.3, averageHigh: 8.9 },
    { ageMin: 90, ageMax: 94, averageLow: 6.2, averageHigh: 10.0 },
  ],
  women: [
    { ageMin: 60, ageMax: 64, averageLow: 4.4, averageHigh: 6.0 },
    { ageMin: 65, ageMax: 69, averageLow: 4.8, averageHigh: 6.4 },
    { ageMin: 70, ageMax: 74, averageLow: 4.9, averageHigh: 7.1 },
    { ageMin: 75, ageMax: 79, averageLow: 5.2, averageHigh: 7.4 },
    { ageMin: 80, ageMax: 84, averageLow: 5.7, averageHigh: 8.7 },
    { ageMin: 85, ageMax: 89, averageLow: 6.2, averageHigh: 9.6 },
    { ageMin: 90, ageMax: 94, averageLow: 7.3, averageHigh: 11.5 },
  ],
};

// 2-Minute Step in Place Test (right-knee rep count). Higher is better.
// Note: the source spec's men 65-69 row reads "Below < 87, Average 86 to 116" —
// an off-by-one inconsistency in the published table itself. Transcribed as
// averageLow: 87 (matching the stated "Below" boundary) to keep the band contiguous
// with the 60-64 row's averageHigh of 115.
export const STEP_TEST_NORMS: NormTable = {
  higherIsBetter: true,
  men: [
    { ageMin: 60, ageMax: 64, averageLow: 87, averageHigh: 115 },
    { ageMin: 65, ageMax: 69, averageLow: 87, averageHigh: 116 },
    { ageMin: 70, ageMax: 74, averageLow: 80, averageHigh: 110 },
    { ageMin: 75, ageMax: 79, averageLow: 73, averageHigh: 109 },
    { ageMin: 80, ageMax: 84, averageLow: 71, averageHigh: 103 },
    { ageMin: 85, ageMax: 89, averageLow: 59, averageHigh: 91 },
    { ageMin: 90, ageMax: 94, averageLow: 52, averageHigh: 86 },
  ],
  women: [
    { ageMin: 60, ageMax: 64, averageLow: 75, averageHigh: 107 },
    { ageMin: 65, ageMax: 69, averageLow: 73, averageHigh: 107 },
    { ageMin: 70, ageMax: 74, averageLow: 68, averageHigh: 101 },
    { ageMin: 75, ageMax: 79, averageLow: 68, averageHigh: 100 },
    { ageMin: 80, ageMax: 84, averageLow: 60, averageHigh: 91 },
    { ageMin: 85, ageMax: 89, averageLow: 55, averageHigh: 85 },
    { ageMin: 90, ageMax: 94, averageLow: 44, averageHigh: 72 },
  ],
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd /Users/e10/balance-app && npx vitest run lib/assessment/__tests__/norms.test.ts`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add lib/assessment/norms.ts lib/assessment/__tests__/norms.test.ts
git commit -m "feat: add age/sex norm tables for sit-reach, back-scratch, up-and-go, step test"
```

---

## Task 4: `lib/assessment/scoring.ts` — `computeBMI`

**Files:**
- Create: `lib/assessment/scoring.ts`
- Test: `lib/assessment/__tests__/scoring.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/assessment/__tests__/scoring.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeBMI } from '../scoring';

describe('computeBMI', () => {
  it('computes a normal-weight BMI', () => {
    const result = computeBMI(70, 175);
    expect(result.bmi).toBeCloseTo(22.9, 1);
    expect(result.category).toBe('normal');
  });

  it('categorizes underweight below 18.5', () => {
    expect(computeBMI(45, 170).category).toBe('underweight');
  });

  it('categorizes normal at the 18.5 boundary', () => {
    const result = computeBMI(18.5 * 1.7 * 1.7, 170);
    expect(result.category).toBe('normal');
  });

  it('categorizes overweight at 25 and above', () => {
    const result = computeBMI(25 * 1.7 * 1.7, 170);
    expect(result.category).toBe('overweight');
  });

  it('categorizes overweight just under 30', () => {
    const result = computeBMI(29.9 * 1.7 * 1.7, 170);
    expect(result.category).toBe('overweight');
  });

  it('categorizes obesity at 30 and above', () => {
    const result = computeBMI(30 * 1.7 * 1.7, 170);
    expect(result.category).toBe('obesity');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /Users/e10/balance-app && npx vitest run lib/assessment/__tests__/scoring.test.ts`
Expected: FAIL — `Cannot find module '../scoring'`

- [ ] **Step 3: Write the implementation**

Create `lib/assessment/scoring.ts`:

```ts
import type { BmiCategory } from '@/lib/schema';

export function computeBMI(weightKg: number, heightCm: number): { bmi: number; category: BmiCategory } {
  const heightM = heightCm / 100;
  const bmi = Math.round((weightKg / (heightM * heightM)) * 10) / 10;
  let category: BmiCategory;
  if (bmi < 18.5) category = 'underweight';
  else if (bmi < 25) category = 'normal';
  else if (bmi < 30) category = 'overweight';
  else category = 'obesity';
  return { bmi, category };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd /Users/e10/balance-app && npx vitest run lib/assessment/__tests__/scoring.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/assessment/scoring.ts lib/assessment/__tests__/scoring.test.ts
git commit -m "feat: add BMI computation for assessment module"
```

---

## Task 5: `lib/assessment/scoring.ts` — `categorizeTableStation` and `categorizeWalkTest`

**Files:**
- Modify: `lib/assessment/scoring.ts`
- Modify: `lib/assessment/__tests__/scoring.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `lib/assessment/__tests__/scoring.test.ts`:

```ts
import { categorizeTableStation, categorizeWalkTest, predictedWalkDistance } from '../scoring';

describe('categorizeTableStation', () => {
  it('categorizes below average for a higher-is-better station (sit_reach)', () => {
    expect(categorizeTableStation('sit_reach', -5, 65, 'male')).toBe('below_average');
  });

  it('categorizes average for a higher-is-better station (sit_reach)', () => {
    expect(categorizeTableStation('sit_reach', 0, 65, 'male')).toBe('average');
  });

  it('categorizes above average for a higher-is-better station (sit_reach)', () => {
    expect(categorizeTableStation('sit_reach', 5, 65, 'male')).toBe('above_average');
  });

  it('categorizes below average for a lower-is-better station (up_and_go)', () => {
    expect(categorizeTableStation('up_and_go', 10, 65, 'female')).toBe('below_average');
  });

  it('categorizes above average for a lower-is-better station (up_and_go)', () => {
    expect(categorizeTableStation('up_and_go', 2, 65, 'female')).toBe('above_average');
  });

  it('uses the women table for back_scratch', () => {
    expect(categorizeTableStation('back_scratch', 2, 60, 'female')).toBe('average');
  });

  it('returns null when age is below 60', () => {
    expect(categorizeTableStation('sit_reach', 0, 59, 'male')).toBeNull();
  });

  it('returns null when age is above 94', () => {
    expect(categorizeTableStation('sit_reach', 0, 95, 'male')).toBeNull();
  });

  it('categorizes a step_test value at the top age band', () => {
    expect(categorizeTableStation('step_test', 90, 92, 'male')).toBe('above_average');
  });
});

describe('predictedWalkDistance', () => {
  it('computes the men formula', () => {
    expect(predictedWalkDistance(70, 'male', 170)).toBeCloseTo(867 - 5.71 * 70 + 1.03 * 170, 5);
  });

  it('computes the women formula using bmi', () => {
    expect(predictedWalkDistance(70, 'female', 160, 24)).toBeCloseTo(525 - 2.86 * 70 + 2.71 * 160 - 6.22 * 24, 5);
  });
});

describe('categorizeWalkTest', () => {
  it('categorizes above average when actual exceeds predicted by more than 10%', () => {
    const predicted = predictedWalkDistance(70, 'male', 170);
    expect(categorizeWalkTest(predicted * 1.2, 70, 'male', 170)).toBe('above_average');
  });

  it('categorizes average when actual is within 10% of predicted', () => {
    const predicted = predictedWalkDistance(70, 'male', 170);
    expect(categorizeWalkTest(predicted, 70, 'male', 170)).toBe('average');
  });

  it('categorizes below average when actual is more than 10% under predicted', () => {
    const predicted = predictedWalkDistance(70, 'male', 170);
    expect(categorizeWalkTest(predicted * 0.8, 70, 'male', 170)).toBe('below_average');
  });

  it('returns null when age is outside 60-94', () => {
    expect(categorizeWalkTest(500, 50, 'male', 170)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd /Users/e10/balance-app && npx vitest run lib/assessment/__tests__/scoring.test.ts`
Expected: FAIL — `categorizeTableStation is not a function` (and similar for the other two)

- [ ] **Step 3: Write the implementation**

Append to `lib/assessment/scoring.ts`:

```ts
import type { Sex } from '@/lib/schema';
import { SIT_REACH_NORMS, BACK_SCRATCH_NORMS, UP_AND_GO_NORMS, STEP_TEST_NORMS, type NormTable } from './norms';

export type AssessmentCategory = 'below_average' | 'average' | 'above_average';
export type TableStation = 'sit_reach' | 'back_scratch' | 'up_and_go' | 'step_test';

const TABLES: Record<TableStation, NormTable> = {
  sit_reach: SIT_REACH_NORMS,
  back_scratch: BACK_SCRATCH_NORMS,
  up_and_go: UP_AND_GO_NORMS,
  step_test: STEP_TEST_NORMS,
};

export function categorizeTableStation(
  station: TableStation,
  score: number,
  age: number,
  sex: Sex
): AssessmentCategory | null {
  const table = TABLES[station];
  const bands = sex === 'male' ? table.men : table.women;
  const band = bands.find((b) => age >= b.ageMin && age <= b.ageMax);
  if (!band) return null;

  if (table.higherIsBetter) {
    if (score < band.averageLow) return 'below_average';
    if (score > band.averageHigh) return 'above_average';
    return 'average';
  }
  if (score > band.averageHigh) return 'below_average';
  if (score < band.averageLow) return 'above_average';
  return 'average';
}

export function predictedWalkDistance(age: number, sex: Sex, heightCm: number, bmi = 0): number {
  return sex === 'male'
    ? 867 - 5.71 * age + 1.03 * heightCm
    : 525 - 2.86 * age + 2.71 * heightCm - 6.22 * bmi;
}

export function categorizeWalkTest(
  actualMeters: number,
  age: number,
  sex: Sex,
  heightCm: number,
  bmi = 0
): AssessmentCategory | null {
  if (age < 60 || age > 94) return null;
  const predicted = predictedWalkDistance(age, sex, heightCm, bmi);
  const diffRatio = (actualMeters - predicted) / predicted;
  if (diffRatio > 0.1) return 'above_average';
  if (diffRatio < -0.1) return 'below_average';
  return 'average';
}
```

Note: `categorizeTableStation` is only ever called for `sit_reach`, `back_scratch`, `up_and_go`, and `step_test`. Chair Stand and Arm Curl have no norm tables (Task 3) and their category is always set to `null` directly at the call site (Task 9) — never routed through this function.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd /Users/e10/balance-app && npx vitest run lib/assessment/__tests__/scoring.test.ts`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add lib/assessment/scoring.ts lib/assessment/__tests__/scoring.test.ts
git commit -m "feat: add table-based and walk-test categorization to assessment scoring"
```

---

## Task 6: `lib/assessment/scoring.ts` — `computeOverallScore`

**Files:**
- Modify: `lib/assessment/scoring.ts`
- Modify: `lib/assessment/__tests__/scoring.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `lib/assessment/__tests__/scoring.test.ts`:

```ts
import { computeOverallScore, type DomainCategories } from '../scoring';

describe('computeOverallScore', () => {
  it('returns null total when any domain is missing (Chair Stand/Arm Curl unscored)', () => {
    const domains: DomainCategories = {
      lower_body_strength: null,
      upper_body_strength: null,
      lower_body_flexibility: 'average',
      upper_body_flexibility: 'average',
      agility_balance: 'average',
      aerobic_endurance: 'average',
    };
    const result = computeOverallScore(domains);
    expect(result.total).toBeNull();
    expect(result.overallCategory).toBeNull();
    expect(result.missingDomains).toEqual(['lower_body_strength', 'upper_body_strength']);
  });

  it('computes a below-average total (6-9) when all domains are below average', () => {
    const domains: DomainCategories = {
      lower_body_strength: 'below_average',
      upper_body_strength: 'below_average',
      lower_body_flexibility: 'below_average',
      upper_body_flexibility: 'below_average',
      agility_balance: 'below_average',
      aerobic_endurance: 'below_average',
    };
    const result = computeOverallScore(domains);
    expect(result.total).toBe(6);
    expect(result.overallCategory).toBe('below_average');
  });

  it('computes an average total (10-14)', () => {
    const domains: DomainCategories = {
      lower_body_strength: 'average',
      upper_body_strength: 'average',
      lower_body_flexibility: 'average',
      upper_body_flexibility: 'average',
      agility_balance: 'average',
      aerobic_endurance: 'average',
    };
    const result = computeOverallScore(domains);
    expect(result.total).toBe(12);
    expect(result.overallCategory).toBe('average');
  });

  it('computes an above-average total (15-18)', () => {
    const domains: DomainCategories = {
      lower_body_strength: 'above_average',
      upper_body_strength: 'above_average',
      lower_body_flexibility: 'above_average',
      upper_body_flexibility: 'above_average',
      agility_balance: 'above_average',
      aerobic_endurance: 'above_average',
    };
    const result = computeOverallScore(domains);
    expect(result.total).toBe(18);
    expect(result.overallCategory).toBe('above_average');
  });

  it('sorts domains into strengths/maintain/areasForImprovement', () => {
    const domains: DomainCategories = {
      lower_body_strength: 'above_average',
      upper_body_strength: 'average',
      lower_body_flexibility: 'below_average',
      upper_body_flexibility: 'average',
      agility_balance: 'below_average',
      aerobic_endurance: 'above_average',
    };
    const result = computeOverallScore(domains);
    expect(result.strengths).toEqual(['lower_body_strength', 'aerobic_endurance']);
    expect(result.maintain).toEqual(['upper_body_strength', 'upper_body_flexibility']);
    expect(result.areasForImprovement).toEqual(['lower_body_flexibility', 'agility_balance']);
  });

  it('recommends lower-body strengthening when chair stand is below average', () => {
    const domains: DomainCategories = {
      lower_body_strength: 'below_average',
      upper_body_strength: 'average',
      lower_body_flexibility: 'average',
      upper_body_flexibility: 'average',
      agility_balance: 'average',
      aerobic_endurance: 'average',
    };
    expect(computeOverallScore(domains).recommendations).toContain('Recommend lower-body strengthening.');
  });

  it('recommends balance/agility training when up-and-go is below average', () => {
    const domains: DomainCategories = {
      lower_body_strength: 'average',
      upper_body_strength: 'average',
      lower_body_flexibility: 'average',
      upper_body_flexibility: 'average',
      agility_balance: 'below_average',
      aerobic_endurance: 'average',
    };
    expect(computeOverallScore(domains).recommendations).toContain('Recommend balance and agility training.');
  });

  it('recommends flexibility work when either flexibility domain is below average', () => {
    const domains: DomainCategories = {
      lower_body_strength: 'average',
      upper_body_strength: 'average',
      lower_body_flexibility: 'average',
      upper_body_flexibility: 'below_average',
      agility_balance: 'average',
      aerobic_endurance: 'average',
    };
    expect(computeOverallScore(domains).recommendations).toContain('Recommend flexibility and mobility exercises.');
  });

  it('recommends aerobic training when endurance is below average', () => {
    const domains: DomainCategories = {
      lower_body_strength: 'average',
      upper_body_strength: 'average',
      lower_body_flexibility: 'average',
      upper_body_flexibility: 'average',
      agility_balance: 'average',
      aerobic_endurance: 'below_average',
    };
    expect(computeOverallScore(domains).recommendations).toContain(
      'Recommend aerobic endurance training such as walking or step-in-place progression.'
    );
  });

  it('adds a combined message when 2+ domains are below average', () => {
    const domains: DomainCategories = {
      lower_body_strength: 'below_average',
      upper_body_strength: 'below_average',
      lower_body_flexibility: 'average',
      upper_body_flexibility: 'average',
      agility_balance: 'average',
      aerobic_endurance: 'average',
    };
    expect(computeOverallScore(domains).recommendations).toContain(
      'Multiple areas were below average. A comprehensive fall-prevention program may be beneficial.'
    );
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd /Users/e10/balance-app && npx vitest run lib/assessment/__tests__/scoring.test.ts`
Expected: FAIL — `computeOverallScore is not a function`

- [ ] **Step 3: Write the implementation**

Append to `lib/assessment/scoring.ts`:

```ts
export type Domain =
  | 'lower_body_strength'
  | 'upper_body_strength'
  | 'lower_body_flexibility'
  | 'upper_body_flexibility'
  | 'agility_balance'
  | 'aerobic_endurance';

export type DomainCategories = Record<Domain, AssessmentCategory | null>;

export type OverallResult = {
  total: number | null;
  overallCategory: AssessmentCategory | null;
  missingDomains: Domain[];
  strengths: Domain[];
  maintain: Domain[];
  areasForImprovement: Domain[];
  recommendations: string[];
};

const ALL_DOMAINS: Domain[] = [
  'lower_body_strength',
  'upper_body_strength',
  'lower_body_flexibility',
  'upper_body_flexibility',
  'agility_balance',
  'aerobic_endurance',
];

const DOMAIN_POINTS: Record<AssessmentCategory, number> = {
  below_average: 1,
  average: 2,
  above_average: 3,
};

export function computeOverallScore(domains: DomainCategories): OverallResult {
  const missingDomains = ALL_DOMAINS.filter((d) => domains[d] === null);
  const strengths = ALL_DOMAINS.filter((d) => domains[d] === 'above_average');
  const maintain = ALL_DOMAINS.filter((d) => domains[d] === 'average');
  const areasForImprovement = ALL_DOMAINS.filter((d) => domains[d] === 'below_average');

  let total: number | null = null;
  let overallCategory: AssessmentCategory | null = null;
  if (missingDomains.length === 0) {
    total = ALL_DOMAINS.reduce((sum, d) => sum + DOMAIN_POINTS[domains[d] as AssessmentCategory], 0);
    if (total <= 9) overallCategory = 'below_average';
    else if (total <= 14) overallCategory = 'average';
    else overallCategory = 'above_average';
  }

  const recommendations: string[] = [];
  if (domains.lower_body_strength === 'below_average') {
    recommendations.push('Recommend lower-body strengthening.');
  }
  if (domains.agility_balance === 'below_average') {
    recommendations.push('Recommend balance and agility training.');
  }
  if (domains.lower_body_flexibility === 'below_average' || domains.upper_body_flexibility === 'below_average') {
    recommendations.push('Recommend flexibility and mobility exercises.');
  }
  if (domains.aerobic_endurance === 'below_average') {
    recommendations.push('Recommend aerobic endurance training such as walking or step-in-place progression.');
  }
  if (areasForImprovement.length >= 2) {
    recommendations.push('Multiple areas were below average. A comprehensive fall-prevention program may be beneficial.');
  }

  return { total, overallCategory, missingDomains, strengths, maintain, areasForImprovement, recommendations };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd /Users/e10/balance-app && npx vitest run lib/assessment/__tests__/scoring.test.ts`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add lib/assessment/scoring.ts lib/assessment/__tests__/scoring.test.ts
git commit -m "feat: add overall fitness score aggregation to assessment scoring"
```

---

## Task 7: `lib/assessment/content.ts` — static per-station instructor content

**Files:**
- Create: `lib/assessment/content.ts`
- Test: `lib/assessment/__tests__/content.test.ts`

The dashboard shows 7 station slots. `StationRouteKey` is the UI routing key (7 values, one per dashboard button) — distinct from the `AssessmentStation` DB enum (Task 1), because `height_weight` doesn't write a station-result row (it writes to `assessment_session` BMI fields, Task 11) and `walk_step` resolves to either the `walk_test` or `step_test` DB station depending on which variant the instructor picked for the session.

- [ ] **Step 1: Write the failing test**

Create `lib/assessment/__tests__/content.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { STATION_CONTENT, getStationContent } from '../content';

describe('STATION_CONTENT', () => {
  it('has one entry for each of the 6 non-endurance station slots', () => {
    expect(STATION_CONTENT).toHaveLength(6);
  });

  it('every entry has non-empty purpose, equipment, procedure, and safety notes', () => {
    for (const content of STATION_CONTENT) {
      expect(content.purpose.length).toBeGreaterThan(0);
      expect(content.equipment.length).toBeGreaterThan(0);
      expect(content.procedure.length).toBeGreaterThan(0);
      expect(content.safetyNotes.length).toBeGreaterThan(0);
    }
  });

  it('station numbers run 1 through 6 with no duplicates', () => {
    const numbers = STATION_CONTENT.map((c) => c.stationNumber).sort((a, b) => a - b);
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('getStationContent', () => {
  it('returns content for a regular station key', () => {
    expect(getStationContent('chair_stand').title).toBe('Chair Stand Test');
  });

  it('returns the 6-minute walk content for walk_step with variant "walk"', () => {
    expect(getStationContent('walk_step', 'walk').title).toBe('6-Minute Walk Test');
  });

  it('returns the 2-minute step content for walk_step with variant "step"', () => {
    expect(getStationContent('walk_step', 'step').title).toBe('2-Minute Step in Place Test');
  });

  it('defaults walk_step to the walk variant when none is given', () => {
    expect(getStationContent('walk_step').title).toBe('6-Minute Walk Test');
  });

  it('both endurance variants are tagged as station 7', () => {
    expect(getStationContent('walk_step', 'walk').stationNumber).toBe(7);
    expect(getStationContent('walk_step', 'step').stationNumber).toBe(7);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /Users/e10/balance-app && npx vitest run lib/assessment/__tests__/content.test.ts`
Expected: FAIL — `Cannot find module '../content'`

- [ ] **Step 3: Write the implementation**

Create `lib/assessment/content.ts`:

```ts
export type StationRouteKey =
  | 'chair_stand' | 'arm_curl' | 'height_weight'
  | 'sit_reach' | 'back_scratch' | 'up_and_go' | 'walk_step';

export type StationContent = {
  key: StationRouteKey;
  stationNumber: number;
  title: string;
  purpose: string;
  equipment: string[];
  procedure: string;
  safetyNotes: string[];
};

const GENERIC_STOP_CONDITION =
  'Stop immediately if you experience pain, dizziness, shortness of breath, or discomfort.';

export const STATION_CONTENT: StationContent[] = [
  {
    key: 'chair_stand',
    stationNumber: 1,
    title: 'Chair Stand Test',
    purpose: 'Measure lower-body strength.',
    equipment: ['Straight-back chair, 17 inches', 'Stopwatch or built-in timer'],
    procedure:
      'Participant sits in the middle of the chair, feet shoulder-width apart, feet flat on the floor. ' +
      'Arms are crossed at the wrists and held close to the chest. On "Go," participant stands completely ' +
      'up and sits completely down as many times as possible in 30 seconds.',
    safetyNotes: [GENERIC_STOP_CONDITION],
  },
  {
    key: 'arm_curl',
    stationNumber: 2,
    title: 'Arm Curl Test',
    purpose: 'Measure upper-body strength.',
    equipment: ['Chair without armrests', '5 lb weight for women', '8 lb weight for men', 'Stopwatch or built-in timer'],
    procedure:
      'Participant sits in a chair and uses the dominant or stronger arm. They hold the weight using a ' +
      'suitcase grip with palm facing the body. The arm starts straight down beside the chair. The upper ' +
      'arm stays stable against the body. The participant curls the arm through full range of motion, ' +
      'turning the palm up, then lowers the arm back to the starting position.',
    safetyNotes: ['The upper arm must stay stable and should not swing.', GENERIC_STOP_CONDITION],
  },
  {
    key: 'height_weight',
    stationNumber: 3,
    title: 'Height and Weight (BMI)',
    purpose: 'Assess Body Mass Index.',
    equipment: ['Scale', 'Tape measure or stadiometer'],
    procedure: 'Measure height and weight using a stable scale and tape measure.',
    safetyNotes: [GENERIC_STOP_CONDITION],
  },
  {
    key: 'sit_reach',
    stationNumber: 4,
    title: 'Chair Sit and Reach Test',
    purpose: 'Assess lower-body flexibility, primarily hamstring flexibility.',
    equipment: ['Folding chair, 17 inches, placed against wall', '18-inch ruler'],
    procedure:
      'Participant sits on edge of chair. One foot stays flat on the floor. The other leg is extended ' +
      'forward with knee straight, heel on floor, and ankle at 90 degrees. Participant places one hand on ' +
      'top of the other with middle fingers even. Participant inhales, then exhales while reaching forward ' +
      'toward the toes. Keep back straight and head up. Avoid bouncing or pain. Hold reach for 2 seconds.',
    safetyNotes: ['Do not perform this test with severe osteoporosis.', GENERIC_STOP_CONDITION],
  },
  {
    key: 'back_scratch',
    stationNumber: 5,
    title: 'Back Scratch Test',
    purpose: 'Measure upper-body flexibility.',
    equipment: ['18-inch ruler'],
    procedure:
      'Participant stands. One hand reaches over the shoulder and down the back. The other hand reaches ' +
      'behind the back and upward. Measure the distance between middle fingertips.',
    safetyNotes: ['Stop if pain occurs.', GENERIC_STOP_CONDITION],
  },
  {
    key: 'up_and_go',
    stationNumber: 6,
    title: '8-Foot Up and Go Test',
    purpose: 'Assess agility and dynamic balance.',
    equipment: ['Stopwatch', 'Chair, about 17 inches high', 'Cone marker', 'Measuring tape', 'Clear area'],
    procedure:
      'Place chair next to wall. Place marker 8 feet in front of chair. Participant starts seated with ' +
      'hands on knees and feet flat. On "Go," participant stands, walks quickly and safely around the cone, ' +
      'returns to chair, and sits down. Timing stops when participant sits.',
    safetyNotes: [
      'Cane or walker may be used if that is the usual walking method. Push-off from chair is allowed. No running.',
      GENERIC_STOP_CONDITION,
    ],
  },
];

export const WALK_TEST_CONTENT: StationContent = {
  key: 'walk_step',
  stationNumber: 7,
  title: '6-Minute Walk Test',
  purpose: 'Assess aerobic endurance.',
  equipment: ['Measuring tape', 'Stopwatch or built-in 6-minute timer', 'Chairs for resting', 'Walking course'],
  procedure:
    'Participant walks as quickly as possible for 6 minutes to cover as much distance as possible. ' +
    'Participant may set their own pace and may stop and rest if needed.',
  safetyNotes: ['Terminate the test if participant reports dizziness, nausea, excessive fatigue, pain, or concerning symptoms.'],
};

export const STEP_TEST_CONTENT: StationContent = {
  key: 'walk_step',
  stationNumber: 7,
  title: '2-Minute Step in Place Test',
  purpose: 'Measure aerobic endurance. Use as an alternative to the 6-Minute Walk Test for participants who use orthopedic devices or have difficulty balancing.',
  equipment: ['Tape for marking wall', 'Stopwatch or built-in 2-minute timer', 'Wall or stable chair'],
  procedure:
    'Participant stands next to wall. Mark a point midway between the kneecap and top of hip bone. ' +
    'Participant marches in place for two minutes, lifting knees to the marked height. Resting is allowed. ' +
    'Holding wall or stable chair is allowed.',
  safetyNotes: [GENERIC_STOP_CONDITION],
};

export function getStationContent(key: StationRouteKey, walkTestVariant?: 'walk' | 'step'): StationContent {
  if (key === 'walk_step') {
    return walkTestVariant === 'step' ? STEP_TEST_CONTENT : WALK_TEST_CONTENT;
  }
  const content = STATION_CONTENT.find((c) => c.key === key);
  if (!content) throw new Error(`No content for station ${key}`);
  return content;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd /Users/e10/balance-app && npx vitest run lib/assessment/__tests__/content.test.ts`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add lib/assessment/content.ts lib/assessment/__tests__/content.test.ts
git commit -m "feat: add static instructor content for assessment stations"
```

---

## Task 8: `app/api/assessment/sessions/route.ts` — create and list sessions

**Files:**
- Create: `app/api/assessment/sessions/route.ts`

This route has no pure logic to unit test (it's a thin DB wrapper following the exact pattern of `app/api/user/route.ts`), so it's written directly rather than via TDD, consistent with how other API routes in this codebase are built.

- [ ] **Step 1: Create the route**

Create `app/api/assessment/sessions/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { assessmentSessions } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [created] = await db.insert(assessmentSessions).values({
    userId: session.user.id,
    dateOfTest: new Date().toISOString().slice(0, 10),
    status: 'in_progress',
  }).returning();

  return NextResponse.json({ session: created });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sessions = await db.query.assessmentSessions.findMany({
    where: eq(assessmentSessions.userId, session.user.id),
    orderBy: [desc(assessmentSessions.createdAt)],
  });

  return NextResponse.json({ sessions });
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/e10/balance-app && npx tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/assessment/sessions/route.ts
git commit -m "feat: add create/list endpoints for assessment sessions"
```

---

## Task 9: `lib/assessment/scoring.ts` — station-to-domain mapping

**Files:**
- Modify: `lib/assessment/scoring.ts`
- Modify: `lib/assessment/__tests__/scoring.test.ts`

The session-completion route (Task 10) needs to turn 7 station results into the 6 domains `computeOverallScore` expects. `walk_test` and `step_test` both map to `aerobic_endurance` since only one runs per session.

- [ ] **Step 1: Write the failing test**

Append to `lib/assessment/__tests__/scoring.test.ts`:

```ts
import { STATION_TO_DOMAIN } from '../scoring';

describe('STATION_TO_DOMAIN', () => {
  it('maps every station to its domain', () => {
    expect(STATION_TO_DOMAIN.chair_stand).toBe('lower_body_strength');
    expect(STATION_TO_DOMAIN.arm_curl).toBe('upper_body_strength');
    expect(STATION_TO_DOMAIN.sit_reach).toBe('lower_body_flexibility');
    expect(STATION_TO_DOMAIN.back_scratch).toBe('upper_body_flexibility');
    expect(STATION_TO_DOMAIN.up_and_go).toBe('agility_balance');
    expect(STATION_TO_DOMAIN.walk_test).toBe('aerobic_endurance');
    expect(STATION_TO_DOMAIN.step_test).toBe('aerobic_endurance');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /Users/e10/balance-app && npx vitest run lib/assessment/__tests__/scoring.test.ts`
Expected: FAIL — `STATION_TO_DOMAIN is undefined`

- [ ] **Step 3: Write the implementation**

Append to `lib/assessment/scoring.ts`:

```ts
import type { AssessmentStation } from '@/lib/schema';

export const STATION_TO_DOMAIN: Record<AssessmentStation, Domain> = {
  chair_stand: 'lower_body_strength',
  arm_curl: 'upper_body_strength',
  sit_reach: 'lower_body_flexibility',
  back_scratch: 'upper_body_flexibility',
  up_and_go: 'agility_balance',
  walk_test: 'aerobic_endurance',
  step_test: 'aerobic_endurance',
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd /Users/e10/balance-app && npx vitest run lib/assessment/__tests__/scoring.test.ts`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add lib/assessment/scoring.ts lib/assessment/__tests__/scoring.test.ts
git commit -m "feat: add station-to-domain mapping for overall score aggregation"
```

---

## Task 10: `app/api/assessment/sessions/[id]/route.ts` — session detail and completion

**Files:**
- Create: `app/api/assessment/sessions/[id]/route.ts`

`GET` returns the session with its station results (for the dashboard progress grid and report page). `PATCH` is called once the instructor marks the session complete: it recomputes the overall score from whatever station results exist and stores it on the session row.

- [ ] **Step 1: Create the route**

Create `app/api/assessment/sessions/[id]/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { assessmentSessions } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { computeOverallScore, STATION_TO_DOMAIN, type Domain, type AssessmentCategory } from '@/lib/assessment/scoring';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const found = await db.query.assessmentSessions.findFirst({
    where: and(eq(assessmentSessions.id, id), eq(assessmentSessions.userId, session.user.id)),
    with: { stationResults: true },
  });

  if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ session: found });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const body = (await req.json()) as { status?: 'completed'; walkTestVariant?: 'walk' | 'step' };

  const found = await db.query.assessmentSessions.findFirst({
    where: and(eq(assessmentSessions.id, id), eq(assessmentSessions.userId, session.user.id)),
    with: { stationResults: true },
  });
  if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Picking the Station 7 variant doesn't need scoring — just record the choice.
  if (body.walkTestVariant && !body.status) {
    const [updated] = await db.update(assessmentSessions)
      .set({ walkTestVariant: body.walkTestVariant })
      .where(eq(assessmentSessions.id, id))
      .returning();
    return NextResponse.json({ session: updated });
  }

  if (body.status !== 'completed') {
    return NextResponse.json({ error: 'Unsupported status' }, { status: 400 });
  }

  const domains: Record<Domain, AssessmentCategory | null> = {
    lower_body_strength: null,
    upper_body_strength: null,
    lower_body_flexibility: null,
    upper_body_flexibility: null,
    agility_balance: null,
    aerobic_endurance: null,
  };
  for (const result of found.stationResults) {
    domains[STATION_TO_DOMAIN[result.station]] = result.category;
  }

  const overall = computeOverallScore(domains);

  const [updated] = await db.update(assessmentSessions)
    .set({
      status: 'completed',
      completedAt: new Date(),
      overallScore: overall.total,
      overallCategory: overall.overallCategory,
    })
    .where(eq(assessmentSessions.id, id))
    .returning();

  return NextResponse.json({ session: updated, overall });
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/e10/balance-app && npx tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/assessment/sessions/[id]/route.ts
git commit -m "feat: add assessment session detail and completion endpoint"
```

---

## Task 11: `lib/assessment/scoring.ts` — `computeAge`

**Files:**
- Modify: `lib/assessment/scoring.ts`
- Modify: `lib/assessment/__tests__/scoring.test.ts`

The station-result route (Task 13) needs the participant's age computed server-side from `dateOfBirth`, rather than trusting a client-supplied number, so it can't go stale and can't be tampered with.

- [ ] **Step 1: Write the failing test**

Append to `lib/assessment/__tests__/scoring.test.ts`:

```ts
import { computeAge } from '../scoring';

describe('computeAge', () => {
  it('computes age when the birthday has already passed this year', () => {
    expect(computeAge('1960-01-15', new Date('2026-06-25'))).toBe(66);
  });

  it('computes age when the birthday has not yet occurred this year', () => {
    expect(computeAge('1960-12-15', new Date('2026-06-25'))).toBe(65);
  });

  it('computes age on the exact birthday', () => {
    expect(computeAge('1960-06-25', new Date('2026-06-25'))).toBe(66);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /Users/e10/balance-app && npx vitest run lib/assessment/__tests__/scoring.test.ts`
Expected: FAIL — `computeAge is not a function`

- [ ] **Step 3: Write the implementation**

Append to `lib/assessment/scoring.ts`:

```ts
export function computeAge(dateOfBirth: string, asOf: Date = new Date()): number {
  const dob = new Date(dateOfBirth);
  let age = asOf.getFullYear() - dob.getFullYear();
  const hasHadBirthdayThisYear =
    asOf.getMonth() > dob.getMonth() ||
    (asOf.getMonth() === dob.getMonth() && asOf.getDate() >= dob.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd /Users/e10/balance-app && npx vitest run lib/assessment/__tests__/scoring.test.ts`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add lib/assessment/scoring.ts lib/assessment/__tests__/scoring.test.ts
git commit -m "feat: add computeAge helper for assessment scoring"
```

---

## Task 12: `app/api/assessment/sessions/[id]/bmi/route.ts` — Station 3 (Height/Weight/BMI)

**Files:**
- Create: `app/api/assessment/sessions/[id]/bmi/route.ts`

- [ ] **Step 1: Create the route**

Create `app/api/assessment/sessions/[id]/bmi/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { assessmentSessions } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { computeBMI } from '@/lib/assessment/scoring';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const { heightCm, weightKg } = (await req.json()) as { heightCm: number; weightKg: number };

  const found = await db.query.assessmentSessions.findFirst({
    where: and(eq(assessmentSessions.id, id), eq(assessmentSessions.userId, session.user.id)),
  });
  if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { bmi, category } = computeBMI(weightKg, heightCm);

  const [updated] = await db.update(assessmentSessions)
    .set({ heightCm, weightKg, bmi, bmiCategory: category })
    .where(eq(assessmentSessions.id, id))
    .returning();

  return NextResponse.json({ session: updated });
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/e10/balance-app && npx tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/assessment/sessions/[id]/bmi/route.ts
git commit -m "feat: add BMI station endpoint for assessment sessions"
```

---

## Task 13: `lib/assessment/scoring.ts` — `categorizeStationResult` dispatcher

**Files:**
- Modify: `lib/assessment/scoring.ts`
- Modify: `lib/assessment/__tests__/scoring.test.ts`

The station-result route (Task 14) needs one entry point that knows, per station: whether to convert cm to inches before a table lookup (`sit_reach`, `back_scratch`), call the table directly (`up_and_go`, `step_test`), call the walk-test formula (`walk_test`), or skip scoring entirely (`chair_stand`, `arm_curl`, and any station where age/sex is unknown). Keeping this dispatch logic in `scoring.ts` (rather than inline in the route) keeps it unit-testable and keeps the route a thin DB wrapper, consistent with every other route in this codebase.

- [ ] **Step 1: Write the failing tests**

Append to `lib/assessment/__tests__/scoring.test.ts`:

```ts
import { categorizeStationResult } from '../scoring';

describe('categorizeStationResult', () => {
  it('returns null for chair_stand regardless of inputs', () => {
    expect(categorizeStationResult('chair_stand', 15, 65, 'male', {})).toBeNull();
  });

  it('returns null for arm_curl regardless of inputs', () => {
    expect(categorizeStationResult('arm_curl', 15, 65, 'male', {})).toBeNull();
  });

  it('converts cm to inches before scoring sit_reach', () => {
    // 10.16 cm = 4 inches, which is above the men 60-64 average band (averageHigh 4.0)
    expect(categorizeStationResult('sit_reach', 10.16, 60, 'male', {})).toBe('average');
    expect(categorizeStationResult('sit_reach', 12.7, 60, 'male', {})).toBe('above_average');
  });

  it('converts cm to inches before scoring back_scratch', () => {
    expect(categorizeStationResult('back_scratch', 0, 60, 'male', {})).toBe('average');
  });

  it('scores up_and_go directly in seconds with no conversion', () => {
    expect(categorizeStationResult('up_and_go', 3.0, 65, 'female', {})).toBe('above_average');
  });

  it('scores step_test directly in reps with no conversion', () => {
    expect(categorizeStationResult('step_test', 200, 60, 'male', {})).toBe('above_average');
  });

  it('scores walk_test using the predicted-distance formula when height is available', () => {
    const result = categorizeStationResult('walk_test', 1000, 65, 'male', { heightCm: 170, bmi: 23 });
    expect(['below_average', 'average', 'above_average']).toContain(result);
  });

  it('returns null for walk_test when height is unavailable', () => {
    expect(categorizeStationResult('walk_test', 500, 65, 'male', {})).toBeNull();
  });

  it('returns null when age is null (unknown date of birth)', () => {
    expect(categorizeStationResult('sit_reach', 0, null, 'male', {})).toBeNull();
  });

  it('returns null when sex is null (not set on profile)', () => {
    expect(categorizeStationResult('sit_reach', 0, 65, null, {})).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd /Users/e10/balance-app && npx vitest run lib/assessment/__tests__/scoring.test.ts`
Expected: FAIL — `categorizeStationResult is not a function`

- [ ] **Step 3: Write the implementation**

Append to `lib/assessment/scoring.ts`:

```ts
import { cmToInches } from './units';

const INCH_CONVERTED_STATIONS: AssessmentStation[] = ['sit_reach', 'back_scratch'];
const DIRECT_TABLE_STATIONS: AssessmentStation[] = ['up_and_go', 'step_test'];

export function categorizeStationResult(
  station: AssessmentStation,
  score: number,
  age: number | null,
  sex: Sex | null,
  context: { heightCm?: number | null; bmi?: number | null }
): AssessmentCategory | null {
  if (age === null || sex === null) return null;

  if (station === 'chair_stand' || station === 'arm_curl') return null;

  if (INCH_CONVERTED_STATIONS.includes(station)) {
    return categorizeTableStation(station as TableStation, cmToInches(score), age, sex);
  }

  if (DIRECT_TABLE_STATIONS.includes(station)) {
    return categorizeTableStation(station as TableStation, score, age, sex);
  }

  if (station === 'walk_test') {
    if (context.heightCm === undefined || context.heightCm === null) return null;
    return categorizeWalkTest(score, age, sex, context.heightCm, context.bmi ?? 0);
  }

  return null;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd /Users/e10/balance-app && npx vitest run lib/assessment/__tests__/scoring.test.ts`
Expected: PASS (all tests)

- [ ] **Step 5: Consolidate imports**

Tasks 4, 5, 9, and 13 each appended an `import` line to `lib/assessment/scoring.ts` at the point where new code was added, so the file now has several separate `import type { ... } from '@/lib/schema'` lines and a couple of `import { ... } from './norms'` / `'./units'` lines scattered through it instead of grouped at the top. Move all `import` statements to the top of the file and merge the three separate `@/lib/schema` imports into one:

```ts
import type { Sex, AssessmentStation, BmiCategory } from '@/lib/schema';
import { SIT_REACH_NORMS, BACK_SCRATCH_NORMS, UP_AND_GO_NORMS, STEP_TEST_NORMS, type NormTable } from './norms';
import { cmToInches } from './units';
```

Leave everything else in the file as-is — this step only moves and merges import lines, it doesn't change any logic.

- [ ] **Step 6: Run the full scoring test file once more to confirm nothing broke**

Run: `cd /Users/e10/balance-app && npx vitest run lib/assessment/__tests__/scoring.test.ts`
Expected: PASS (all tests)

- [ ] **Step 7: Commit**

```bash
git add lib/assessment/scoring.ts lib/assessment/__tests__/scoring.test.ts
git commit -m "feat: add categorizeStationResult dispatcher for assessment scoring"
```

---

## Task 14: `app/api/assessment/sessions/[id]/stations/[station]/route.ts` — save-as-you-go station results

**Files:**
- Create: `app/api/assessment/sessions/[id]/stations/[station]/route.ts`

Saves (or overwrites, for instructor retries) one station's result immediately when the instructor finishes that station. Age and sex come from the participant's stored profile, not from the request body, so a malicious or buggy client can't fake the category.

- [ ] **Step 1: Create the route**

Create `app/api/assessment/sessions/[id]/stations/[station]/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { assessmentSessions, assessmentStationResults, users } from '@/lib/schema';
import type { AssessmentStation } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { categorizeStationResult, computeAge } from '@/lib/assessment/scoring';

const VALID_STATIONS: AssessmentStation[] = [
  'chair_stand', 'arm_curl', 'sit_reach', 'back_scratch', 'up_and_go', 'walk_test', 'step_test',
];

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; station: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, station } = await params;

  if (!VALID_STATIONS.includes(station as AssessmentStation)) {
    return NextResponse.json({ error: 'Invalid station' }, { status: 400 });
  }
  const stationKey = station as AssessmentStation;

  const { rawData, score, unit } = (await req.json()) as { rawData: unknown; score: number; unit: string };

  const [foundSession, user] = await Promise.all([
    db.query.assessmentSessions.findFirst({
      where: and(eq(assessmentSessions.id, id), eq(assessmentSessions.userId, session.user.id)),
    }),
    db.query.users.findFirst({ where: eq(users.id, session.user.id) }),
  ]);
  if (!foundSession) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const age = user?.dateOfBirth ? computeAge(user.dateOfBirth) : null;
  const sex = user?.sex ?? null;

  const category = categorizeStationResult(stationKey, score, age, sex, {
    heightCm: foundSession.heightCm,
    bmi: foundSession.bmi,
  });

  const existing = await db.query.assessmentStationResults.findFirst({
    where: and(
      eq(assessmentStationResults.sessionId, id),
      eq(assessmentStationResults.station, stationKey)
    ),
  });

  const values = { rawData, score, unit, category };

  const [result] = existing
    ? await db.update(assessmentStationResults)
        .set(values)
        .where(eq(assessmentStationResults.id, existing.id))
        .returning()
    : await db.insert(assessmentStationResults)
        .values({ sessionId: id, station: stationKey, ...values })
        .returning();

  return NextResponse.json({ result });
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/e10/balance-app && npx tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/assessment/sessions/[id]/stations/[station]/route.ts
git commit -m "feat: add save-as-you-go station result endpoint"
```

---

## Task 15: extend `app/api/user/route.ts` with sex and date of birth

**Files:**
- Modify: `app/api/user/route.ts`

- [ ] **Step 1: Update the route**

Replace the full contents of `app/api/user/route.ts` with:

```ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import type { Sex } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await db.query.users.findFirst({ where: eq(users.id, session.user.id) });
  return NextResponse.json({
    name: user?.name ?? null,
    email: user?.email ?? null,
    reminderTime: user?.reminderTime ?? '09:00',
    sex: user?.sex ?? null,
    dateOfBirth: user?.dateOfBirth ?? null,
    createdAt: user?.createdAt ?? null,
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, reminderTime, sex, dateOfBirth } = (await req.json()) as {
    name?: string;
    reminderTime?: string;
    sex?: Sex;
    dateOfBirth?: string;
  };

  const [updated] = await db.update(users)
    .set({
      ...(name !== undefined && { name }),
      ...(reminderTime !== undefined && { reminderTime }),
      ...(sex !== undefined && { sex }),
      ...(dateOfBirth !== undefined && { dateOfBirth }),
    })
    .where(eq(users.id, session.user.id))
    .returning();

  return NextResponse.json({ user: updated });
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/e10/balance-app && npx tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/user/route.ts
git commit -m "feat: support sex and dateOfBirth on user profile endpoint"
```

---

## Task 16: `components/assessment/CountdownTimer.tsx` — shared timer UI

**Files:**
- Create: `components/assessment/CountdownTimer.tsx`

Reusable Get-Ready → 3-2-1 → Start/Go → running countdown+progress bar → Stop/Test-Complete flow, reusing the existing `components/TimerRing.tsx` ring visual. Used by `RepCountStation` (Task 17) and `DistanceAfterTimerStation` (Task 18). This is UI-only (no pure logic to unit test), consistent with the rest of the component layer — see the Testing section in the design doc.

- [ ] **Step 1: Create the component**

Create `components/assessment/CountdownTimer.tsx`:

```tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import TimerRing from '@/components/TimerRing';

export type TimerPhase = 'ready' | 'countdown' | 'running' | 'done';

type Props = {
  durationSeconds: number;
  goLabel?: string;
  onComplete: (elapsedSeconds: number) => void;
  children?: (phase: TimerPhase, remaining: number) => React.ReactNode;
};

export default function CountdownTimer({ durationSeconds, goLabel = 'Start', onComplete, children }: Props) {
  const [phase, setPhase] = useState<TimerPhase>('ready');
  const [countdown, setCountdown] = useState(3);
  const [remaining, setRemaining] = useState(durationSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown === 0) {
      setPhase('running');
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  useEffect(() => {
    if (phase === 'running' && remaining > 0) {
      intervalRef.current = setInterval(() => setRemaining((r) => r - 1), 1000);
    } else if (phase === 'running' && remaining === 0) {
      setPhase('done');
      onComplete(durationSeconds);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase, remaining, durationSeconds, onComplete]);

  function handleStart() {
    setPhase('countdown');
    setCountdown(3);
  }

  function handleStop() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPhase('done');
    onComplete(durationSeconds - remaining);
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {phase === 'ready' && (
        <button
          onClick={handleStart}
          className="w-full py-5 rounded-2xl bg-primary text-white text-xl font-semibold"
        >
          Get Ready
        </button>
      )}

      {phase === 'countdown' && (
        <div className="font-heading text-6xl font-semibold text-primary py-8">
          {countdown > 0 ? countdown : goLabel}
        </div>
      )}

      {(phase === 'running' || phase === 'done') && (
        <>
          <TimerRing total={durationSeconds} remaining={remaining} />
          <div className="w-full h-2 bg-primary-light rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{
                width: `${((durationSeconds - remaining) / durationSeconds) * 100}%`,
                transition: 'width 1s linear',
              }}
            />
          </div>
        </>
      )}

      {children?.(phase, remaining)}

      {phase === 'running' && (
        <button
          onClick={handleStop}
          className="w-full py-5 rounded-2xl border-2 border-muted text-mid text-lg font-medium"
        >
          Stop
        </button>
      )}

      {phase === 'done' && (
        <p className="font-heading text-2xl font-semibold text-secondary">Test Complete</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/e10/balance-app && npx tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 3: Commit**

```bash
git add components/assessment/CountdownTimer.tsx
git commit -m "feat: add shared countdown timer component for assessment stations"
```

---

## Task 17: `components/assessment/RepCountStation.tsx` — chair stand, arm curl, step test

**Files:**
- Create: `components/assessment/RepCountStation.tsx`

- [ ] **Step 1: Create the component**

Create `components/assessment/RepCountStation.tsx`:

```tsx
'use client';
import { useState } from 'react';
import CountdownTimer from './CountdownTimer';

type SavePayload = { rawData: Record<string, unknown>; score: number; unit: string };

type Props = {
  durationSeconds: number;
  extraFields?: React.ReactNode;
  onSave: (payload: SavePayload) => Promise<void>;
};

export default function RepCountStation({ durationSeconds, extraFields, onSave }: Props) {
  const [reps, setReps] = useState(0);
  const [manualReps, setManualReps] = useState<number | null>(null);
  const [completed, setCompleted] = useState(false);
  const [saving, setSaving] = useState(false);

  const finalScore = manualReps ?? reps;

  async function handleSave() {
    setSaving(true);
    await onSave({ rawData: { countedReps: reps, manualOverride: manualReps }, score: finalScore, unit: 'reps' });
    setSaving(false);
  }

  return (
    <div className="flex flex-col gap-5">
      {extraFields}

      <CountdownTimer durationSeconds={durationSeconds} onComplete={() => setCompleted(true)}>
        {(phase) =>
          phase === 'running' ? (
            <div className="flex flex-col items-center gap-3">
              <p className="font-heading text-5xl font-semibold text-dark">{reps}</p>
              <button
                onClick={() => setReps((r) => r + 1)}
                className="w-20 h-20 rounded-full bg-secondary text-white text-2xl font-bold"
                aria-label="Count one repetition"
              >
                +1
              </button>
            </div>
          ) : null
        }
      </CountdownTimer>

      {completed && (
        <div className="flex flex-col gap-3">
          <label className="text-dark text-lg font-medium">Reps counted: {reps} — adjust if needed</label>
          <input
            type="number"
            min={0}
            value={manualReps ?? reps}
            onChange={(e) => setManualReps(Number(e.target.value))}
            className="border-2 border-primary-light rounded-xl px-4 py-3 text-xl text-dark"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-5 rounded-2xl bg-primary text-white text-xl font-semibold disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save & Continue'}
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/e10/balance-app && npx tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 3: Commit**

```bash
git add components/assessment/RepCountStation.tsx
git commit -m "feat: add rep-counting station component for chair stand, arm curl, step test"
```

---

## Task 18: `components/assessment/DistanceAfterTimerStation.tsx` — 6-minute walk test

**Files:**
- Create: `components/assessment/DistanceAfterTimerStation.tsx`

- [ ] **Step 1: Create the component**

Create `components/assessment/DistanceAfterTimerStation.tsx`:

```tsx
'use client';
import { useState } from 'react';
import CountdownTimer from './CountdownTimer';

type SavePayload = { rawData: Record<string, unknown>; score: number; unit: string };

type Props = {
  durationSeconds: number;
  onSave: (payload: SavePayload) => Promise<void>;
};

export default function DistanceAfterTimerStation({ durationSeconds, onSave }: Props) {
  const [completed, setCompleted] = useState(false);
  const [distanceM, setDistanceM] = useState(0);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave({ rawData: { distanceM }, score: distanceM, unit: 'meters' });
    setSaving(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <CountdownTimer durationSeconds={durationSeconds} goLabel="Go" onComplete={() => setCompleted(true)} />

      {completed && (
        <div className="flex flex-col gap-3">
          <label className="text-dark text-lg font-medium">Distance walked (meters)</label>
          <input
            type="number"
            min={0}
            step={0.1}
            value={distanceM}
            onChange={(e) => setDistanceM(Number(e.target.value))}
            className="border-2 border-primary-light rounded-xl px-4 py-3 text-xl text-dark"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-5 rounded-2xl bg-primary text-white text-xl font-semibold disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save & Continue'}
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/e10/balance-app && npx tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 3: Commit**

```bash
git add components/assessment/DistanceAfterTimerStation.tsx
git commit -m "feat: add distance-after-timer station component for the 6-minute walk test"
```

---

## Task 19: `components/assessment/TwoTrialStopwatchStation.tsx` — 8-foot up and go

**Files:**
- Create: `components/assessment/TwoTrialStopwatchStation.tsx`

- [ ] **Step 1: Create the component**

Create `components/assessment/TwoTrialStopwatchStation.tsx`:

```tsx
'use client';
import { useEffect, useRef, useState } from 'react';

type SavePayload = { rawData: Record<string, unknown>; score: number; unit: string };

function Stopwatch({ label, onFinish }: { label: string; onFinish: (seconds: number) => void }) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const startRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      startRef.current = Date.now() - elapsed * 1000;
      intervalRef.current = setInterval(() => {
        setElapsed((Date.now() - (startRef.current ?? Date.now())) / 1000);
      }, 100);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  function handleStartStop() {
    if (!running && !done) {
      setRunning(true);
    } else if (running) {
      setRunning(false);
      setDone(true);
      onFinish(Math.round(elapsed * 10) / 10);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2 flex-1">
      <p className="text-dark text-lg font-medium">{label}</p>
      <p className="font-heading text-4xl font-semibold text-dark">{elapsed.toFixed(1)}s</p>
      <button
        onClick={handleStartStop}
        disabled={done}
        className={`w-full py-4 rounded-xl text-lg font-semibold ${
          done ? 'bg-primary-light text-mid' : running ? 'bg-secondary text-white' : 'bg-primary text-white'
        }`}
      >
        {done ? 'Done' : running ? 'Stop' : 'Start'}
      </button>
    </div>
  );
}

export default function TwoTrialStopwatchStation({ onSave }: { onSave: (payload: SavePayload) => Promise<void> }) {
  const [trial1, setTrial1] = useState<number | null>(null);
  const [trial2, setTrial2] = useState<number | null>(null);
  const [manualOverride, setManualOverride] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const best = trial1 !== null && trial2 !== null ? Math.min(trial1, trial2) : trial1 ?? trial2;
  const finalScore = manualOverride ?? best;

  async function handleSave() {
    if (finalScore === null) return;
    setSaving(true);
    await onSave({ rawData: { trial1, trial2, manualOverride }, score: finalScore, unit: 'seconds' });
    setSaving(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-4">
        <Stopwatch label="Trial 1" onFinish={setTrial1} />
        <Stopwatch label="Trial 2" onFinish={setTrial2} />
      </div>

      {best !== null && (
        <div className="flex flex-col gap-3">
          <label className="text-dark text-lg font-medium">Best time: {best.toFixed(1)}s — adjust if needed</label>
          <input
            type="number"
            step={0.1}
            min={0}
            value={manualOverride ?? best}
            onChange={(e) => setManualOverride(Number(e.target.value))}
            className="border-2 border-primary-light rounded-xl px-4 py-3 text-xl text-dark"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-5 rounded-2xl bg-primary text-white text-xl font-semibold disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save & Continue'}
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/e10/balance-app && npx tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 3: Commit**

```bash
git add components/assessment/TwoTrialStopwatchStation.tsx
git commit -m "feat: add two-trial stopwatch station component for the up-and-go test"
```

---

## Task 20: `components/assessment/TwoTrialMeasurementStation.tsx` — sit-and-reach, back scratch

**Files:**
- Create: `components/assessment/TwoTrialMeasurementStation.tsx`

- [ ] **Step 1: Create the component**

Create `components/assessment/TwoTrialMeasurementStation.tsx`:

```tsx
'use client';
import { useState } from 'react';

type SavePayload = { rawData: Record<string, unknown>; score: number; unit: string };

type Props = {
  higherIsBetter: boolean;
  onSave: (payload: SavePayload) => Promise<void>;
};

export default function TwoTrialMeasurementStation({ higherIsBetter, onSave }: Props) {
  const [trial1, setTrial1] = useState<number | null>(null);
  const [trial2, setTrial2] = useState<number | null>(null);
  const [manualOverride, setManualOverride] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const best =
    trial1 !== null && trial2 !== null
      ? higherIsBetter
        ? Math.max(trial1, trial2)
        : Math.min(trial1, trial2)
      : trial1 ?? trial2;
  const finalScore = manualOverride ?? best;

  async function handleSave() {
    if (finalScore === null) return;
    setSaving(true);
    await onSave({ rawData: { trial1, trial2, manualOverride }, score: finalScore, unit: 'cm' });
    setSaving(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <label className="text-dark text-lg font-medium">Trial 1 (cm)</label>
        <input
          type="number"
          step={0.5}
          value={trial1 ?? ''}
          onChange={(e) => setTrial1(e.target.value === '' ? null : Number(e.target.value))}
          className="border-2 border-primary-light rounded-xl px-4 py-3 text-xl text-dark"
        />
        <label className="text-dark text-lg font-medium">Trial 2 (cm)</label>
        <input
          type="number"
          step={0.5}
          value={trial2 ?? ''}
          onChange={(e) => setTrial2(e.target.value === '' ? null : Number(e.target.value))}
          className="border-2 border-primary-light rounded-xl px-4 py-3 text-xl text-dark"
        />
      </div>

      {best !== null && (
        <div className="flex flex-col gap-3">
          <label className="text-dark text-lg font-medium">Best score: {best} cm — adjust if needed</label>
          <input
            type="number"
            step={0.5}
            value={manualOverride ?? best}
            onChange={(e) => setManualOverride(Number(e.target.value))}
            className="border-2 border-primary-light rounded-xl px-4 py-3 text-xl text-dark"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-5 rounded-2xl bg-primary text-white text-xl font-semibold disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save & Continue'}
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/e10/balance-app && npx tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 3: Commit**

```bash
git add components/assessment/TwoTrialMeasurementStation.tsx
git commit -m "feat: add two-trial measurement station component for sit-and-reach and back scratch"
```

---

## Task 21: `components/assessment/BmiStation.tsx` — height, weight, BMI

**Files:**
- Create: `components/assessment/BmiStation.tsx`

- [ ] **Step 1: Create the component**

Create `components/assessment/BmiStation.tsx`:

```tsx
'use client';
import { useState } from 'react';

type Props = {
  onSave: (payload: { heightCm: number; weightKg: number }) => Promise<void>;
};

export default function BmiStation({ onSave }: Props) {
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (heightCm === null || weightKg === null) return;
    setSaving(true);
    await onSave({ heightCm, weightKg });
    setSaving(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <label className="text-dark text-lg font-medium">Height (cm)</label>
        <input
          type="number"
          step={0.1}
          value={heightCm ?? ''}
          onChange={(e) => setHeightCm(e.target.value === '' ? null : Number(e.target.value))}
          className="border-2 border-primary-light rounded-xl px-4 py-3 text-xl text-dark"
        />
        <label className="text-dark text-lg font-medium">Weight (kg)</label>
        <input
          type="number"
          step={0.1}
          value={weightKg ?? ''}
          onChange={(e) => setWeightKg(e.target.value === '' ? null : Number(e.target.value))}
          className="border-2 border-primary-light rounded-xl px-4 py-3 text-xl text-dark"
        />
      </div>
      <button
        onClick={handleSave}
        disabled={saving || heightCm === null || weightKg === null}
        className="w-full py-5 rounded-2xl bg-primary text-white text-xl font-semibold disabled:opacity-60"
      >
        {saving ? 'Saving...' : 'Save & Continue'}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/e10/balance-app && npx tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 3: Commit**

```bash
git add components/assessment/BmiStation.tsx
git commit -m "feat: add BMI station component"
```

---

## Task 22: `app/(app)/assessment/page.tsx` — dashboard

**Files:**
- Create: `app/(app)/assessment/page.tsx`

Shows participant info, a "Start New Assessment" button when there's no in-progress session, or a 7-station progress grid plus the Station 7 variant picker and "View Final Report" link when there is one.

- [ ] **Step 1: Create the page**

Create `app/(app)/assessment/page.tsx`:

```tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getStationContent, type StationRouteKey } from '@/lib/assessment/content';
import type { AssessmentStation, WalkTestVariant, Sex } from '@/lib/schema';

type StationResult = { station: AssessmentStation };
type SessionDetail = {
  id: string;
  status: 'in_progress' | 'completed';
  heightCm: number | null;
  walkTestVariant: WalkTestVariant | null;
  stationResults: StationResult[];
};
type UserProfile = { name: string | null; sex: Sex | null; dateOfBirth: string | null };

const DASHBOARD_STATIONS: StationRouteKey[] = [
  'chair_stand', 'arm_curl', 'height_weight', 'sit_reach', 'back_scratch', 'up_and_go', 'walk_step',
];

function ageFromDOB(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const hadBirthday = now.getMonth() > d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() >= d.getDate());
  if (!hadBirthday) age -= 1;
  return age;
}

function isStationDone(session: SessionDetail, key: StationRouteKey): boolean {
  if (key === 'height_weight') return session.heightCm !== null;
  if (key === 'walk_step') {
    if (!session.walkTestVariant) return false;
    const dbStation = session.walkTestVariant === 'step' ? 'step_test' : 'walk_test';
    return session.stationResults.some((r) => r.station === dbStation);
  }
  return session.stationResults.some((r) => r.station === key);
}

export default function AssessmentDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeSession, setActiveSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  async function loadActiveSession() {
    const listRes = await fetch('/api/assessment/sessions');
    const { sessions } = (await listRes.json()) as { sessions: { id: string; status: string }[] };
    const inProgress = sessions.find((s) => s.status === 'in_progress');
    if (!inProgress) {
      setActiveSession(null);
      return;
    }
    const detailRes = await fetch(`/api/assessment/sessions/${inProgress.id}`);
    const { session } = (await detailRes.json()) as { session: SessionDetail };
    setActiveSession(session);
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([fetch('/api/user').then((r) => r.json()), loadActiveSession()]).then(([userData]) => {
      setUser(userData);
      setLoading(false);
    });
  }, []);

  async function handleStartAssessment() {
    setCreating(true);
    await fetch('/api/assessment/sessions', { method: 'POST' });
    await loadActiveSession();
    setCreating(false);
  }

  async function handleSelectWalkVariant(variant: 'walk' | 'step') {
    if (!activeSession) return;
    await fetch(`/api/assessment/sessions/${activeSession.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walkTestVariant: variant }),
    });
    await loadActiveSession();
  }

  if (loading) return <div className="p-6 text-mid text-xl">Loading...</div>;

  const allDone = activeSession ? DASHBOARD_STATIONS.every((k) => isStationDone(activeSession, k)) : false;

  return (
    <div className="p-6 pt-10 flex flex-col gap-6 max-w-md mx-auto">
      <div>
        <p className="text-mid text-sm font-medium uppercase tracking-widest">Senior Fitness Test</p>
        <h1 className="font-heading text-4xl font-semibold text-dark mt-1">Fitness Assessment</h1>
      </div>

      <div className="bg-surface rounded-2xl p-5 flex flex-col gap-2">
        <p className="text-dark text-lg"><strong>{user?.name ?? 'Participant'}</strong></p>
        <p className="text-mid text-base">
          Age: {ageFromDOB(user?.dateOfBirth ?? null) ?? 'Not set'} · Sex: {user?.sex ?? 'Not set'}
        </p>
        {(!user?.dateOfBirth || !user?.sex) && (
          <Link href="/settings" className="text-primary text-base font-medium underline">
            Set age and sex in Settings to enable scoring norms
          </Link>
        )}
      </div>

      {!activeSession ? (
        <button
          onClick={handleStartAssessment}
          disabled={creating}
          className="w-full py-5 rounded-2xl bg-primary text-white text-xl font-semibold disabled:opacity-60"
        >
          {creating ? 'Starting...' : 'Start New Assessment'}
        </button>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {DASHBOARD_STATIONS.map((key) => {
              const content = getStationContent(key, activeSession.walkTestVariant ?? undefined);
              const done = isStationDone(activeSession, key);
              const blocked = key === 'walk_step' && !activeSession.walkTestVariant;
              return (
                <button
                  key={key}
                  disabled={blocked}
                  onClick={() => router.push(`/assessment/${activeSession.id}/station/${key}`)}
                  className={`flex flex-col items-start gap-1 p-4 rounded-2xl border-2 text-left disabled:opacity-50 ${
                    done ? 'bg-secondary-light border-secondary' : 'bg-surface border-primary-light'
                  }`}
                >
                  <span className="text-mid text-sm font-medium">Station {content.stationNumber}</span>
                  <span className="text-dark text-base font-semibold leading-tight">{content.title}</span>
                  <span className="text-sm font-medium" style={{ color: done ? 'var(--secondary)' : 'var(--muted)' }}>
                    {done ? '✓ Done' : 'Not started'}
                  </span>
                </button>
              );
            })}
          </div>

          {!activeSession.walkTestVariant && (
            <div className="bg-surface rounded-2xl p-5 flex flex-col gap-3">
              <p className="text-dark text-lg font-medium">Choose Station 7 test</p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleSelectWalkVariant('walk')}
                  className="flex-1 py-4 rounded-xl border-2 border-primary-light text-dark text-base font-medium"
                >
                  6-Minute Walk
                </button>
                <button
                  onClick={() => handleSelectWalkVariant('step')}
                  className="flex-1 py-4 rounded-xl border-2 border-primary-light text-dark text-base font-medium"
                >
                  2-Minute Step
                </button>
              </div>
            </div>
          )}

          {allDone ? (
            <Link
              href={`/assessment/${activeSession.id}/report`}
              className="w-full py-5 rounded-2xl bg-secondary text-white text-xl font-semibold text-center"
            >
              View Final Report
            </Link>
          ) : (
            <button disabled className="w-full py-5 rounded-2xl bg-muted text-surface text-xl font-semibold opacity-60">
              View Final Report
            </button>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/e10/balance-app && npx tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/assessment/page.tsx
git commit -m "feat: add fitness assessment dashboard"
```

---

## Task 23: `app/(app)/assessment/[sessionId]/station/[stationKey]/page.tsx` — station flow

**Files:**
- Create: `app/(app)/assessment/[sessionId]/station/[stationKey]/page.tsx`

Renders the static Purpose/Equipment/Procedure/Safety content for the station, then picks the right input component based on which station it is.

- [ ] **Step 1: Create the page**

Create `app/(app)/assessment/[sessionId]/station/[stationKey]/page.tsx`:

```tsx
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getStationContent, type StationRouteKey } from '@/lib/assessment/content';
import type { AssessmentStation, WalkTestVariant } from '@/lib/schema';
import RepCountStation from '@/components/assessment/RepCountStation';
import TwoTrialMeasurementStation from '@/components/assessment/TwoTrialMeasurementStation';
import TwoTrialStopwatchStation from '@/components/assessment/TwoTrialStopwatchStation';
import DistanceAfterTimerStation from '@/components/assessment/DistanceAfterTimerStation';
import BmiStation from '@/components/assessment/BmiStation';

type SessionDetail = { id: string; walkTestVariant: WalkTestVariant | null };
type SavePayload = { rawData: Record<string, unknown>; score: number; unit: string };

export default function StationPage() {
  const { sessionId, stationKey } = useParams<{ sessionId: string; stationKey: StationRouteKey }>();
  const router = useRouter();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [armSide, setArmSide] = useState<'right' | 'left'>('right');
  const [armWeightLb, setArmWeightLb] = useState(8);

  useEffect(() => {
    fetch(`/api/assessment/sessions/${sessionId}`)
      .then((r) => r.json())
      .then((d: { session: SessionDetail }) => setSession(d.session));
  }, [sessionId]);

  if (!session) return <div className="p-6 text-mid text-xl">Loading...</div>;

  const content = getStationContent(stationKey, session.walkTestVariant ?? undefined);

  async function saveStation(payload: SavePayload) {
    const dbStation: AssessmentStation =
      stationKey === 'walk_step'
        ? session!.walkTestVariant === 'step' ? 'step_test' : 'walk_test'
        : (stationKey as AssessmentStation);
    await fetch(`/api/assessment/sessions/${sessionId}/stations/${dbStation}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    router.push('/assessment');
  }

  async function saveBmi(payload: { heightCm: number; weightKg: number }) {
    await fetch(`/api/assessment/sessions/${sessionId}/bmi`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    router.push('/assessment');
  }

  return (
    <div className="p-6 pt-10 flex flex-col gap-6 max-w-md mx-auto">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/assessment')}
          className="w-12 h-12 rounded-full bg-surface flex items-center justify-center"
          aria-label="Back to dashboard"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--dark)" strokeWidth="2.5" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <h1 className="font-heading text-2xl font-semibold text-dark">
          Station {content.stationNumber}: {content.title}
        </h1>
      </div>

      <div className="bg-surface rounded-2xl p-5 flex flex-col gap-3">
        <p className="text-dark text-lg"><strong>Purpose:</strong> {content.purpose}</p>
        <p className="text-dark text-base"><strong>Equipment:</strong> {content.equipment.join(', ')}</p>
        <p className="text-dark text-base"><strong>Procedure:</strong> {content.procedure}</p>
        <div className="bg-bg rounded-xl p-3">
          {content.safetyNotes.map((note, i) => (
            <p key={i} className="text-mid text-sm">⚠ {note}</p>
          ))}
        </div>
      </div>

      {stationKey === 'chair_stand' && <RepCountStation durationSeconds={30} onSave={saveStation} />}

      {stationKey === 'arm_curl' && (
        <RepCountStation
          durationSeconds={30}
          extraFields={
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <button
                  onClick={() => setArmSide('right')}
                  className={`flex-1 py-3 rounded-xl text-base font-medium border-2 ${
                    armSide === 'right' ? 'bg-primary text-white border-primary' : 'border-primary-light text-dark'
                  }`}
                >
                  Right arm
                </button>
                <button
                  onClick={() => setArmSide('left')}
                  className={`flex-1 py-3 rounded-xl text-base font-medium border-2 ${
                    armSide === 'left' ? 'bg-primary text-white border-primary' : 'border-primary-light text-dark'
                  }`}
                >
                  Left arm
                </button>
              </div>
              <label className="text-dark text-base font-medium">Weight used (lb)</label>
              <input
                type="number"
                value={armWeightLb}
                onChange={(e) => setArmWeightLb(Number(e.target.value))}
                className="border-2 border-primary-light rounded-xl px-4 py-3 text-lg text-dark"
              />
            </div>
          }
          onSave={(payload) => saveStation({ ...payload, rawData: { ...payload.rawData, armSide, armWeightLb } })}
        />
      )}

      {stationKey === 'height_weight' && <BmiStation onSave={saveBmi} />}

      {stationKey === 'sit_reach' && <TwoTrialMeasurementStation higherIsBetter={true} onSave={saveStation} />}

      {stationKey === 'back_scratch' && <TwoTrialMeasurementStation higherIsBetter={false} onSave={saveStation} />}

      {stationKey === 'up_and_go' && <TwoTrialStopwatchStation onSave={saveStation} />}

      {stationKey === 'walk_step' && session.walkTestVariant === 'step' && (
        <RepCountStation durationSeconds={120} onSave={saveStation} />
      )}

      {stationKey === 'walk_step' && session.walkTestVariant !== 'step' && (
        <DistanceAfterTimerStation durationSeconds={360} onSave={saveStation} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/e10/balance-app && npx tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/assessment/\[sessionId\]/station/
git commit -m "feat: add station flow page for fitness assessment"
```

---

## Task 24: `app/(app)/assessment/[sessionId]/report/page.tsx` — final combined report

**Files:**
- Create: `app/(app)/assessment/[sessionId]/report/page.tsx`

On load, this page PATCHes the session to `completed` (idempotent — recomputing from the same station results always yields the same answer, so revisiting an already-completed report is safe) to get the full `OverallResult` breakdown, then renders everything required by the spec's final-report section.

- [ ] **Step 1: Create the page**

Create `app/(app)/assessment/[sessionId]/report/page.tsx`:

```tsx
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { AssessmentStation, AssessmentCategory, BmiCategory } from '@/lib/schema';

type StationResult = { station: AssessmentStation; score: number | null; category: AssessmentCategory | null; unit: string };
type SessionDetail = {
  id: string;
  dateOfTest: string;
  bmi: number | null;
  bmiCategory: BmiCategory | null;
  stationResults: StationResult[];
};
type OverallResult = {
  total: number | null;
  overallCategory: AssessmentCategory | null;
  missingDomains: string[];
  strengths: string[];
  maintain: string[];
  areasForImprovement: string[];
  recommendations: string[];
};
type UserProfile = { name: string | null; sex: 'male' | 'female' | null; dateOfBirth: string | null };

const CATEGORY_LABELS: Record<AssessmentCategory, string> = {
  below_average: 'Below Average',
  average: 'Average',
  above_average: 'Above Average',
};

const DOMAIN_LABELS: Record<string, string> = {
  lower_body_strength: 'Lower Body Strength',
  upper_body_strength: 'Upper Body Strength',
  lower_body_flexibility: 'Lower Body Flexibility',
  upper_body_flexibility: 'Upper Body Flexibility',
  agility_balance: 'Agility and Dynamic Balance',
  aerobic_endurance: 'Aerobic Endurance',
};

const STATION_TITLES: Record<AssessmentStation, string> = {
  chair_stand: 'Chair Stand Test',
  arm_curl: 'Arm Curl Test',
  sit_reach: 'Chair Sit and Reach Test',
  back_scratch: 'Back Scratch Test',
  up_and_go: '8-Foot Up and Go Test',
  walk_test: '6-Minute Walk Test',
  step_test: '2-Minute Step in Place Test',
};

export default function ReportPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [overall, setOverall] = useState<OverallResult | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/assessment/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      }).then((r) => r.json()),
      fetch('/api/user').then((r) => r.json()),
    ]).then(([completion, userData]: [{ session: SessionDetail; overall: OverallResult }, UserProfile]) => {
      setSession(completion.session);
      setOverall(completion.overall);
      setUser(userData);
    });
  }, [sessionId]);

  if (!session || !overall || !user) return <div className="p-6 text-mid text-xl">Generating report...</div>;

  return (
    <div className="p-6 pt-10 pb-12 flex flex-col gap-6 max-w-md mx-auto print:p-0">
      <div className="flex items-center gap-3 print:hidden">
        <button
          onClick={() => router.push('/assessment')}
          className="w-12 h-12 rounded-full bg-surface flex items-center justify-center"
          aria-label="Back to dashboard"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--dark)" strokeWidth="2.5" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <h1 className="font-heading text-3xl font-semibold text-dark">Final Report</h1>
      </div>

      <div className="bg-surface rounded-2xl p-5 flex flex-col gap-1">
        <p className="text-dark text-lg"><strong>{user.name ?? '—'}</strong></p>
        <p className="text-mid text-base">Sex: {user.sex ?? '—'} · Date of test: {session.dateOfTest}</p>
      </div>

      <div className="bg-surface rounded-2xl p-5 flex flex-col gap-2">
        <p className="font-heading text-xl text-dark">Body Mass Index</p>
        <p className="text-dark text-lg">
          {session.bmi !== null ? `${session.bmi} (${session.bmiCategory})` : 'Not recorded'}
        </p>
      </div>

      <div className="bg-surface rounded-2xl p-5 flex flex-col gap-3">
        <p className="font-heading text-xl text-dark">Station Results</p>
        {session.stationResults.map((r) => (
          <div key={r.station} className="flex justify-between items-center">
            <span className="text-dark text-base">{STATION_TITLES[r.station]}</span>
            <span className="text-mid text-base font-medium">
              {r.score !== null ? `${r.score} ${r.unit}` : '—'} —{' '}
              {r.category ? CATEGORY_LABELS[r.category] : 'Not scored (norms unavailable)'}
            </span>
          </div>
        ))}
      </div>

      <div className="bg-surface rounded-2xl p-5 flex flex-col gap-2">
        <p className="font-heading text-xl text-dark">Overall Functional Fitness Score</p>
        {overall.total !== null ? (
          <>
            <p className="font-heading text-3xl font-semibold text-primary">{overall.total}/18</p>
            <p className="text-dark text-lg">{overall.overallCategory ? CATEGORY_LABELS[overall.overallCategory] : ''}</p>
          </>
        ) : (
          <p className="text-mid text-base">
            Overall score unavailable — {overall.missingDomains.map((d) => DOMAIN_LABELS[d]).join(', ')} norms not yet
            configured.
          </p>
        )}
      </div>

      {overall.strengths.length > 0 && (
        <div className="bg-secondary-light rounded-2xl p-5">
          <p className="font-heading text-lg text-dark mb-2">Strengths</p>
          {overall.strengths.map((d) => (
            <p key={d} className="text-dark text-base">{DOMAIN_LABELS[d]}</p>
          ))}
        </div>
      )}

      {overall.maintain.length > 0 && (
        <div className="bg-surface rounded-2xl p-5">
          <p className="font-heading text-lg text-dark mb-2">Maintain</p>
          {overall.maintain.map((d) => (
            <p key={d} className="text-dark text-base">{DOMAIN_LABELS[d]}</p>
          ))}
        </div>
      )}

      {overall.areasForImprovement.length > 0 && (
        <div className="bg-primary-light rounded-2xl p-5">
          <p className="font-heading text-lg text-dark mb-2">Areas for Improvement</p>
          {overall.areasForImprovement.map((d) => (
            <p key={d} className="text-dark text-base">{DOMAIN_LABELS[d]}</p>
          ))}
        </div>
      )}

      {overall.recommendations.length > 0 && (
        <div className="bg-surface rounded-2xl p-5">
          <p className="font-heading text-lg text-dark mb-2">Fall Prevention Recommendations</p>
          {overall.recommendations.map((rec, i) => (
            <p key={i} className="text-dark text-base">{rec}</p>
          ))}
        </div>
      )}

      <p className="text-mid text-sm">
        This overall score is a simple app-generated summary based on Senior Fitness Test category labels. It is
        not a medical diagnosis or formal fall-risk diagnosis.
      </p>

      <button
        onClick={() => window.print()}
        className="w-full py-5 rounded-2xl bg-primary text-white text-xl font-semibold print:hidden"
      >
        Print Report
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/e10/balance-app && npx tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/assessment/\[sessionId\]/report/
git commit -m "feat: add final combined report page for fitness assessment"
```

---

## Task 25: wire up entry points — Profile link and Settings sex/date-of-birth fields

**Files:**
- Modify: `app/(app)/profile/page.tsx`
- Modify: `app/(app)/settings/page.tsx`

The bottom nav already has 5 items (Home, Exercises, Coach, Progress, Profile) — adding a 6th was ruled out during design. The assessment entry point is a link on the Profile page instead, and the participant's sex/date of birth (needed for scoring norms) are edited on the Settings page alongside the existing reminder-time field.

- [ ] **Step 1: Add the assessment link to the Profile page**

In `app/(app)/profile/page.tsx`, find the closing `Settings` link:

```tsx
      <Link
        href="/settings"
        className="w-full bg-surface border-2 border-primary-light text-primary text-xl font-semibold py-5 rounded-2xl text-center"
      >
        Settings
      </Link>
```

Add a new link directly above it:

```tsx
      <Link
        href="/assessment"
        className="w-full bg-primary text-white text-xl font-semibold py-5 rounded-2xl text-center"
      >
        Fitness Assessment
      </Link>

      <Link
        href="/settings"
        className="w-full bg-surface border-2 border-primary-light text-primary text-xl font-semibold py-5 rounded-2xl text-center"
      >
        Settings
      </Link>
```

- [ ] **Step 2: Add sex and date-of-birth fields to Settings**

In `app/(app)/settings/page.tsx`, update the `useEffect` that loads `/api/user`:

```tsx
  useEffect(() => {
    fetch('/api/user')
      .then((r) => r.json())
      .then((d: { reminderTime?: string }) => {
        if (d.reminderTime) setReminderTime(d.reminderTime);
      });
  }, []);
```

Replace it with:

```tsx
  useEffect(() => {
    fetch('/api/user')
      .then((r) => r.json())
      .then((d: { reminderTime?: string; sex?: Sex | null; dateOfBirth?: string | null }) => {
        if (d.reminderTime) setReminderTime(d.reminderTime);
        if (d.sex) setSex(d.sex);
        if (d.dateOfBirth) setDateOfBirth(d.dateOfBirth);
      });
  }, []);
```

Add the `Sex` type import and new state, just below the existing `REMINDER_LABELS` constant declaration:

```tsx
import type { Sex } from '@/lib/schema';
```

(add this to the top import block, alongside the existing `'next-auth/react'` import)

And add new state, alongside the existing `reminderTime` state declaration:

```tsx
  const [sex, setSex] = useState<Sex | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState('');
```

Update the `save()` function to include the new fields:

```tsx
  async function save() {
    setSaving(true);
    await fetch('/api/user', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reminderTime, sex, dateOfBirth: dateOfBirth || undefined }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }
```

Add a new settings block for sex and date of birth, directly after the existing "Daily Reminder" block (before the "Large Text" block):

```tsx
      <div className="bg-surface rounded-2xl p-5 flex flex-col gap-4">
        <p className="font-heading text-xl text-dark">Fitness Assessment Profile</p>
        <div>
          <p className="text-dark text-base mb-2">Sex (used for assessment scoring norms)</p>
          <div className="flex gap-3">
            <button
              onClick={() => setSex('male')}
              className={`flex-1 py-3 rounded-xl text-lg font-medium border-2 ${
                sex === 'male' ? 'bg-primary text-white border-primary' : 'bg-bg text-dark border-primary-light'
              }`}
            >
              Male
            </button>
            <button
              onClick={() => setSex('female')}
              className={`flex-1 py-3 rounded-xl text-lg font-medium border-2 ${
                sex === 'female' ? 'bg-primary text-white border-primary' : 'bg-bg text-dark border-primary-light'
              }`}
            >
              Female
            </button>
          </div>
        </div>
        <div>
          <p className="text-dark text-base mb-2">Date of birth</p>
          <input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            className="w-full border-2 border-primary-light rounded-xl px-4 py-3 text-lg text-dark"
          />
        </div>
      </div>
```

- [ ] **Step 3: Verify it compiles**

Run: `cd /Users/e10/balance-app && npx tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/profile/page.tsx app/\(app\)/settings/page.tsx
git commit -m "feat: link fitness assessment from Profile and add sex/DOB fields to Settings"
```

---

## Final verification

- [ ] **Step 1: Run the full test suite**

Run: `cd /Users/e10/balance-app && npx vitest run`
Expected: all tests pass, including every `lib/assessment/__tests__/*.test.ts` file added in this plan, with no regressions in existing test files.

- [ ] **Step 2: Run the linter**

Run: `cd /Users/e10/balance-app && npm run lint`
Expected: no errors (warnings about pre-existing code are out of scope).

- [ ] **Step 3: Run a full type check**

Run: `cd /Users/e10/balance-app && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual smoke test reminder**

This plan does not include browser-driven E2E testing (per the design doc's Testing section). Before considering the feature done, manually run `npm run dev`, push the migration with `npx drizzle-kit push` against a dev database, set a sex/date-of-birth in Settings, and walk through one full assessment session end-to-end to confirm the save-as-you-go flow, the Station 7 variant picker, and the final report all behave as designed.
