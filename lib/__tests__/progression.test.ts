import { describe, it, expect } from 'vitest';
import { computeNextLevel, buildDefaultPlan } from '../progression';

describe('computeNextLevel', () => {
  it('advances after 3 consecutive completions', () => {
    const history = [
      { completed: true, userRating: 'just_right' as const },
      { completed: true, userRating: 'just_right' as const },
      { completed: true, userRating: 'just_right' as const },
    ];
    expect(computeNextLevel(2, history)).toBe(3);
  });

  it('does not advance past level 5', () => {
    const history = [
      { completed: true, userRating: 'just_right' as const },
      { completed: true, userRating: 'just_right' as const },
      { completed: true, userRating: 'just_right' as const },
    ];
    expect(computeNextLevel(5, history)).toBe(5);
  });

  it('regresses after 3 consecutive misses', () => {
    const history = [
      { completed: false, userRating: null },
      { completed: false, userRating: null },
      { completed: false, userRating: null },
    ];
    expect(computeNextLevel(3, history)).toBe(2);
  });

  it('does not regress past level 1', () => {
    const history = [
      { completed: false, userRating: null },
      { completed: false, userRating: null },
      { completed: false, userRating: null },
    ];
    expect(computeNextLevel(1, history)).toBe(1);
  });

  it('regresses immediately on too_hard rating', () => {
    const history = [
      { completed: true, userRating: 'too_hard' as const },
    ];
    expect(computeNextLevel(3, history)).toBe(2);
  });

  it('stays at current level with mixed history', () => {
    const history = [
      { completed: true, userRating: 'just_right' as const },
      { completed: false, userRating: null },
      { completed: true, userRating: 'just_right' as const },
    ];
    expect(computeNextLevel(2, history)).toBe(2);
  });
});

describe('buildDefaultPlan', () => {
  it('returns up to 4 exercises', () => {
    const plan = buildDefaultPlan(['ex1', 'ex2', 'ex3', 'ex4', 'ex5']);
    expect(plan.length).toBeLessThanOrEqual(4);
  });

  it('assigns level 1 to new exercises', () => {
    const plan = buildDefaultPlan(['ex1', 'ex2']);
    expect(plan.every((p) => p.level === 1)).toBe(true);
  });
});
