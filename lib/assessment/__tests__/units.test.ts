import { describe, it, expect } from 'vitest';
import { cmToInches, kgToLb } from '../units';

describe('cmToInches', () => {
  it('converts centimeters to inches', () => {
    expect(cmToInches(2.54)).toBeCloseTo(1, 5);
  });

  it('converts zero', () => {
    expect(cmToInches(0)).toBe(0);
  });

  it('converts a typical sit-and-reach measurement', () => {
    expect(cmToInches(25.4)).toBeCloseTo(10, 5);
  });
});

describe('kgToLb', () => {
  it('converts kilograms to pounds', () => {
    expect(kgToLb(1)).toBeCloseTo(2.20462, 4);
  });

  it('converts zero', () => {
    expect(kgToLb(0)).toBe(0);
  });
});
