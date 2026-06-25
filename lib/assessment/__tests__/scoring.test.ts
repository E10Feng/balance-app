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
