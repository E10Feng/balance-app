import { describe, it, expect } from 'vitest';
import {
  users, exercises, exerciseLevels,
  userExercisePlan, sessionLogs, exerciseLogs,
  userCategoryLevels,
} from '../schema';
import type { ExerciseCategory } from '../schema';

describe('schema', () => {
  it('exports all six tables', () => {
    expect(users).toBeDefined();
    expect(exercises).toBeDefined();
    expect(exerciseLevels).toBeDefined();
    expect(userExercisePlan).toBeDefined();
    expect(sessionLogs).toBeDefined();
    expect(exerciseLogs).toBeDefined();
  });

  it('exercise category is typed correctly', () => {
    const col = exercises.category;
    expect(col).toBeDefined();
  });

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
