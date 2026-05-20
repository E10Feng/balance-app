import { describe, it, expect } from 'vitest';
import {
  users, exercises, exerciseLevels,
  userExercisePlan, sessionLogs, exerciseLogs,
} from '../schema';

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
});
