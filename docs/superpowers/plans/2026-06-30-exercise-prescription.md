# Exercise Prescription & Daily Training System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Use Senior Fitness Test assessment results to set per-category exercise levels, expand the exercise library to 34 exercises across 8 categories, generate structured daily workouts, and add reassessment scheduling, trend comparison, and dashboard improvements.

**Architecture:** Replace the existing 5-level daily-completion-driven progression engine with an assessment-driven 3-tier (1=Below/2=Average/3=Above) system. A new `userCategoryLevel` table stores the user's tier per exercise category, written once on assessment completion and never by daily activity. A `buildDailyPlan` pure function replaces `buildDefaultPlan` and uses these tiers to generate a structured 8-slot daily workout. The AI Coach (Gemini) can still swap exercises within a category but can no longer change levels.

**Tech Stack:** Next.js 15 App Router, TypeScript, Drizzle ORM + Neon Postgres, Vitest, Tailwind CSS v3, AI SDK v6 (Gemini)

---

### Task 1: Schema — add `user_category_level` table, update `ExerciseCategory`, add `reassessmentIntervalWeeks`

**Files:**
- Modify: `lib/schema.ts`
- Run: `npx drizzle-kit generate` then `npx drizzle-kit push`

- [ ] **Step 1: Write failing test to verify new schema exports exist**

Create `lib/__tests__/schema.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { userCategoryLevels } from '../schema';
import type { ExerciseCategory } from '../schema';

describe('schema', () => {
  it('exports userCategoryLevels table', () => {
    expect(userCategoryLevels).toBeDefined();
  });

  it('ExerciseCategory includes all 8 values', () => {
    // Type-level test — if this compiles, the type is correct
    const cats: ExerciseCategory[] = [
      'lower_body_strength', 'upper_body_strength',
      'lower_body_flexibility', 'upper_body_flexibility',
      'agility_balance', 'aerobic_endurance',
      'warm_up', 'cool_down',
    ];
    expect(cats).toHaveLength(8);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx vitest run lib/__tests__/schema.test.ts
```
Expected: FAIL — `userCategoryLevels` not exported, `ExerciseCategory` has wrong values.

- [ ] **Step 3: Update `lib/schema.ts`**

Replace the existing `ExerciseCategory` type and add the new table. The complete set of changes to `lib/schema.ts`:

```typescript
// Replace line 50 (old ExerciseCategory):
export type ExerciseCategory =
  | 'lower_body_strength'
  | 'upper_body_strength'
  | 'lower_body_flexibility'
  | 'upper_body_flexibility'
  | 'agility_balance'
  | 'aerobic_endurance'
  | 'warm_up'
  | 'cool_down';

// In the users table, add after dateOfBirth (around line 19):
  reassessmentIntervalWeeks: integer('reassessment_interval_weeks'),
```

Add new table after `pushSubscriptions` (before the relations block):

```typescript
export const userCategoryLevels = pgTable('user_category_level', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  category: text('category').$type<ExerciseCategory>().notNull(),
  level: integer('level').notNull().default(2),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  uniqueUserCategory: unique().on(t.userId, t.category),
}));
```

Add relation at the bottom of `lib/schema.ts`:

```typescript
export const userCategoryLevelRelations = relations(userCategoryLevels, ({ one }) => ({
  user: one(users, { fields: [userCategoryLevels.userId], references: [users.id] }),
}));
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run lib/__tests__/schema.test.ts
```
Expected: PASS (2 tests)

- [ ] **Step 5: Generate and push migration**

```bash
npx drizzle-kit generate
npx drizzle-kit push
```
Expected: two new migration files created in `drizzle/migrations/`, DB updated with `user_category_level` table and `reassessment_interval_weeks` column on `user`.

- [ ] **Step 6: Verify tsc passes**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add lib/schema.ts lib/__tests__/schema.test.ts drizzle/
git commit -m "feat: add user_category_level table, expand ExerciseCategory to 8 values, add reassessmentIntervalWeeks"
```

---

### Task 2: Rewrite `lib/seed-exercises.ts` — 34 exercises across 8 categories, 3 levels each

**Files:**
- Modify: `lib/seed-exercises.ts` (full rewrite)
- Modify: `app/api/seed/route.ts` (clear-then-reseed)

Context: The existing 7 exercises are recategorized (e.g. `static_balance` → `agility_balance`). Their IDs are kept stable. 27 new exercises are added. All exercises have exactly 3 levels (1=Below Average dosage, 2=Average, 3=Above Average). `durationSeconds` is used for timed exercises; `reps` for rep-counted exercises. Strength exercises use reps. Balance, flexibility, warm-up, cool-down, and aerobic use durationSeconds.

- [ ] **Step 1: Fully replace `lib/seed-exercises.ts`**

```typescript
import type { ExerciseCategory } from './schema';

type SeedExercise = {
  id: string;
  name: string;
  category: ExerciseCategory;
  description: string;
  instruction: string;
  animationUrl: string;
};

type SeedLevel = {
  exerciseId: string;
  level: number;
  durationSeconds: number | null;
  reps: number | null;
  difficultyNotes: string;
};

