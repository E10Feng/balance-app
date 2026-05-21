import { describe, it, expect } from 'vitest';
import { EXERCISES, EXERCISE_LEVELS } from '../seed-exercises';

describe('seed-exercises', () => {
  it('has at least 6 exercises', () => {
    expect(EXERCISES.length).toBeGreaterThanOrEqual(6);
  });

  it('every exercise has 5 levels', () => {
    for (const ex of EXERCISES) {
      const levels = EXERCISE_LEVELS.filter((l) => l.exerciseId === ex.id);
      expect(levels).toHaveLength(5);
    }
  });

  it('all categories are valid', () => {
    const valid = ['static_balance', 'dynamic_balance', 'strength_support'];
    for (const ex of EXERCISES) {
      expect(valid).toContain(ex.category);
    }
  });
});
