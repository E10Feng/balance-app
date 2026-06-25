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

import { computeOverallScore, type DomainCategories } from '../scoring';

describe('computeOverallScore', () => {
  it('returns null total when any domain is missing (Chair Stand/Arm Curl unscored)', () => {
    const domains: DomainCategories = {
      lower_body_strength: null,
      upper_body_strength: null,
      lower_body_flexibility: 'average',
      upper_body_flexibility: 'average',
      agility_balance: 'average',
      aerobic_endurance: 'average',
    };
    const result = computeOverallScore(domains);
    expect(result.total).toBeNull();
    expect(result.overallCategory).toBeNull();
    expect(result.missingDomains).toEqual(['lower_body_strength', 'upper_body_strength']);
  });

  it('computes a below-average total (6-9) when all domains are below average', () => {
    const domains: DomainCategories = {
      lower_body_strength: 'below_average',
      upper_body_strength: 'below_average',
      lower_body_flexibility: 'below_average',
      upper_body_flexibility: 'below_average',
      agility_balance: 'below_average',
      aerobic_endurance: 'below_average',
    };
    const result = computeOverallScore(domains);
    expect(result.total).toBe(6);
    expect(result.overallCategory).toBe('below_average');
  });

  it('computes an average total (10-14)', () => {
    const domains: DomainCategories = {
      lower_body_strength: 'average',
      upper_body_strength: 'average',
      lower_body_flexibility: 'average',
      upper_body_flexibility: 'average',
      agility_balance: 'average',
      aerobic_endurance: 'average',
    };
    const result = computeOverallScore(domains);
    expect(result.total).toBe(12);
    expect(result.overallCategory).toBe('average');
  });

  it('computes an above-average total (15-18)', () => {
    const domains: DomainCategories = {
      lower_body_strength: 'above_average',
      upper_body_strength: 'above_average',
      lower_body_flexibility: 'above_average',
      upper_body_flexibility: 'above_average',
      agility_balance: 'above_average',
      aerobic_endurance: 'above_average',
    };
    const result = computeOverallScore(domains);
    expect(result.total).toBe(18);
    expect(result.overallCategory).toBe('above_average');
  });

  it('sorts domains into strengths/maintain/areasForImprovement', () => {
    const domains: DomainCategories = {
      lower_body_strength: 'above_average',
      upper_body_strength: 'average',
      lower_body_flexibility: 'below_average',
      upper_body_flexibility: 'average',
      agility_balance: 'below_average',
      aerobic_endurance: 'above_average',
    };
    const result = computeOverallScore(domains);
    expect(result.strengths).toEqual(['lower_body_strength', 'aerobic_endurance']);
    expect(result.maintain).toEqual(['upper_body_strength', 'upper_body_flexibility']);
    expect(result.areasForImprovement).toEqual(['lower_body_flexibility', 'agility_balance']);
  });

  it('recommends lower-body strengthening when chair stand is below average', () => {
    const domains: DomainCategories = {
      lower_body_strength: 'below_average',
      upper_body_strength: 'average',
      lower_body_flexibility: 'average',
      upper_body_flexibility: 'average',
      agility_balance: 'average',
      aerobic_endurance: 'average',
    };
    expect(computeOverallScore(domains).recommendations).toContain('Recommend lower-body strengthening.');
  });

  it('recommends balance/agility training when up-and-go is below average', () => {
    const domains: DomainCategories = {
      lower_body_strength: 'average',
      upper_body_strength: 'average',
      lower_body_flexibility: 'average',
      upper_body_flexibility: 'average',
      agility_balance: 'below_average',
      aerobic_endurance: 'average',
    };
    expect(computeOverallScore(domains).recommendations).toContain('Recommend balance and agility training.');
  });

  it('recommends flexibility work when either flexibility domain is below average', () => {
    const domains: DomainCategories = {
      lower_body_strength: 'average',
      upper_body_strength: 'average',
      lower_body_flexibility: 'average',
      upper_body_flexibility: 'below_average',
      agility_balance: 'average',
      aerobic_endurance: 'average',
    };
    expect(computeOverallScore(domains).recommendations).toContain('Recommend flexibility and mobility exercises.');
  });

  it('recommends aerobic training when endurance is below average', () => {
    const domains: DomainCategories = {
      lower_body_strength: 'average',
      upper_body_strength: 'average',
      lower_body_flexibility: 'average',
      upper_body_flexibility: 'average',
      agility_balance: 'average',
      aerobic_endurance: 'below_average',
    };
    expect(computeOverallScore(domains).recommendations).toContain(
      'Recommend aerobic endurance training such as walking or step-in-place progression.'
    );
  });

  it('adds a combined message when 2+ domains are below average', () => {
    const domains: DomainCategories = {
      lower_body_strength: 'below_average',
      upper_body_strength: 'below_average',
      lower_body_flexibility: 'average',
      upper_body_flexibility: 'average',
      agility_balance: 'average',
      aerobic_endurance: 'average',
    };
    expect(computeOverallScore(domains).recommendations).toContain(
      'Multiple areas were below average. A comprehensive fall-prevention program may be beneficial.'
    );
  });
});