export const EXERCISES: SeedExercise[] = [
  // ── Lower Body Strength ──────────────────────────────────────
  {
    id: 'sit-to-stand',
    name: 'Sit to Stand',
    category: 'lower_body_strength',
    description: 'Rise from a chair without using your hands to strengthen your legs.',
    instruction: 'Sit at the edge of a sturdy chair with feet shoulder-width apart. Cross your arms over your chest. Lean slightly forward and push through your heels to stand fully upright. Lower back down slowly and with control.',
    animationUrl: '/animations/exercises/sit-to-stand.json',
  },
  {
    id: 'calf-raises',
    name: 'Calf Raises',
    category: 'lower_body_strength',
    description: 'Rise onto your toes to strengthen your lower legs and improve ankle stability.',
    instruction: 'Stand behind a sturdy chair and hold the back lightly for balance. Rise slowly onto the balls of your feet, pause at the top, then lower back down with control. Keep your knees straight throughout.',
    animationUrl: '/animations/exercises/calf-raises.json',
  },
  {
    id: 'squats',
    name: 'Squats',
    category: 'lower_body_strength',
    description: 'Bend your knees and hips as if sitting down to build lower-body strength.',
    instruction: 'Stand with feet shoulder-width apart, holding a chair back for support if needed. Push your hips back and bend your knees, lowering as if sitting into a chair. Keep your chest upright and knees behind your toes. Press through your heels to stand back up.',
    animationUrl: '/animations/exercises/squats.json',
  },
  {
    id: 'stationary-lunges',
    name: 'Stationary Lunges',
    category: 'lower_body_strength',
    description: 'Step one foot forward and lower your body to strengthen your thighs and glutes.',
    instruction: 'Stand tall near a wall or chair for support. Step one foot about 60 cm forward. Lower your back knee toward the floor, keeping your front knee above your ankle. Push back up and repeat on the same side before switching legs.',
    animationUrl: '/animations/exercises/stationary-lunges.json',
  },
  {
    id: 'standing-hip-extensions',
    name: 'Standing Hip Extensions',
    category: 'lower_body_strength',
    description: 'Kick your leg backward while standing to strengthen your hips and glutes.',
    instruction: 'Hold a sturdy chair or wall with both hands. Stand on one leg with a slight bend in the knee. Slowly kick the other leg straight back, squeezing your glute at the top. Hold briefly, then return. Keep your back straight throughout.',
    animationUrl: '/animations/exercises/standing-hip-extensions.json',
  },
  {
    id: 'bridges',
    name: 'Bridges',
    category: 'lower_body_strength',
    description: 'Lie on your back and lift your hips to strengthen your glutes and lower back.',
    instruction: 'Lie on your back with knees bent, feet flat on the floor, hip-width apart. Place your arms at your sides. Press through your heels and lift your hips until your body forms a straight line from knees to shoulders. Hold briefly at the top, then lower slowly.',
    animationUrl: '/animations/exercises/bridges.json',
  },

  // ── Upper Body Strength ──────────────────────────────────────
  {
    id: 'wall-push-ups',
    name: 'Wall Push-Ups',
    category: 'upper_body_strength',
    description: 'Push away from a wall to build chest, shoulder, and arm strength safely.',
    instruction: 'Stand an arm\'s length from a wall. Place your palms flat on the wall at shoulder height and width. Bend your elbows and lean toward the wall, then push back to the start. Keep your body in a straight line from head to heels.',
    animationUrl: '/animations/exercises/wall-push-ups.json',
  },
  {
    id: 'bicep-curls',
    name: 'Bicep Curls',
    category: 'upper_body_strength',
    description: 'Curl a light weight or water bottle up to strengthen your upper arms.',
    instruction: 'Sit or stand holding a light weight (0.5–1 kg) in each hand, palms facing forward and arms at your sides. Keeping your upper arms still against your body, bend your elbows and raise the weights to shoulder height. Lower slowly back down.',
    animationUrl: '/animations/exercises/bicep-curls.json',
  },
  {
    id: 'seated-rows',
    name: 'Seated Rows',
    category: 'upper_body_strength',
    description: 'Pull a resistance band or towel toward you while seated to strengthen your upper back.',
    instruction: 'Sit tall in a chair. Loop a resistance band or hold the ends of a towel around a door knob or table leg in front of you. With elbows bent slightly, pull your hands toward your sides, squeezing your shoulder blades together. Hold briefly, then release slowly.',
    animationUrl: '/animations/exercises/seated-rows.json',
  },

  // ── Agility / Balance ────────────────────────────────────────
  {
    id: 'two-foot-stance',
    name: 'Two-Foot Stance',
    category: 'agility_balance',
    description: 'Stand with feet shoulder-width apart to practise steady standing balance.',
    instruction: 'Stand tall with feet shoulder-width apart. Hold a wall or sturdy chair nearby for safety. Relax your shoulders, look straight ahead, and hold steady for the full time.',
    animationUrl: '/animations/exercises/two-foot-stance.json',
  },
  {
    id: 'tandem-stance',
    name: 'Tandem Stance',
    category: 'agility_balance',
    description: 'Stand with one foot directly in front of the other to challenge balance.',
    instruction: 'Place one foot directly in front of the other so the heel of the front foot touches the toes of the back foot. Hold a wall or chair if needed. Look straight ahead and hold steady. Switch feet and repeat.',
    animationUrl: '/animations/exercises/tandem-stance.json',
  },
  {
    id: 'single-leg-stand',
    name: 'Single-Leg Stand',
    category: 'agility_balance',
    description: 'Balance on one foot to build ankle stability and core control.',
    instruction: 'Stand behind a sturdy chair. Lift one foot slightly off the ground and hold your balance. Keep a slight bend in the standing knee. Use the chair only if you start to lose balance. Switch feet after the hold.',
    animationUrl: '/animations/exercises/single-leg-stand.json',
  },
  {
    id: 'heel-to-toe-walk',
    name: 'Heel-to-Toe Walk',
    category: 'agility_balance',
    description: 'Walk in a straight line placing each heel directly in front of the opposite toes.',
    instruction: 'Walk slowly along a straight line on the floor, placing the heel of each front foot against the toes of the back foot with each step. Keep your arms slightly out to help balance. Take 10 steps forward, then turn carefully and return.',
    animationUrl: '/animations/exercises/heel-to-toe-walk.json',
  },
  {
    id: 'weight-shifts',
    name: 'Weight Shifts',
    category: 'agility_balance',
    description: 'Slowly shift your weight from side to side to improve dynamic balance.',
    instruction: 'Stand with feet shoulder-width apart, holding a chair back lightly. Slowly shift your weight to your right foot, lifting the left foot slightly. Hold briefly, then shift to your left foot. Move slowly and with control.',
    animationUrl: '/animations/exercises/weight-shifts.json',
  },
  {
    id: 'clock-reach',
    name: 'Clock Reach',
    category: 'agility_balance',
    description: 'Balance on one leg and reach your free foot to positions around an imaginary clock face.',
    instruction: 'Stand on your right foot near a wall for safety. Imagine a clock on the floor around you. Reach your left foot to the 12 o\'clock position in front, then 9 o\'clock to the side, then 6 o\'clock behind — without touching the floor between reaches. Switch feet.',
    animationUrl: '/animations/exercises/clock-reach.json',
  },
  {
    id: 'side-stepping',
    name: 'Side Stepping',
    category: 'agility_balance',
    description: 'Step sideways along a line to build lateral stability and agility.',
    instruction: 'Stand at one end of a clear space of about 3 metres. Step sideways to the right, bringing your left foot to meet your right. Keep your feet from crossing. At the end, step back in the opposite direction. Maintain an upright posture throughout.',
    animationUrl: '/animations/exercises/side-stepping.json',
  },

  // ── Aerobic Endurance ────────────────────────────────────────
  {
    id: 'marching-in-place',
    name: 'Marching in Place',
    category: 'aerobic_endurance',
    description: 'Lift your knees alternately while standing to raise your heart rate safely.',
    instruction: 'Stand behind a chair and hold the back lightly if needed. Lift your right knee to hip height, lower it, then lift your left knee. March at a comfortable, steady pace. Swing your arms naturally if you feel stable.',
    animationUrl: '/animations/exercises/marching-in-place.json',
  },
  {
    id: 'walking-program',
    name: 'Walking Program',
    category: 'aerobic_endurance',
    description: 'Walk at a brisk but comfortable pace to build aerobic endurance.',
    instruction: 'Choose a safe, flat route indoors or outdoors. Walk at a pace where you can speak short sentences but still feel some effort. Rest if needed. Start at the low end of your time goal and gradually increase as you feel stronger.',
    animationUrl: '/animations/exercises/walking-program.json',
  },
  {
    id: 'step-ups',
    name: 'Step-Ups',
    category: 'aerobic_endurance',
    description: 'Step onto a low, stable step and back down to build lower-body endurance.',
    instruction: 'Stand in front of a low step (10–15 cm) with a handrail or wall nearby. Step up with your right foot, bring your left foot up, then step down right then left. Alternate the leading foot each time. Move at a steady, controlled pace.',
    animationUrl: '/animations/exercises/step-ups.json',
  },
  {
    id: 'seated-cardio-marches',
    name: 'Seated Cardio Marches',
    category: 'aerobic_endurance',
    description: 'March your legs while seated in a chair to boost circulation without standing.',
    instruction: 'Sit upright in a sturdy chair with feet flat on the floor. Lift your right knee toward your chest, lower it, then lift your left knee. Build a steady rhythm. Pump your arms to increase the effort. Rest briefly if needed, then continue.',
    animationUrl: '/animations/exercises/seated-cardio-marches.json',
  },
  {
    id: 'low-impact-cardio-circuit',
    name: 'Low-Impact Cardio Circuit',
    category: 'aerobic_endurance',
    description: 'Cycle through three simple movements to keep your heart rate elevated without impact.',
    instruction: 'Cycle through these three movements, spending equal time on each: (1) Marching in place, (2) Side-stepping left and right, (3) Seated cardio marches. Move at a comfortable pace and rest whenever needed. Each cycle takes about 1 minute.',
    animationUrl: '/animations/exercises/low-impact-cardio-circuit.json',
  },

  // ── Lower Body Flexibility ───────────────────────────────────
  {
    id: 'chair-sit-reach-stretch',
    name: 'Chair Sit and Reach Stretch',
    category: 'lower_body_flexibility',
    description: 'Reach toward your toes while seated to stretch your hamstrings.',
    instruction: 'Sit on the edge of a chair. Extend one leg straight in front with your heel on the floor and toes pointing up. Place one hand on top of the other. Breathe in, then breathe out as you lean forward slowly, reaching toward your toes. Hold the stretch — do not bounce. Keep your back straight.',
    animationUrl: '/animations/exercises/chair-sit-reach-stretch.json',
  },
  {
    id: 'hamstring-stretch',
    name: 'Hamstring Stretch',
    category: 'lower_body_flexibility',
    description: 'Stretch the back of your thigh while standing to improve lower-body flexibility.',
    instruction: 'Stand near a wall or chair for support. Step one foot forward and place your heel on the floor with your toes pointing up. Keep the front leg straight and your back upright. Gently bend your back knee and lean your hips forward until you feel a stretch along the back of your front thigh. Hold still.',
    animationUrl: '/animations/exercises/hamstring-stretch.json',
  },
  {
    id: 'calf-stretch',
    name: 'Calf Stretch',
    category: 'lower_body_flexibility',
    description: 'Stretch your calf muscles against a wall to reduce tightness and improve ankle flexibility.',
    instruction: 'Stand facing a wall with your hands flat against it at shoulder height. Step one foot back about 60 cm, keeping that heel on the floor and toes pointing forward. Bend your front knee slightly while keeping the back leg straight. Lean toward the wall until you feel a stretch in the back calf. Hold.',
    animationUrl: '/animations/exercises/calf-stretch.json',
  },

  // ── Upper Body Flexibility ───────────────────────────────────
  {
    id: 'chest-stretch',
    name: 'Chest Stretch',
    category: 'upper_body_flexibility',
    description: 'Open your arms wide to stretch the chest and improve upper-body posture.',
    instruction: 'Sit or stand tall. Bring both arms out to your sides at shoulder height. Slowly draw your arms back, squeezing your shoulder blades together and opening your chest toward the ceiling. Hold the stretch, breathing normally. Release slowly.',
    animationUrl: '/animations/exercises/chest-stretch.json',
  },
  {
    id: 'shoulder-stretch',
    name: 'Shoulder Stretch',
    category: 'upper_body_flexibility',
    description: 'Pull one arm across your chest to stretch the back of your shoulder.',
    instruction: 'Sit or stand tall. Bring your right arm straight across your chest at shoulder height. Use your left hand to gently pull your right arm closer to your chest until you feel a stretch in the back of your right shoulder. Keep your right shoulder down. Hold, then switch arms.',
    animationUrl: '/animations/exercises/shoulder-stretch.json',
  },
  {
    id: 'back-scratch-stretch',
    name: 'Back Scratch Stretch',
    category: 'upper_body_flexibility',
    description: 'Reach one hand over your shoulder and down your back to stretch the triceps and shoulder.',
    instruction: 'Sit or stand tall. Raise your right arm and bend it at the elbow, reaching your right hand down toward your upper back. Use your left hand to gently press the right elbow down for a deeper stretch. Hold without forcing. Switch arms.',
    animationUrl: '/animations/exercises/back-scratch-stretch.json',
  },
  {
    id: 'trunk-rotation-stretch',
    name: 'Trunk Rotation Stretch',
    category: 'upper_body_flexibility',
    description: 'Gently twist your upper body while seated to improve spinal flexibility.',
    instruction: 'Sit upright in a chair with feet flat on the floor. Cross your arms over your chest. Slowly rotate your upper body to the right as far as is comfortable, looking over your right shoulder. Hold, then return to centre. Repeat on the left. Move gently — do not jerk.',
    animationUrl: '/animations/exercises/trunk-rotation-stretch.json',
  },

  // ── Warm-Up ──────────────────────────────────────────────────
  {
    id: 'gentle-marching-warmup',
    name: 'Gentle Marching',
    category: 'warm_up',
    description: 'March slowly in place to warm up your muscles and increase circulation before exercise.',
    instruction: 'Stand behind a chair and hold the back lightly. Begin slowly lifting alternate knees, no higher than hip height. Swing your arms gently. Breathe steadily. Gradually increase your pace over the first 30 seconds until you feel your body warming up.',
    animationUrl: '/animations/exercises/gentle-marching-warmup.json',
  },
  {
    id: 'arm-circles',
    name: 'Arm Circles',
    category: 'warm_up',
    description: 'Roll your shoulders and circle your arms to warm up your shoulder joints.',
    instruction: 'Stand or sit tall. Extend both arms out to your sides at shoulder height. Draw small circles forward, gradually making the circles larger. After half the time, reverse direction. Keep your movements smooth and controlled. Then let your arms rest and roll your shoulders gently backward.',
    animationUrl: '/animations/exercises/arm-circles.json',
  },
  {
    id: 'ankle-wrist-rolls',
    name: 'Ankle and Wrist Rolls',
    category: 'warm_up',
    description: 'Gently rotate your ankles and wrists to mobilise the small joints before exercise.',
    instruction: 'Sit in a chair. Lift your right foot off the floor and slowly draw circles with your toes — 5 circles clockwise, then 5 counterclockwise. Switch feet. Then extend both arms in front of you and rotate your wrists — 5 circles each direction. Breathe normally throughout.',
    animationUrl: '/animations/exercises/ankle-wrist-rolls.json',
  },

  // ── Cool-Down ─────────────────────────────────────────────────
  {
    id: 'seated-deep-breathing',
    name: 'Seated Deep Breathing',
    category: 'cool_down',
    description: 'Slow, controlled breathing to lower your heart rate and calm the body after exercise.',
    instruction: 'Sit comfortably with your back supported. Place one hand on your chest and one on your belly. Breathe in through your nose for 4 counts, feeling your belly rise. Hold gently for 2 counts. Breathe out through your mouth for 6 counts. Repeat throughout the session.',
    animationUrl: '/animations/exercises/seated-deep-breathing.json',
  },
  {
    id: 'gentle-full-body-stretch',
    name: 'Gentle Full-Body Stretch',
    category: 'cool_down',
    description: 'Reach your arms overhead and lengthen your whole body to ease tension after exercise.',
    instruction: 'Sit tall in a chair with feet flat on the floor. Interlace your fingers and turn palms outward. Raise your arms overhead, straightening your elbows and lengthening your spine. Hold the stretch while breathing slowly. Lower your arms, then gently roll your neck from side to side.',
    animationUrl: '/animations/exercises/gentle-full-body-stretch.json',
  },
  {
    id: 'slow-marching-cooldown',
    name: 'Slow Marching Cool-Down',
    category: 'cool_down',
    description: 'March at a very slow pace to gradually bring your heart rate down after exercise.',
    instruction: 'Stand behind a chair and hold the back lightly. March very slowly — even slower than a warm-up pace. Let your breathing settle. After about a minute, slow to a gentle sway from foot to foot. Focus on lengthening each breath out.',
    animationUrl: '/animations/exercises/slow-marching-cooldown.json',
  },
];

