import { describe, it, expect } from 'vitest';
import { SIT_REACH_NORMS, BACK_SCRATCH_NORMS, UP_AND_GO_NORMS, STEP_TEST_NORMS } from '../norms';

describe('norm tables', () => {
  const tables = {
    SIT_REACH_NORMS,
    BACK_SCRATCH_NORMS,
    UP_AND_GO_NORMS,
    STEP_TEST_NORMS,
  };

  for (const [name, table] of Object.entries(tables)) {
    it(`${name} has 7 age bands for men and women covering 60-94`, () => {
      expect(table.men).toHaveLength(7);
      expect(table.women).toHaveLength(7);
      expect(table.men[0].ageMin).toBe(60);
      expect(table.men[table.men.length - 1].ageMax).toBe(94);
      expect(table.women[0].ageMin).toBe(60);
      expect(table.women[table.women.length - 1].ageMax).toBe(94);
    });

    it(`${name} age bands are contiguous with no gaps`, () => {
      for (const bands of [table.men, table.women]) {
        for (let i = 1; i < bands.length; i++) {
          expect(bands[i].ageMin).toBe(bands[i - 1].ageMax + 1);
        }
      }
    });
  }

  it('SIT_REACH_NORMS is higher-is-better', () => {
    expect(SIT_REACH_NORMS.higherIsBetter).toBe(true);
  });

  it('BACK_SCRATCH_NORMS is lower-is-better', () => {
    expect(BACK_SCRATCH_NORMS.higherIsBetter).toBe(false);
  });

  it('UP_AND_GO_NORMS is lower-is-better', () => {
    expect(UP_AND_GO_NORMS.higherIsBetter).toBe(false);
  });

  it('STEP_TEST_NORMS is higher-is-better', () => {
    expect(STEP_TEST_NORMS.higherIsBetter).toBe(true);
  });

  it('matches a known SIT_REACH_NORMS value (men 65-69)', () => {
    const band = SIT_REACH_NORMS.men.find((b) => b.ageMin === 65);
    expect(band).toEqual({ ageMin: 65, ageMax: 69, averageLow: -3.0, averageHigh: 3.0 });
  });

  it('matches a known STEP_TEST_NORMS value (women 80-84)', () => {
    const band = STEP_TEST_NORMS.women.find((b) => b.ageMin === 80);
    expect(band).toEqual({ ageMin: 80, ageMax: 84, averageLow: 60, averageHigh: 91 });
  });
});
