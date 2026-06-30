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
