import { describe, it, expect } from 'vitest';
import { containsPainKeywords, validatePlanUpdate } from '../coach/guardrails';

describe('containsPainKeywords', () => {
  it('detects pain', () => expect(containsPainKeywords('my knee hurts')).toBe(true));
  it('detects fell', () => expect(containsPainKeywords('I fell yesterday')).toBe(true));
  it('is case-insensitive', () => expect(containsPainKeywords('I FEEL PAIN')).toBe(true));
  it('returns false for normal text', () => expect(containsPainKeywords('this is great')).toBe(false));
});

describe('validatePlanUpdate', () => {
  it('clamps levels to 1–5', () => {
    const result = validatePlanUpdate([{ exercise_id: 'a', level: 10 }], {});
    expect(result[0].level).toBe(5);
  });

  it('limits advancement to +1 per exercise', () => {
    const result = validatePlanUpdate(
      [{ exercise_id: 'a', level: 4 }],
      { 'a': 2 }
    );
    expect(result[0].level).toBe(3);
  });

  it('allows regression freely', () => {
    const result = validatePlanUpdate(
      [{ exercise_id: 'a', level: 1 }],
      { 'a': 4 }
    );
    expect(result[0].level).toBe(1);
  });
});
