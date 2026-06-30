import { describe, it, expect } from 'vitest';
import { computeCategoryLevels } from '../levels';

describe('computeCategoryLevels', () => {
  it('maps below_average → 1', () => {
    const result = computeCategoryLevels({
      lower_body_strength: 'below_average',
      upper_body_strength: 'average',
      lower_body_flexibility: 'average',
      upper_body_flexibility: 'average',
      agility_balance: 'average',
      aerobic_endurance: 'average',
    });
    expect(result.lower_body_strength).toBe(1);
    expect(result.upper_body_strength).toBe(2);
  });

  it('maps above_average → 3', () => {
    const result = computeCategoryLevels({
      lower_body_strength: 'average',
      upper_body_strength: 'above_average',
      lower_body_flexibility: 'above_average',
      upper_body_flexibility: 'average',
      agility_balance: 'average',
      aerobic_endurance: 'average',
    });
    expect(result.upper_body_strength).toBe(3);
    expect(result.lower_body_flexibility).toBe(3);
  });

  it('maps null (unscored) → 2', () => {
    const result = computeCategoryLevels({
      lower_body_strength: null,
      upper_body_strength: null,
      lower_body_flexibility: 'average',
      upper_body_flexibility: 'average',
      agility_balance: 'average',
      aerobic_endurance: 'average',
    });
    expect(result.lower_body_strength).toBe(2);
    expect(result.upper_body_strength).toBe(2);
  });

  it('always returns 2 for warm_up and cool_down regardless of domains', () => {
    const result = computeCategoryLevels({
      lower_body_strength: 'below_average',
      upper_body_strength: 'below_average',
      lower_body_flexibility: 'below_average',
      upper_body_flexibility: 'below_average',
      agility_balance: 'below_average',
      aerobic_endurance: 'below_average',
    });
    expect(result.warm_up).toBe(2);
    expect(result.cool_down).toBe(2);
  });

  it('returns all 8 categories', () => {
    const result = computeCategoryLevels({
      lower_body_strength: 'average', upper_body_strength: 'average',
      lower_body_flexibility: 'average', upper_body_flexibility: 'average',
      agility_balance: 'average', aerobic_endurance: 'average',
    });
    expect(Object.keys(result)).toHaveLength(8);
  });
});
