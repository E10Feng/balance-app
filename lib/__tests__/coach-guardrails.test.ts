import { describe, it, expect } from 'vitest';
import { containsPainKeywords, validatePlanUpdate } from '../coach/guardrails';
import type { ExerciseCategory } from '../schema';

describe('containsPainKeywords', () => {
  it('detects pain', () => expect(containsPainKeywords('my knee hurts')).toBe(true));
  it('detects fell', () => expect(containsPainKeywords('I fell yesterday')).toBe(true));
  it('is case-insensitive', () => expect(containsPainKeywords('I FEEL PAIN')).toBe(true));
  it('returns false for normal text', () => expect(containsPainKeywords('this is great')).toBe(false));
});

describe('validatePlanUpdate', () => {
  const categoryMap: Record<string, ExerciseCategory> = {
    'ex-a': 'lower_body_strength',
    'ex-b': 'agility_balance',
  };
  const categoryLevels: Record<ExerciseCategory, number> = {
    lower_body_strength: 2,
    upper_body_strength: 1,
    lower_body_flexibility: 3,
    upper_body_flexibility: 2,
    agility_balance: 1,
    aerobic_endurance: 2,
    warm_up: 1,
    cool_down: 1,
  };

  it('enforces fixed category level regardless of proposed level', () => {
    const result = validatePlanUpdate([{ exercise_id: 'ex-a', level: 5 }], categoryMap, categoryLevels);
    expect(result[0].level).toBe(2); // lower_body_strength is fixed at 2
  });

  it('uses different fixed level per category', () => {
    const result = validatePlanUpdate([{ exercise_id: 'ex-b', level: 3 }], categoryMap, categoryLevels);
    expect(result[0].level).toBe(1); // agility_balance is fixed at 1
  });

  it('defaults to level 2 for unknown exercise id', () => {
    const result = validatePlanUpdate([{ exercise_id: 'unknown', level: 5 }], categoryMap, categoryLevels);
    expect(result[0].level).toBe(2);
  });
});