import { STATION_TO_DOMAIN } from '../scoring';

describe('STATION_TO_DOMAIN', () => {
  it('maps every station to its domain', () => {
    expect(STATION_TO_DOMAIN.chair_stand).toBe('lower_body_strength');
    expect(STATION_TO_DOMAIN.arm_curl).toBe('upper_body_strength');
    expect(STATION_TO_DOMAIN.sit_reach).toBe('lower_body_flexibility');
    expect(STATION_TO_DOMAIN.back_scratch).toBe('upper_body_flexibility');
    expect(STATION_TO_DOMAIN.up_and_go).toBe('agility_balance');
    expect(STATION_TO_DOMAIN.walk_test).toBe('aerobic_endurance');
    expect(STATION_TO_DOMAIN.step_test).toBe('aerobic_endurance');
  });
});

import { computeAge } from '../scoring';

describe('computeAge', () => {
  it('computes age when the birthday has already passed this year', () => {
    expect(computeAge('1960-01-15', new Date('2026-06-25'))).toBe(66);
  });

  it('computes age when the birthday has not yet occurred this year', () => {
    expect(computeAge('1960-12-15', new Date('2026-06-25'))).toBe(65);
  });

  it('computes age on the exact birthday', () => {
    expect(computeAge('1960-06-25', new Date('2026-06-25'))).toBe(66);
  });
});

import { categorizeStationResult } from '../scoring';

describe('categorizeStationResult', () => {
  it('returns null for chair_stand regardless of inputs', () => {
    expect(categorizeStationResult('chair_stand', 15, 65, 'male', {})).toBeNull();
  });

  it('returns null for arm_curl regardless of inputs', () => {
    expect(categorizeStationResult('arm_curl', 15, 65, 'male', {})).toBeNull();
  });

  it('converts cm to inches before scoring sit_reach', () => {
    // 10.16 cm = 4 inches, which is above the men 60-64 average band (averageHigh 4.0)
    expect(categorizeStationResult('sit_reach', 10.16, 60, 'male', {})).toBe('average');
    expect(categorizeStationResult('sit_reach', 12.7, 60, 'male', {})).toBe('above_average');
  });

  it('converts cm to inches before scoring back_scratch', () => {
    expect(categorizeStationResult('back_scratch', 0, 60, 'male', {})).toBe('average');
  });

  it('scores up_and_go directly in seconds with no conversion', () => {
    expect(categorizeStationResult('up_and_go', 3.0, 65, 'female', {})).toBe('above_average');
  });

  it('scores step_test directly in reps with no conversion', () => {
    expect(categorizeStationResult('step_test', 200, 60, 'male', {})).toBe('above_average');
  });

  it('scores walk_test using the predicted-distance formula when height is available', () => {
    const result = categorizeStationResult('walk_test', 1000, 65, 'male', { heightCm: 170, bmi: 23 });
    expect(['below_average', 'average', 'above_average']).toContain(result);
  });

  it('returns null for walk_test when height is unavailable', () => {
    expect(categorizeStationResult('walk_test', 500, 65, 'male', {})).toBeNull();
  });

  it('returns null when age is null (unknown date of birth)', () => {
    expect(categorizeStationResult('sit_reach', 0, null, 'male', {})).toBeNull();
  });

  it('returns null when sex is null (not set on profile)', () => {
    expect(categorizeStationResult('sit_reach', 0, 65, null, {})).toBeNull();
  });
});
