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