// ── Exercise levels (3 per exercise) ─────────────────────────
// Strength: reps-based. Balance/Flexibility/Warm-up/Cool-down: duration-based.
// Aerobic: duration-based (seconds).
// Level 1 = Below Average dosage, 2 = Average, 3 = Above Average.

const strengthLevels = (id: string): SeedLevel[] => [
  { exerciseId: id, level: 1, durationSeconds: null, reps: 8,  difficultyNotes: '1–2 sets. Use a chair for support. Rest 60 s between sets.' },
  { exerciseId: id, level: 2, durationSeconds: null, reps: 10, difficultyNotes: '2–3 sets. Light support only if needed. Rest 45 s between sets.' },
  { exerciseId: id, level: 3, durationSeconds: null, reps: 12, difficultyNotes: '3 sets. No support. Slow the lowering phase (3 counts down). Rest 30 s between sets.' },
];

const balanceLevels = (id: string): SeedLevel[] => [
  { exerciseId: id, level: 1, durationSeconds: 15, reps: null, difficultyNotes: 'Chair or wall support allowed. Eyes open.' },
  { exerciseId: id, level: 2, durationSeconds: 25, reps: null, difficultyNotes: 'Fingertip support only. Eyes open.' },
  { exerciseId: id, level: 3, durationSeconds: 45, reps: null, difficultyNotes: 'No support. Try gentle head turns.' },
];

const flexLevels = (id: string): SeedLevel[] => [
  { exerciseId: id, level: 1, durationSeconds: 15, reps: null, difficultyNotes: 'Hold gently — no bouncing. Breathe out into the stretch.' },
  { exerciseId: id, level: 2, durationSeconds: 20, reps: null, difficultyNotes: 'Deepen the stretch slightly with each breath out.' },
  { exerciseId: id, level: 3, durationSeconds: 30, reps: null, difficultyNotes: 'Hold at the limit of your comfortable range. Breathe slowly.' },
];

const cardioLevels = (id: string): SeedLevel[] => [
  { exerciseId: id, level: 1, durationSeconds: 420,  reps: null, difficultyNotes: '7 minutes. Rest whenever needed. Aim to talk in short sentences.' },
  { exerciseId: id, level: 2, durationSeconds: 900,  reps: null, difficultyNotes: '15 minutes. Rest only if necessary. Maintain a steady pace.' },
  { exerciseId: id, level: 3, durationSeconds: 1500, reps: null, difficultyNotes: '25 minutes. Minimal rest. Challenge yourself to keep moving.' },
];

const warmCoolLevels = (id: string): SeedLevel[] => [
  { exerciseId: id, level: 1, durationSeconds: 120, reps: null, difficultyNotes: '2 minutes. Very easy pace to prepare the body.' },
  { exerciseId: id, level: 2, durationSeconds: 180, reps: null, difficultyNotes: '3 minutes. Comfortable pace.' },
  { exerciseId: id, level: 3, durationSeconds: 240, reps: null, difficultyNotes: '4 minutes. Thorough preparation or wind-down.' },
];

export const EXERCISE_LEVELS: SeedLevel[] = [
  // lower_body_strength
  ...strengthLevels('sit-to-stand'),
  ...strengthLevels('calf-raises'),
  ...strengthLevels('squats'),
  ...strengthLevels('stationary-lunges'),
  ...strengthLevels('standing-hip-extensions'),
  ...strengthLevels('bridges'),
  // upper_body_strength
  ...strengthLevels('wall-push-ups'),
  ...strengthLevels('bicep-curls'),
  ...strengthLevels('seated-rows'),
  // agility_balance
  ...balanceLevels('two-foot-stance'),
  ...balanceLevels('tandem-stance'),
  ...balanceLevels('single-leg-stand'),
  ...balanceLevels('heel-to-toe-walk'),
  ...balanceLevels('weight-shifts'),
  ...balanceLevels('clock-reach'),
  ...balanceLevels('side-stepping'),
  // aerobic_endurance
  ...cardioLevels('marching-in-place'),
  ...cardioLevels('walking-program'),
  ...cardioLevels('step-ups'),
  ...cardioLevels('seated-cardio-marches'),
  ...cardioLevels('low-impact-cardio-circuit'),
  // lower_body_flexibility
  ...flexLevels('chair-sit-reach-stretch'),
  ...flexLevels('hamstring-stretch'),
  ...flexLevels('calf-stretch'),
  // upper_body_flexibility
  ...flexLevels('chest-stretch'),
  ...flexLevels('shoulder-stretch'),
  ...flexLevels('back-scratch-stretch'),
  ...flexLevels('trunk-rotation-stretch'),
  // warm_up
  ...warmCoolLevels('gentle-marching-warmup'),
  ...warmCoolLevels('arm-circles'),
  ...warmCoolLevels('ankle-wrist-rolls'),
  // cool_down
  ...warmCoolLevels('seated-deep-breathing'),
  ...warmCoolLevels('gentle-full-body-stretch'),
  ...warmCoolLevels('slow-marching-cooldown'),
];
```

- [ ] **Step 2: Update `app/api/seed/route.ts` to clear-then-reseed**

```typescript
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { exercises, exerciseLevels, userExercisePlan, userCategoryLevels } from '@/lib/schema';
import { EXERCISES, EXERCISE_LEVELS } from '@/lib/seed-exercises';

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
  }
  // Clear in dependency order so FKs don't block
  await db.delete(userExercisePlan);
  await db.delete(userCategoryLevels);
  await db.delete(exerciseLevels);
  await db.delete(exercises);
  // Reseed
  await db.insert(exercises).values(EXERCISES);
  await db.insert(exerciseLevels).values(
    EXERCISE_LEVELS.map((l) => ({ ...l, id: crypto.randomUUID() }))
  );
  return NextResponse.json({ ok: true, exerciseCount: EXERCISES.length, levelCount: EXERCISE_LEVELS.length });
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/seed-exercises.ts app/api/seed/route.ts
git commit -m "feat: expand exercise library to 34 exercises across 8 categories with 3-tier levels"
```

---

### Task 3: `lib/prescription/levels.ts` — `computeCategoryLevels` (TDD)

**Files:**
- Create: `lib/prescription/__tests__/levels.test.ts`
- Create: `lib/prescription/levels.ts`

Context: converts per-domain `AssessmentCategory | null` results into per-ExerciseCategory level 1–3. `null` (unscored — always chair_stand and arm_curl) → 2 (Average dosage). `warm_up` and `cool_down` are always 2.

- [ ] **Step 1: Write failing tests**

Create `lib/prescription/__tests__/levels.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { computeCategoryLevels } from '../levels';

