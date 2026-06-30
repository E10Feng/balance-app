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