describe('computeCategoryLevels', () => {
  it('maps below_average → 1', () => {
    const result = computeCategoryLevels({
      lower_body_strength: 'below_average',
      upper_body_strength: 'average',
      lower_body_flexibility: 'average',
      upper_body_flexibility: 'average',
      agility_balance: 'average',
      aerobic_endurance: 'average',
    });
    expect(result.lower_body_strength).toBe(1);
    expect(result.upper_body_strength).toBe(2);
  });

  it('maps above_average → 3', () => {
    const result = computeCategoryLevels({
      lower_body_strength: 'average',
      upper_body_strength: 'above_average',
      lower_body_flexibility: 'above_average',
      upper_body_flexibility: 'average',
      agility_balance: 'average',
      aerobic_endurance: 'average',
    });
    expect(result.upper_body_strength).toBe(3);
    expect(result.lower_body_flexibility).toBe(3);
  });

  it('maps null (unscored) → 2', () => {
    const result = computeCategoryLevels({
      lower_body_strength: null,
      upper_body_strength: null,
      lower_body_flexibility: 'average',
      upper_body_flexibility: 'average',
      agility_balance: 'average',
      aerobic_endurance: 'average',
    });
    expect(result.lower_body_strength).toBe(2);
    expect(result.upper_body_strength).toBe(2);
  });

  it('always returns 2 for warm_up and cool_down regardless of domains', () => {
    const result = computeCategoryLevels({
      lower_body_strength: 'below_average',
      upper_body_strength: 'below_average',
      lower_body_flexibility: 'below_average',
      upper_body_flexibility: 'below_average',
      agility_balance: 'below_average',
      aerobic_endurance: 'below_average',
    });
    expect(result.warm_up).toBe(2);
    expect(result.cool_down).toBe(2);
  });

  it('returns all 8 categories', () => {
    const result = computeCategoryLevels({
      lower_body_strength: 'average', upper_body_strength: 'average',
      lower_body_flexibility: 'average', upper_body_flexibility: 'average',
      agility_balance: 'average', aerobic_endurance: 'average',
    });
    expect(Object.keys(result)).toHaveLength(8);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx vitest run lib/prescription/__tests__/levels.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Create `lib/prescription/levels.ts`**

```typescript
import type { ExerciseCategory } from '@/lib/schema';
import type { Domain, DomainCategories } from '@/lib/assessment/scoring';

const DOMAIN_TO_CATEGORY: Record<Domain, ExerciseCategory> = {
  lower_body_strength: 'lower_body_strength',
  upper_body_strength: 'upper_body_strength',
  lower_body_flexibility: 'lower_body_flexibility',
  upper_body_flexibility: 'upper_body_flexibility',
  agility_balance: 'agility_balance',
  aerobic_endurance: 'aerobic_endurance',
};

export function computeCategoryLevels(
  domains: DomainCategories
): Record<ExerciseCategory, number> {
  const result: Record<ExerciseCategory, number> = {
    lower_body_strength: 2, upper_body_strength: 2,
    lower_body_flexibility: 2, upper_body_flexibility: 2,
    agility_balance: 2, aerobic_endurance: 2,
    warm_up: 2, cool_down: 2,
  };
  for (const [domain, category] of Object.entries(DOMAIN_TO_CATEGORY) as [Domain, ExerciseCategory][]) {
    const cat = domains[domain];
    if (cat === 'below_average') result[category] = 1;
    else if (cat === 'above_average') result[category] = 3;
    // null or 'average' → remains 2
  }
  return result;
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run lib/prescription/__tests__/levels.test.ts
```
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/prescription/
git commit -m "feat: add computeCategoryLevels to map assessment domains to 3-tier exercise levels"
```

---

### Task 4: `lib/prescription/daily-plan.ts` — `buildDailyPlan` (TDD) + remove old `lib/progression.ts`

**Files:**
- Create: `lib/prescription/__tests__/daily-plan.test.ts`
- Create: `lib/prescription/daily-plan.ts`
- Delete: `lib/progression.ts`
- Delete: `lib/__tests__/progression.test.ts`

Context: `buildDailyPlan` produces exactly 8 exercises: 1 warm_up → 3 strength → 1 agility_balance → 1 flexibility → 1 aerobic_endurance → 1 cool_down. Strength uses a 2-to-1 split weighted toward the Below Average sub-category (level 1). Tie-break by dayOfMonth parity (even → lower_body_strength gets 2 slots, odd → upper_body_strength gets 2 slots). Same rule for flexibility. Always picks the first exercise in category's list (index 0).

- [ ] **Step 1: Write failing tests**

Create `lib/prescription/__tests__/daily-plan.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildDailyPlan } from '../daily-plan';
import type { ExerciseCategory } from '@/lib/schema';

const defaultLevels: Record<ExerciseCategory, number> = {
  lower_body_strength: 2, upper_body_strength: 2,
  lower_body_flexibility: 2, upper_body_flexibility: 2,
  agility_balance: 2, aerobic_endurance: 2,
  warm_up: 2, cool_down: 2,
};

const defaultExercises: Record<ExerciseCategory, string[]> = {
  lower_body_strength: ['lbs-1', 'lbs-2'],
  upper_body_strength: ['ubs-1', 'ubs-2'],
  lower_body_flexibility: ['lbf-1'],
  upper_body_flexibility: ['ubf-1'],
  agility_balance: ['ab-1', 'ab-2'],
  aerobic_endurance: ['ae-1'],
  warm_up: ['wu-1'],
  cool_down: ['cd-1'],
};

describe('buildDailyPlan', () => {
  it('always returns exactly 8 exercises', () => {
    const plan = buildDailyPlan(defaultLevels, defaultExercises, 1);
    expect(plan).toHaveLength(8);
  });

  it('first slot is warm_up, last slot is cool_down', () => {
    const plan = buildDailyPlan(defaultLevels, defaultExercises, 1);
    expect(plan[0].exerciseId).toBe('wu-1');
    expect(plan[7].exerciseId).toBe('cd-1');
  });

  it('includes exactly 1 agility_balance and 1 aerobic_endurance slot', () => {
    const plan = buildDailyPlan(defaultLevels, defaultExercises, 1);
    const ab = plan.filter((p) => p.exerciseId === 'ab-1');
    const ae = plan.filter((p) => p.exerciseId === 'ae-1');
    expect(ab).toHaveLength(1);
    expect(ae).toHaveLength(1);
  });

  it('assigns the category-fixed level to each slot', () => {
    const levels = { ...defaultLevels, lower_body_strength: 1 };
    const plan = buildDailyPlan(levels, defaultExercises, 1);
    const strengthSlots = plan.filter((p) => p.exerciseId === 'lbs-1');
    expect(strengthSlots.every((s) => s.level === 1)).toBe(true);
  });

  it('gives 2 slots to below-average lower_body_strength and 1 to upper', () => {
    const levels = { ...defaultLevels, lower_body_strength: 1 };
    const plan = buildDailyPlan(levels, defaultExercises, 1);
    const lbsCount = plan.filter((p) => p.exerciseId === 'lbs-1').length;
    expect(lbsCount).toBe(2);
  });

  it('gives 2 slots to below-average upper_body_strength and 1 to lower', () => {
    const levels = { ...defaultLevels, upper_body_strength: 1 };
    const plan = buildDailyPlan(levels, defaultExercises, 1);
    const ubsCount = plan.filter((p) => p.exerciseId === 'ubs-1').length;
    expect(ubsCount).toBe(2);
  });

  it('on even day with no below-average: 2 lower_body_strength, 1 upper_body_strength', () => {
    const plan = buildDailyPlan(defaultLevels, defaultExercises, 2); // even
    const lbsCount = plan.filter((p) => p.exerciseId === 'lbs-1').length;
    expect(lbsCount).toBe(2);
  });

  it('on odd day with no below-average: 1 lower_body_strength, 2 upper_body_strength', () => {
    const plan = buildDailyPlan(defaultLevels, defaultExercises, 3); // odd
    const ubsCount = plan.filter((p) => p.exerciseId === 'ubs-1').length;
    expect(ubsCount).toBe(2);
  });

  it('order field is 1-indexed and sequential', () => {
    const plan = buildDailyPlan(defaultLevels, defaultExercises, 1);
    expect(plan.map((p) => p.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx vitest run lib/prescription/__tests__/daily-plan.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Create `lib/prescription/daily-plan.ts`**

```typescript
import type { ExerciseCategory } from '@/lib/schema';

export function buildDailyPlan(
  categoryLevels: Record<ExerciseCategory, number>,
  exercisesByCategory: Record<ExerciseCategory, string[]>,
  dayOfMonth: number
): Array<{ exerciseId: string; level: number; order: number }> {
  const pick = (cat: ExerciseCategory) => ({
    exerciseId: exercisesByCategory[cat][0],
    level: categoryLevels[cat],
  });

  // Strength split: 3 slots between lower_body_strength and upper_body_strength
  const lbsBelowAvg = categoryLevels.lower_body_strength === 1;
  const ubsBelowAvg = categoryLevels.upper_body_strength === 1;
  let lbsCount: number;
  if (lbsBelowAvg && !ubsBelowAvg) lbsCount = 2;
  else if (ubsBelowAvg && !lbsBelowAvg) lbsCount = 1;
  else lbsCount = dayOfMonth % 2 === 0 ? 2 : 1; // tie-break: even → lower gets 2
  const ubsCount = 3 - lbsCount;

  // Flexibility split: 1 slot choosing lower_body_flexibility or upper_body_flexibility
  const lbfBelowAvg = categoryLevels.lower_body_flexibility === 1;
  const ubfBelowAvg = categoryLevels.upper_body_flexibility === 1;
  let flexCat: 'lower_body_flexibility' | 'upper_body_flexibility';
  if (lbfBelowAvg && !ubfBelowAvg) flexCat = 'lower_body_flexibility';
  else if (ubfBelowAvg && !lbfBelowAvg) flexCat = 'upper_body_flexibility';
  else flexCat = dayOfMonth % 2 === 0 ? 'lower_body_flexibility' : 'upper_body_flexibility';

  const slots = [
    pick('warm_up'),
    ...Array(lbsCount).fill(null).map(() => pick('lower_body_strength')),
    ...Array(ubsCount).fill(null).map(() => pick('upper_body_strength')),
    pick('agility_balance'),
    pick(flexCat),
    pick('aerobic_endurance'),
    pick('cool_down'),
  ];

  return slots.map((s, i) => ({ ...s, order: i + 1 }));
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run lib/prescription/__tests__/daily-plan.test.ts
```
Expected: PASS (9 tests).

- [ ] **Step 5: Delete old progression files**

```bash
rm lib/progression.ts lib/__tests__/progression.test.ts
```

- [ ] **Step 6: Verify full test suite still passes**

```bash
npx vitest run
```
Expected: all remaining tests pass. The deleted progression tests no longer exist.

- [ ] **Step 7: Commit**

```bash
git add lib/prescription/ lib/progression.ts lib/__tests__/progression.test.ts
git commit -m "feat: add buildDailyPlan prescription engine, remove old 5-level progression engine"
```

---

### Task 5: `lib/assessment/trends.ts` — `compareAssessments` (TDD)

**Files:**
- Create: `lib/assessment/__tests__/trends.test.ts`
- Create: `lib/assessment/trends.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/assessment/__tests__/trends.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { compareAssessments } from '../trends';

const makeSession = (overrides: Record<string, { score: number; category: 'below_average' | 'average' | 'above_average' | null }>, overallScore: number | null = null) => ({
  stationResults: Object.entries(overrides).map(([station, data]) => ({
    station: station as import('@/lib/schema').AssessmentStation,
    score: data.score,
    category: data.category,
    unit: 'reps',
  })),
  overallScore,
});

describe('compareAssessments', () => {
  it('computes score delta per domain', () => {
    const prev = makeSession({ chair_stand: { score: 10, category: 'below_average' } });
    const curr = makeSession({ chair_stand: { score: 14, category: 'average' } });
    const result = compareAssessments(prev, curr);
    const lbs = result.domainDeltas.find((d) => d.domain === 'lower_body_strength');
    expect(lbs?.scoreDelta).toBe(4);
  });

  it('detects category improvement', () => {
    const prev = makeSession({ up_and_go: { score: 8.5, category: 'below_average' } });
    const curr = makeSession({ up_and_go: { score: 6.0, category: 'average' } });
    const result = compareAssessments(prev, curr);
    const ab = result.domainDeltas.find((d) => d.domain === 'agility_balance');
    expect(ab?.improved).toBe(true);
    expect(ab?.categoryChanged).toBe(true);
  });

  it('computes overall score delta', () => {
    const prev = makeSession({}, 10);
    const curr = makeSession({}, 14);
    const result = compareAssessments(prev, curr);
    expect(result.overallScoreDelta).toBe(4);
  });

  it('returns null score delta when either session has no result for that domain', () => {
    const prev = makeSession({});
    const curr = makeSession({ chair_stand: { score: 12, category: 'average' } });
    const result = compareAssessments(prev, curr);
    const lbs = result.domainDeltas.find((d) => d.domain === 'lower_body_strength');
    expect(lbs?.scoreDelta).toBeNull();
  });

  it('returns null overall delta when either session lacks an overall score', () => {
    const prev = makeSession({}, null);
    const curr = makeSession({}, 12);
    const result = compareAssessments(prev, curr);
    expect(result.overallScoreDelta).toBeNull();
  });

  it('deduplicates aerobic_endurance domain when step_test and walk_test both appear', () => {
    const prev = makeSession({ step_test: { score: 80, category: 'average' } });
    const curr = makeSession({ walk_test: { score: 550, category: 'above_average' } });
    const result = compareAssessments(prev, curr);
    const aerobic = result.domainDeltas.filter((d) => d.domain === 'aerobic_endurance');
    expect(aerobic).toHaveLength(1);
  });

  it('returns exactly 6 domain deltas', () => {
    const prev = makeSession({});
    const curr = makeSession({});
    const result = compareAssessments(prev, curr);
    expect(result.domainDeltas).toHaveLength(6);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx vitest run lib/assessment/__tests__/trends.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Create `lib/assessment/trends.ts`**

```typescript
import type { AssessmentStation, AssessmentCategory } from '@/lib/schema';
import type { Domain } from './scoring';
import { STATION_TO_DOMAIN } from './scoring';

type StationResult = {
  station: AssessmentStation;
  score: number | null;
  category: AssessmentCategory | null;
  unit: string;
};

type SessionForComparison = {
  stationResults: StationResult[];
  overallScore: number | null;
};

export type DomainDelta = {
  domain: Domain;
  previousCategory: AssessmentCategory | null;
  currentCategory: AssessmentCategory | null;
  previousScore: number | null;
  currentScore: number | null;
  unit: string | null;
  scoreDelta: number | null;
  categoryChanged: boolean;
  improved: boolean;
};

export type ComparisonResult = {
  domainDeltas: DomainDelta[];
  overallScoreDelta: number | null;
};

const ALL_DOMAINS: Domain[] = [
  'lower_body_strength', 'upper_body_strength',
  'lower_body_flexibility', 'upper_body_flexibility',
  'agility_balance', 'aerobic_endurance',
];

const CATEGORY_ORDER: Record<AssessmentCategory, number> = {
  below_average: 0, average: 1, above_average: 2,
};

export function compareAssessments(
  previous: SessionForComparison,
  current: SessionForComparison,
): ComparisonResult {
  const domainDeltas: DomainDelta[] = ALL_DOMAINS.map((domain) => {
    const stationsForDomain = (Object.entries(STATION_TO_DOMAIN) as [AssessmentStation, Domain][])
      .filter(([, d]) => d === domain)
      .map(([s]) => s);

    const prevResult = previous.stationResults.find((r) => stationsForDomain.includes(r.station));
    const currResult = current.stationResults.find((r) => stationsForDomain.includes(r.station));

    const prevScore = prevResult?.score ?? null;
    const currScore = currResult?.score ?? null;
    const scoreDelta = prevScore !== null && currScore !== null ? currScore - prevScore : null;
    const prevCategory = prevResult?.category ?? null;
    const currCategory = currResult?.category ?? null;
    const categoryChanged = prevCategory !== currCategory;

    const improved =
      prevCategory !== null && currCategory !== null
        ? CATEGORY_ORDER[currCategory] > CATEGORY_ORDER[prevCategory]
        : scoreDelta !== null && scoreDelta > 0;

    return {
      domain, previousCategory: prevCategory, currentCategory: currCategory,
      previousScore: prevScore, currentScore: currScore,
      unit: currResult?.unit ?? prevResult?.unit ?? null,
      scoreDelta, categoryChanged, improved,
    };
  });

  const overallScoreDelta =
    previous.overallScore !== null && current.overallScore !== null
      ? current.overallScore - previous.overallScore
      : null;

  return { domainDeltas, overallScoreDelta };
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run lib/assessment/__tests__/trends.test.ts
```
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/assessment/trends.ts lib/assessment/__tests__/trends.test.ts
git commit -m "feat: add compareAssessments for trend comparison between assessment sessions"
```

---

### Task 6: Update Coach — guardrails, system prompt, tools

**Files:**
- Modify: `lib/coach/guardrails.ts`
- Modify: `lib/coach/system-prompt.ts`
- Modify: `lib/coach/tools.ts`

Context: Levels are now fixed per category and can only change via reassessment. Coach can only swap exercises within the same category at the user's fixed level. `validatePlanUpdate` now enforces fixed levels rather than clamping to +1/day. The Coach tool input schema changes to allow up to 8 exercises (one per slot) at levels 1–3.

- [ ] **Step 1: Update `lib/coach/guardrails.ts`**

Full file replacement:

```typescript
import type { ExerciseCategory } from '@/lib/schema';

const PAIN_KEYWORDS = ['pain', 'hurt', 'hurts', 'hurting', 'ache', 'aching', 'fall', 'fell', 'injured', 'injury', 'sore', 'soreness', 'dizzy', 'dizziness', 'nausea', 'nauseous', 'chest', 'breathe', 'breathing', 'faint', 'fainting', 'lightheaded', 'numbness', 'numb'];

export const PAIN_RESPONSE = "I'm concerned about what you've shared. Please stop exercising and speak with your doctor before continuing. Your safety is the most important thing. 🌿";

export function containsPainKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  return PAIN_KEYWORDS.some((kw) => lower.includes(kw));
}

export function validatePlanUpdate(
  entries: Array<{ exercise_id: string; level: number }>,
  exerciseCategoryMap: Record<string, ExerciseCategory>,
  categoryLevels: Record<ExerciseCategory, number>
): Array<{ exercise_id: string; level: number }> {
  return entries.map((e) => {
    const category = exerciseCategoryMap[e.exercise_id];
    const fixedLevel = category !== undefined ? (categoryLevels[category] ?? 2) : 2;
    return { ...e, level: fixedLevel };
  });
}
```

- [ ] **Step 2: Update `lib/coach/system-prompt.ts`**

Full file replacement:

```typescript
type Props = {
  userName: string;
  todayPlan: Array<{ name: string; level: number; category: string }>;
  recentSummary: string;
};

export function buildSystemPrompt({ userName, todayPlan, recentSummary }: Props): string {
  const planStr = todayPlan.length
    ? todayPlan.map((p) => `${p.name} (${p.category}, Level ${p.level})`).join(', ')
    : 'No plan set yet';

  return `You are Coach Mei, a warm and encouraging balance exercise coach for older adults. Your user is ${userName}, exercising at home in Taiwan.

Current plan: ${planStr}
Recent history: ${recentSummary || 'No recent sessions yet.'}

Rules you must follow:
- Each exercise category has a fixed level set by the participant's last fitness assessment. You must NEVER change an exercise's level. Always keep the exact level shown in the current plan.
- You can suggest swapping one exercise for a different one, but only within the same category. For example, you may replace a lower_body_strength exercise with another lower_body_strength exercise — never with an exercise from a different category.
- Levels only change when the participant retakes their full fitness assessment.
- If the user mentions pain, instruct them to stop and consult a doctor — do not modify the plan.
- Keep all responses under 3 sentences, plain simple language.
- Be warm, patient, and encouraging — never clinical or cold.
- When you update the exercise plan, always confirm the change in your reply.`;
}
```

- [ ] **Step 3: Update `lib/coach/tools.ts`**

Full file replacement:

```typescript
import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/lib/db';
import { sessionLogs, userExercisePlan, userCategoryLevels } from '@/lib/schema';
import { eq, and, gte, desc } from 'drizzle-orm';
import { EXERCISES, EXERCISE_LEVELS } from '@/lib/seed-exercises';
import { validatePlanUpdate } from './guardrails';
import type { ExerciseCategory } from '@/lib/schema';

const exerciseCategoryMap: Record<string, ExerciseCategory> = Object.fromEntries(
  EXERCISES.map((e) => [e.id, e.category])
);

export function makeCoachTools(userId: string, todayDate: string) {
  return {
    get_user_history: tool({
      description: "Get the user's exercise history and session check-ins for the last N days",
      inputSchema: z.object({ days: z.number().min(1).max(30).describe('Number of days of history to fetch') }),
      execute: async (input) => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - input.days);
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
      description: 'Get available exercises filtered by category. Use this to find exercises to swap in.',
      inputSchema: z.object({
        category: z.enum([
          'lower_body_strength', 'upper_body_strength',
          'lower_body_flexibility', 'upper_body_flexibility',
          'agility_balance', 'aerobic_endurance',
          'warm_up', 'cool_down',
        ] as const).optional().describe('Filter by category, or omit for all'),
      }),
      execute: async (input) => {
        const filtered = input.category
          ? EXERCISES.filter((e) => e.category === input.category)
          : EXERCISES;
        return { exercises: filtered, levels: EXERCISE_LEVELS };
      },
    }),

    update_exercise_plan: tool({
      description: "Update the user's exercise plan for tomorrow. You may only swap exercises within the same category — never change categories or levels. Call get_exercise_library first to see available exercises.",
      inputSchema: z.object({
        exercises: z.array(z.object({
          exercise_id: z.string().describe('Exercise ID from the library'),
          level: z.number().min(1).max(3).describe('Difficulty level 1–3 (must match the fixed level for this category — the system will enforce this)'),
        })).min(1).max(8),
      }),
      execute: async (input) => {
        const proposed = input.exercises;
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        // Fetch the user's fixed category levels
        const categoryLevelRows = await db.query.userCategoryLevels.findMany({
          where: eq(userCategoryLevels.userId, userId),
        });
        const defaultLevel: Record<ExerciseCategory, number> = {
          lower_body_strength: 2, upper_body_strength: 2,
          lower_body_flexibility: 2, upper_body_flexibility: 2,
          agility_balance: 2, aerobic_endurance: 2,
          warm_up: 2, cool_down: 2,
        };
        const categoryLevels = { ...defaultLevel };
        for (const row of categoryLevelRows) {
          categoryLevels[row.category] = row.level;
        }

        const validated = validatePlanUpdate(proposed, exerciseCategoryMap, categoryLevels);

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

- [ ] **Step 4: Update the checkin route to pass category to system prompt**

In `app/api/checkin/route.ts`, find the `buildSystemPrompt` call and update `todayPlan` to include category:

Existing (lines 41–44):
```typescript
    todayPlan: plan.map((p) => ({ name: p.exercise.name, level: p.level })),
```

Replace with:
```typescript
    todayPlan: plan.map((p) => ({ name: p.exercise.name, level: p.level, category: p.exercise.category })),
```

- [ ] **Step 5: Verify tsc and all tests pass**

```bash
npx tsc --noEmit && npx vitest run
```
Expected: no type errors, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/coach/ app/api/checkin/route.ts
git commit -m "feat: update Coach Mei to fixed-level model — swaps exercises within category, never changes levels"
```

---

### Task 7: Update `app/api/plan/route.ts` — use `buildDailyPlan` + `userCategoryLevels`

**Files:**
- Modify: `app/api/plan/route.ts`

- [ ] **Step 1: Replace `app/api/plan/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { userExercisePlan, sessionLogs, users, userCategoryLevels } from '@/lib/schema';
import { eq, and, desc } from 'drizzle-orm';
import { buildDailyPlan } from '@/lib/prescription/daily-plan';
import { EXERCISES } from '@/lib/seed-exercises';
import type { ExerciseCategory } from '@/lib/schema';

const today = () => new Date().toISOString().split('T')[0];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

  const userRecord = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!userRecord?.name) return NextResponse.json({ error: 'needs_onboarding' });

  const date = today();

  let plan = await db.query.userExercisePlan.findMany({
    where: and(eq(userExercisePlan.userId, userId), eq(userExercisePlan.scheduledDate, date)),
    with: { exercise: true },
    orderBy: userExercisePlan.order,
  });

  if (plan.length === 0) {
    plan = await seedTodaysPlan(userId, date);
  }

  const sessionLog = await db.query.sessionLogs.findFirst({
    where: and(eq(sessionLogs.userId, userId), eq(sessionLogs.date, date)),
    with: { exerciseLogs: true },
  });

  const completedIds = new Set(
    (sessionLog?.exerciseLogs ?? []).filter((l) => l.completed).map((l) => l.exerciseId)
  );

  const streak = await computeStreak(userId);

  return NextResponse.json({
    plan: plan.map((p) => ({ ...p, completed: completedIds.has(p.exerciseId) })),
    sessionId: sessionLog?.id ?? null,
    streak,
  });
}

async function seedTodaysPlan(userId: string, date: string) {
  const defaultLevels: Record<ExerciseCategory, number> = {
    lower_body_strength: 2, upper_body_strength: 2,
    lower_body_flexibility: 2, upper_body_flexibility: 2,
    agility_balance: 2, aerobic_endurance: 2,
    warm_up: 2, cool_down: 2,
  };

  const categoryLevelRows = await db.query.userCategoryLevels.findMany({
    where: eq(userCategoryLevels.userId, userId),
  });
  const categoryLevels = { ...defaultLevels };
  for (const row of categoryLevelRows) {
    categoryLevels[row.category] = row.level;
  }

  const exercisesByCategory: Record<ExerciseCategory, string[]> = {
    lower_body_strength: [], upper_body_strength: [],
    lower_body_flexibility: [], upper_body_flexibility: [],
    agility_balance: [], aerobic_endurance: [],
    warm_up: [], cool_down: [],
  };
  for (const ex of EXERCISES) {
    exercisesByCategory[ex.category].push(ex.id);
  }

  const dayOfMonth = new Date().getDate();
  const entries = buildDailyPlan(categoryLevels, exercisesByCategory, dayOfMonth);
  const rows = entries.map((e) => ({ ...e, id: crypto.randomUUID(), userId, scheduledDate: date }));
  await db.insert(userExercisePlan).values(rows);

  return db.query.userExercisePlan.findMany({
    where: and(eq(userExercisePlan.userId, userId), eq(userExercisePlan.scheduledDate, date)),
    with: { exercise: true },
    orderBy: userExercisePlan.order,
  });
}

async function computeStreak(userId: string): Promise<number> {
  const logs = await db.query.sessionLogs.findMany({
    where: eq(sessionLogs.userId, userId),
    orderBy: desc(sessionLogs.date),
    limit: 30,
  });
  let streak = 0;
  const check = new Date();
  for (const log of logs) {
    const diff = Math.round((check.getTime() - new Date(log.date).getTime()) / 86400000);
    if (diff === streak && log.completedAt) {
      streak++;
      check.setDate(check.getDate() - 1);
    } else break;
  }
  return streak;
}
```

- [ ] **Step 2: Verify tsc passes**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/plan/route.ts
git commit -m "feat: use buildDailyPlan and userCategoryLevels to seed daily exercise plan"
```

---

### Task 8: Update assessment completion to upsert `userCategoryLevels`

**Files:**
- Modify: `app/api/assessment/sessions/[id]/route.ts`

Context: When `PATCH { status: 'completed' }` runs, after computing the overall score, also call `computeCategoryLevels` and upsert one row per category into `userCategoryLevels`.

- [ ] **Step 1: Update `app/api/assessment/sessions/[id]/route.ts`**

Add imports at the top:

```typescript
import { computeCategoryLevels } from '@/lib/prescription/levels';
import { userCategoryLevels } from '@/lib/schema';
import type { ExerciseCategory } from '@/lib/schema';
```

After the `computeOverallScore(domains)` call and before the `db.update(assessmentSessions)...`, add:

```typescript
  // Upsert the user's per-category exercise levels derived from this assessment
  const newCategoryLevels = computeCategoryLevels(domains);
  await Promise.all(
    (Object.entries(newCategoryLevels) as [ExerciseCategory, number][]).map(([category, level]) =>
      db.insert(userCategoryLevels)
        .values({
          id: crypto.randomUUID(),
          userId: session.user.id,
          category,
          level,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [userCategoryLevels.userId, userCategoryLevels.category],
          set: { level, updatedAt: new Date() },
        })
    )
  );
```

The full PATCH handler after edits (complete replacement so there's no ambiguity):

```typescript
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

  if (body.walkTestVariant && !body.status) {
    const [updated] = await db.update(assessmentSessions)
      .set({ walkTestVariant: body.walkTestVariant })
      .where(eq(assessmentSessions.id, id))
      .returning();
    return NextResponse.json({ session: { ...updated, stationResults: found.stationResults } });
  }

  if (body.status !== 'completed') {
    return NextResponse.json({ error: 'Unsupported status' }, { status: 400 });
  }

  const domains: Record<Domain, AssessmentCategory | null> = {
    lower_body_strength: null, upper_body_strength: null,
    lower_body_flexibility: null, upper_body_flexibility: null,
    agility_balance: null, aerobic_endurance: null,
  };
  for (const result of found.stationResults) {
    domains[STATION_TO_DOMAIN[result.station]] = result.category;
  }

  const overall = computeOverallScore(domains);

  const newCategoryLevels = computeCategoryLevels(domains);
  await Promise.all(
    (Object.entries(newCategoryLevels) as [ExerciseCategory, number][]).map(([category, level]) =>
      db.insert(userCategoryLevels)
        .values({ id: crypto.randomUUID(), userId: session.user.id, category, level, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: [userCategoryLevels.userId, userCategoryLevels.category],
          set: { level, updatedAt: new Date() },
        })
    )
  );

  const wasAlreadyCompleted = found.status === 'completed';
  const [updated] = await db.update(assessmentSessions)
    .set({
      status: 'completed',
      overallScore: overall.total,
      overallCategory: overall.overallCategory,
      ...(wasAlreadyCompleted ? {} : { completedAt: new Date() }),
    })
    .where(eq(assessmentSessions.id, id))
    .returning();

  return NextResponse.json({ session: { ...updated, stationResults: found.stationResults }, overall });
}
```

Add all new imports at the top of the file (full imports section):

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { assessmentSessions, userCategoryLevels } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { computeOverallScore, STATION_TO_DOMAIN, type Domain, type AssessmentCategory } from '@/lib/assessment/scoring';
import { computeCategoryLevels } from '@/lib/prescription/levels';
import type { ExerciseCategory } from '@/lib/schema';
```

- [ ] **Step 2: Verify tsc passes**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/assessment/sessions/\[id\]/route.ts
git commit -m "feat: upsert userCategoryLevels when assessment session is completed"
```

---

### Task 9: Update `app/api/user/route.ts` + `app/api/progress/route.ts` — new fields

**Files:**
- Modify: `app/api/user/route.ts`
- Modify: `app/api/progress/route.ts`

- [ ] **Step 1: Update `app/api/user/route.ts`**

Add `reassessmentIntervalWeeks` to both GET response and PATCH body:

```typescript
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
    reassessmentIntervalWeeks: user?.reassessmentIntervalWeeks ?? null,
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, reminderTime, sex, dateOfBirth, reassessmentIntervalWeeks } = (await req.json()) as {
    name?: string;
    reminderTime?: string;
    sex?: Sex;
    dateOfBirth?: string;
    reassessmentIntervalWeeks?: number | null;
  };

  const [updated] = await db.update(users)
    .set({
      ...(name !== undefined && { name }),
      ...(reminderTime !== undefined && { reminderTime }),
      ...(sex !== undefined && { sex }),
      ...(dateOfBirth !== undefined && { dateOfBirth }),
      ...(reassessmentIntervalWeeks !== undefined && { reassessmentIntervalWeeks }),
    })
    .where(eq(users.id, session.user.id))
    .returning();

  return NextResponse.json({ user: updated });
}
```

- [ ] **Step 2: Update `app/api/progress/route.ts`**

Return `categoryLevels`, `weeklyCount`, `monthlyCount` in addition to existing data:

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sessionLogs, userCategoryLevels } from '@/lib/schema';
import { eq, and, gte, desc } from 'drizzle-orm';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString().split('T')[0];

  const logs = await db.query.sessionLogs.findMany({
    where: and(eq(sessionLogs.userId, userId), gte(sessionLogs.date, cutoff)),
    orderBy: desc(sessionLogs.date),
  });

  const completedDates = logs.filter((l) => l.completedAt).map((l) => l.date);

  // Weekly: Mon-Sun of the current week
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
  const startOfWeekStr = startOfWeek.toISOString().split('T')[0];
  const weeklyCount = logs.filter((l) => l.completedAt && l.date >= startOfWeekStr).length;

  // Monthly: current calendar month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const monthlyCount = logs.filter((l) => l.completedAt && l.date >= startOfMonth).length;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  const categoryLevelRows = await db.query.userCategoryLevels.findMany({
    where: eq(userCategoryLevels.userId, userId),
  });

  let streak = 0;
  const check = new Date();
  for (const log of logs) {
    const diff = Math.round((check.getTime() - new Date(log.date).getTime()) / 86400000);
    if (diff === streak && log.completedAt) { streak++; check.setDate(check.getDate() - 1); }
    else break;
  }

  return NextResponse.json({
    completedDates,
    streak,
    categoryLevels: categoryLevelRows,
    weeklyCount,
    weeklyGoal: 7,
    monthlyCount,
    monthlyGoal: daysInMonth,
  });
}
```

- [ ] **Step 3: Verify tsc passes**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/user/route.ts app/api/progress/route.ts
git commit -m "feat: add reassessmentIntervalWeeks to user API, add category levels and completion % to progress API"
```

---

### Task 10: Update `app/(app)/progress/page.tsx` — category badges + weekly/monthly %

**Files:**
- Modify: `app/(app)/progress/page.tsx`

- [ ] **Step 1: Replace `app/(app)/progress/page.tsx`**

```tsx
'use client';
import { useEffect, useState } from 'react';
import WeekGrid from '@/components/WeekGrid';
import StreakCard from '@/components/StreakCard';
import type { ExerciseCategory } from '@/lib/schema';

type CategoryLevel = { category: ExerciseCategory; level: number };

type ProgressData = {
  completedDates: string[];
  streak: number;
  categoryLevels: CategoryLevel[];
  weeklyCount: number;
  weeklyGoal: number;
  monthlyCount: number;
  monthlyGoal: number;
};

const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  lower_body_strength: 'Lower Body Strength',
  upper_body_strength: 'Upper Body Strength',
  lower_body_flexibility: 'Lower Body Flexibility',
  upper_body_flexibility: 'Upper Body Flexibility',
  agility_balance: 'Agility & Balance',
  aerobic_endurance: 'Aerobic Endurance',
  warm_up: 'Warm-Up',
  cool_down: 'Cool-Down',
};

const TIER_LABELS: Record<number, string> = { 1: 'Below Average', 2: 'Average', 3: 'Above Average' };
const TIER_COLORS: Record<number, string> = {
  1: 'bg-primary-light text-primary',
  2: 'bg-secondary-light text-secondary',
  3: 'bg-secondary text-white',
};

export default function ProgressPage() {
  const [data, setData] = useState<ProgressData | null>(null);

  useEffect(() => {
    fetch('/api/progress').then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <div className="p-6 text-mid text-xl">Loading...</div>;

  const ASSESSED_CATEGORIES: ExerciseCategory[] = [
    'lower_body_strength', 'upper_body_strength',
    'lower_body_flexibility', 'upper_body_flexibility',
    'agility_balance', 'aerobic_endurance',
  ];
  const categoryMap = Object.fromEntries(data.categoryLevels.map((r) => [r.category, r.level]));

  return (
    <div className="p-6 pt-10 flex flex-col gap-6">
      <div>
        <p className="text-mid text-sm font-medium uppercase tracking-widest">Your journey</p>
        <h1 className="font-heading text-4xl font-semibold text-dark mt-1">Progress</h1>
      </div>

      <div>
        <h2 className="font-heading text-xl text-dark mb-4">This week</h2>
        <WeekGrid completedDates={data.completedDates} />
      </div>

      <div className="bg-surface rounded-2xl p-5 flex flex-col gap-3">
        <h2 className="font-heading text-xl text-dark">Completion</h2>
        <div>
          <div className="flex justify-between text-sm text-mid mb-1.5">
            <span>This week</span>
            <span>{data.weeklyCount} / {data.weeklyGoal} days</span>
          </div>
          <div className="h-2.5 bg-bg rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(1, data.weeklyCount / data.weeklyGoal) * 100}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm text-mid mb-1.5">
            <span>This month</span>
            <span>{data.monthlyCount} / {data.monthlyGoal} days</span>
          </div>
          <div className="h-2.5 bg-bg rounded-full overflow-hidden">
            <div className="h-full bg-secondary rounded-full" style={{ width: `${Math.min(1, data.monthlyCount / data.monthlyGoal) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-2xl p-5 flex flex-col gap-3">
        <h2 className="font-heading text-xl text-dark">Fitness Levels</h2>
        <p className="text-mid text-sm">Set by your most recent assessment. Retake the assessment to update.</p>
        <div className="flex flex-col gap-2">
          {ASSESSED_CATEGORIES.map((cat) => {
            const level = categoryMap[cat] ?? 2;
            return (
              <div key={cat} className="flex justify-between items-center">
                <span className="text-dark text-base">{CATEGORY_LABELS[cat]}</span>
                <span className={`text-sm font-semibold px-3 py-1 rounded-full ${TIER_COLORS[level]}`}>
                  {TIER_LABELS[level]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <StreakCard streak={data.streak} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(app\)/progress/page.tsx
git commit -m "feat: update progress page with category tier badges and weekly/monthly completion %"
```

---

### Task 11: Update `app/(app)/settings/page.tsx` — add reassessment interval picker

**Files:**
- Modify: `app/(app)/settings/page.tsx`

Context: Add a "Reassessment Reminder" block after the existing "Fitness Assessment Profile" block. The user chooses 8 weeks, 12 weeks, 26 weeks, or Off. Value is persisted to `users.reassessment_interval_weeks` via `PATCH /api/user`.

- [ ] **Step 1: Add reassessment state and UI to `app/(app)/settings/page.tsx`**

Add after the `const [saving, setSaving] = useState(false);` line:
```tsx
  const [reassessmentWeeks, setReassessmentWeeks] = useState<number | null>(null);
```

In the `useEffect` that fetches `/api/user`, add:
```tsx
        if (d.reassessmentIntervalWeeks !== undefined) setReassessmentWeeks(d.reassessmentIntervalWeeks ?? null);
```

In the `save()` function, include `reassessmentIntervalWeeks` in the PATCH body:
```tsx
      body: JSON.stringify({ reminderTime, sex, dateOfBirth: dateOfBirth || undefined, reassessmentIntervalWeeks: reassessmentWeeks }),
```

Add a new UI block immediately after the "Fitness Assessment Profile" closing `</div>` (before the "Large Text" block):

```tsx
      <div className="bg-surface rounded-2xl p-5">
        <p className="font-heading text-xl text-dark mb-4">Reassessment Reminder</p>
        <p className="text-mid text-base mb-3">Get a nudge on the Assessment page when it's time to retest.</p>
        <div className="grid grid-cols-2 gap-3">
          {([8, 12, 26, null] as (number | null)[]).map((weeks) => (
            <button
              key={String(weeks)}
              onClick={() => setReassessmentWeeks(weeks)}
              className={`py-3 rounded-xl text-lg font-medium border-2 transition-all ${
                reassessmentWeeks === weeks ? 'bg-primary text-white border-primary' : 'bg-bg text-dark border-primary-light'
              }`}
            >
              {weeks === null ? 'Off' : weeks === 26 ? '6 months' : `${weeks} weeks`}
            </button>
          ))}
        </div>
      </div>
```

- [ ] **Step 2: Verify tsc passes**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/settings/page.tsx
git commit -m "feat: add reassessment interval picker to Settings"
```

---

### Task 12: Update `app/(app)/assessment/page.tsx` — reassessment due-date banner

**Files:**
- Modify: `app/(app)/assessment/page.tsx`

Context: When `reassessmentIntervalWeeks` is set and the most recent completed session's `completedAt` + interval is in the past, show a banner above "Start New Assessment".

- [ ] **Step 1: Add reassessment banner logic to `app/(app)/assessment/page.tsx`**

Add `reassessmentIntervalWeeks` to the `UserProfile` type:
```tsx
type UserProfile = { name: string | null; sex: Sex | null; dateOfBirth: string | null; reassessmentIntervalWeeks: number | null };
```

Add a helper function inside the component (before the `return`):
```tsx
  function isReassessmentDue(): boolean {
    if (!user?.reassessmentIntervalWeeks) return false;
    const completed = sessions.filter((s) => s.status === 'completed');
    if (completed.length === 0) return false;
    const latest = completed.sort((a, b) => b.dateOfTest.localeCompare(a.dateOfTest))[0];
    // dateOfTest is YYYY-MM-DD — use it as the basis since completedAt isn't in SessionSummary
    const dueDate = new Date(latest.dateOfTest);
    dueDate.setDate(dueDate.getDate() + user.reassessmentIntervalWeeks * 7);
    return dueDate <= new Date();
  }
```

In the JSX, inside the `!activeSession` branch, add the banner before "Start New Assessment":
```tsx
          {isReassessmentDue() && (
            <div className="bg-primary-light rounded-2xl p-4 flex items-start gap-3">
              <span className="text-2xl">🔔</span>
              <div>
                <p className="font-heading text-lg text-dark font-semibold">Time for your reassessment!</p>
                <p className="text-mid text-base mt-1">Your scheduled reassessment interval has passed. Start a new assessment below to update your exercise plan.</p>
              </div>
            </div>
          )}
```

Also update the `fetch('/api/user')` response type to include `reassessmentIntervalWeeks`:
The existing `.then(([userData]) => { setUser(userData); ... })` — ensure `userData` is typed to include `reassessmentIntervalWeeks: number | null`.

- [ ] **Step 2: Verify tsc passes**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/assessment/page.tsx
git commit -m "feat: show reassessment due-date banner on assessment dashboard"
```

---

### Task 13: Update `app/(app)/page.tsx` — assessment nudge banner

**Files:**
- Modify: `app/(app)/page.tsx`

Context: If the user has never completed an assessment, show a dismissible card above the daily plan linking to `/assessment`. Dismissal stored in `localStorage` key `'assessmentNudgeDismissed'`.

- [ ] **Step 1: Update `app/(app)/page.tsx`**

Add state for the nudge:
```tsx
  const [showNudge, setShowNudge] = useState(false);
  const [hasAssessment, setHasAssessment] = useState<boolean | null>(null);
```

In the `useEffect` that fetches `/api/plan`, also check whether an assessment exists:
```tsx
  useEffect(() => {
    const dismissed = localStorage.getItem('assessmentNudgeDismissed') === 'true';
    Promise.all([
      fetch('/api/plan').then((r) => r.json()),
      dismissed ? Promise.resolve(null) : fetch('/api/assessment/sessions').then((r) => r.json()),
    ]).then(([planData, sessionData]) => {
      if (planData.error === 'needs_onboarding') { router.push('/onboarding'); return; }
      setData(planData);
      if (!dismissed && sessionData) {
        const hasCompleted = sessionData.sessions?.some((s: { status: string }) => s.status === 'completed');
        setHasAssessment(!!hasCompleted);
        setShowNudge(!hasCompleted);
      }
    });
  }, [router]);
```

Add dismiss handler:
```tsx
  function dismissNudge() {
    localStorage.setItem('assessmentNudgeDismissed', 'true');
    setShowNudge(false);
  }
```

Add the nudge card in JSX, immediately before the "Today's exercises" heading:
```tsx
      {showNudge && (
        <div className="bg-secondary-light rounded-2xl p-5 flex items-start gap-4">
          <div className="flex-1">
            <p className="font-heading text-xl text-dark font-semibold">Get a personalised plan</p>
            <p className="text-mid text-base mt-1">Take your 10-minute fitness assessment to tailor your exercises to your current fitness level.</p>
            <a href="/assessment" className="inline-block mt-3 bg-secondary text-white text-base font-semibold px-5 py-3 rounded-xl">
              Start Assessment
            </a>
          </div>
          <button onClick={dismissNudge} aria-label="Dismiss" className="text-mid text-2xl leading-none">×</button>
        </div>
      )}
```

- [ ] **Step 2: Verify tsc passes**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/page.tsx
git commit -m "feat: show dismissible assessment nudge on home page for users without a completed assessment"
```

---

### Task 14: Update report page — trend comparison section

**Files:**
- Modify: `app/(app)/assessment/[sessionId]/report/page.tsx`

Context: After the report page loads, also fetch the list of all assessment sessions, find the most recent *previous* completed session, fetch its detail, and call `compareAssessments` on the client to render a "Compared to your last assessment" section.

- [ ] **Step 1: Update `app/(app)/assessment/[sessionId]/report/page.tsx`**

Add import for `compareAssessments` and its types, plus the domain label map. Add at the top after existing imports:

```tsx
import { compareAssessments } from '@/lib/assessment/trends';
import type { ComparisonResult } from '@/lib/assessment/trends';
import type { Domain } from '@/lib/assessment/scoring';
```

Add `comparison` state:
```tsx
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
```

Add `DOMAIN_LABELS` constant (place near the top of the component file, outside the component):
```tsx
const DOMAIN_LABELS: Record<Domain, string> = {
  lower_body_strength: 'Lower Body Strength',
  upper_body_strength: 'Upper Body Strength',
  lower_body_flexibility: 'Lower Body Flexibility',
  upper_body_flexibility: 'Upper Body Flexibility',
  agility_balance: 'Agility & Balance',
  aerobic_endurance: 'Aerobic Endurance',
};
```

In the `useEffect`, after setting `session`, `overall`, and `user`, also fetch the comparison:

```tsx
    ]).then(([completion, userData]: [{ session: SessionDetail; overall: OverallResult }, UserProfile]) => {
      setSession(completion.session);
      setOverall(completion.overall);
      setUser(userData);
      // Load comparison with previous session
      fetch('/api/assessment/sessions')
        .then((r) => r.json())
        .then(({ sessions: allSessions }: { sessions: Array<{ id: string; status: string; dateOfTest: string; overallScore: number | null; stationResults?: StationResult[] }> }) => {
          const completedSessions = allSessions
            .filter((s) => s.status === 'completed' && s.id !== sessionId)
            .sort((a, b) => b.dateOfTest.localeCompare(a.dateOfTest));
          if (completedSessions.length === 0) return;
          const prevId = completedSessions[0].id;
          return fetch(`/api/assessment/sessions/${prevId}`).then((r) => r.json());
        })
        .then((prevData?: { session: SessionDetail }) => {
          if (!prevData || !completion.session) return;
          const result = compareAssessments(
            { stationResults: prevData.session.stationResults, overallScore: null },
            { stationResults: completion.session.stationResults, overallScore: completion.overall.total }
          );
          setComparison(result);
        })
        .catch(() => {}); // comparison is optional — don't break report if it fails
    });
```

Add the comparison section in JSX, immediately before the disclaimer `<p>` at the bottom:

```tsx
      {comparison && comparison.domainDeltas.some((d) => d.scoreDelta !== null) && (
        <div className="bg-surface rounded-2xl p-5 flex flex-col gap-3">
          <p className="font-heading text-xl text-dark">Compared to your last assessment</p>
          {comparison.overallScoreDelta !== null && (
            <p className="text-dark text-base">
              Overall score: {comparison.overallScoreDelta > 0 ? '+' : ''}{comparison.overallScoreDelta} points
            </p>
          )}
          {comparison.domainDeltas.filter((d) => d.scoreDelta !== null).map((d) => (
            <div key={d.domain} className="flex justify-between items-center">
              <span className="text-dark text-base">{DOMAIN_LABELS[d.domain]}</span>
              <span className={`text-base font-semibold ${d.improved ? 'text-secondary' : d.scoreDelta !== null && d.scoreDelta < 0 ? 'text-primary' : 'text-mid'}`}>
                {d.scoreDelta !== null && d.scoreDelta > 0 ? '+' : ''}{d.scoreDelta} {d.unit}
                {d.categoryChanged && d.improved ? ' ↑' : d.categoryChanged ? ' ↓' : ''}
              </span>
            </div>
          ))}
        </div>
      )}
```

- [ ] **Step 2: Verify tsc passes**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/assessment/[sessionId]/report/page.tsx"
git commit -m "feat: add trend comparison section to assessment report when a previous session exists"
```

---

### Task 15: Final verification — lint, tests, typecheck

**Files:** none

- [ ] **Step 1: Run the full test suite**

```bash
npx vitest run
```
Expected: all tests pass. New tests: `lib/prescription/__tests__/levels.test.ts` (5), `lib/prescription/__tests__/daily-plan.test.ts` (9), `lib/assessment/__tests__/trends.test.ts` (7), `lib/__tests__/schema.test.ts` (2). Total should be ≥ 108 + 23 = 131 tests passing.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```
Expected: 0 errors.

- [ ] **Step 3: Run typecheck**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Reseed the exercise library against your dev DB**

Start the dev server and call the seed endpoint to populate the new 34-exercise library:

```bash
npm run dev
# In another terminal:
curl -X POST http://localhost:3000/api/seed
```
Expected: `{ "ok": true, "exerciseCount": 34, "levelCount": 102 }`

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "chore: final verification — exercise prescription system complete"
```

---

## Self-Review

**Spec coverage check:**
- ✅ 8-category ExerciseCategory type (Task 1)
- ✅ `userCategoryLevels` table (Task 1)
- ✅ `reassessmentIntervalWeeks` on users (Task 1)
- ✅ 34 exercises × 3 levels across 8 categories (Task 2)
- ✅ Clear-then-reseed in seed route (Task 2)
- ✅ `computeCategoryLevels` pure function (Task 3)
- ✅ `buildDailyPlan` pure function with 8-slot structure and Below Average priority (Task 4)
- ✅ Old `lib/progression.ts` deleted (Task 4)
- ✅ `compareAssessments` pure function (Task 5)
- ✅ Coach can swap exercises but not levels (Task 6)
- ✅ Daily plan seeds from `userCategoryLevels`, defaults to Average tier (Task 7)
- ✅ Assessment completion writes `userCategoryLevels` (Task 8)
- ✅ Reassessment interval persisted on user (Task 9)
- ✅ Progress API returns category levels + weekly/monthly completion (Task 9)
- ✅ Progress page: category tier badges + completion % (Task 10)
- ✅ Settings: reassessment interval picker (Task 11)
- ✅ Assessment dashboard: reassessment due-date banner (Task 12)
- ✅ Home page: non-blocking assessment nudge (Task 13)
- ✅ Report page: trend comparison with previous session (Task 14)

**Placeholder scan:** None found. All code blocks are complete.

**Type consistency check:** `ExerciseCategory` 8-value type defined in Task 1 and used consistently in Tasks 2–14. `computeCategoryLevels` returns `Record<ExerciseCategory, number>` (Task 3), consumed in Task 8 (assessment route) and Task 7 (plan route). `buildDailyPlan` signature matches its usage in Task 7. `compareAssessments` types (`ComparisonResult`, `DomainDelta`) defined in Task 5 and consumed in Task 14.
