import { describe, it, expect } from 'vitest';
import { compareAssessments } from '../trends';

const makeSession = (overrides: Record<string, { score: number; category: 'below_average' | 'average' | 'above_average' | null }>, overallScore: number | null = null) => ({
  stationResults: Object.entries(overrides).map(([station, data]) => ({
    station: station as import('@/lib/schema').AssessmentStation,
    score: data.score,
    category: data.category,
    unit: 'reps',
  })),
  overallScore,
});

describe('compareAssessments', () => {
  it('computes score delta per domain', () => {
    const prev = makeSession({ chair_stand: { score: 10, category: 'below_average' } });
    const curr = makeSession({ chair_stand: { score: 14, category: 'average' } });
    const result = compareAssessments(prev, curr);
    const lbs = result.domainDeltas.find((d) => d.domain === 'lower_body_strength');
    expect(lbs?.scoreDelta).toBe(4);
  });

  it('detects category improvement', () => {
    const prev = makeSession({ up_and_go: { score: 8.5, category: 'below_average' } });
    const curr = makeSession({ up_and_go: { score: 6.0, category: 'average' } });
    const result = compareAssessments(prev, curr);
    const ab = result.domainDeltas.find((d) => d.domain === 'agility_balance');
    expect(ab?.improved).toBe(true);
    expect(ab?.categoryChanged).toBe(true);
  });

  it('computes overall score delta', () => {
    const prev = makeSession({}, 10);
    const curr = makeSession({}, 14);
    const result = compareAssessments(prev, curr);
    expect(result.overallScoreDelta).toBe(4);
  });

  it('returns null score delta when either session has no result for that domain', () => {
    const prev = makeSession({});
    const curr = makeSession({ chair_stand: { score: 12, category: 'average' } });
    const result = compareAssessments(prev, curr);
    const lbs = result.domainDeltas.find((d) => d.domain === 'lower_body_strength');
    expect(lbs?.scoreDelta).toBeNull();
  });

  it('returns null overall delta when either session lacks an overall score', () => {
    const prev = makeSession({}, null);
    const curr = makeSession({}, 12);
    const result = compareAssessments(prev, curr);
    expect(result.overallScoreDelta).toBeNull();
  });

  it('deduplicates aerobic_endurance domain when step_test and walk_test both appear', () => {
    const prev = makeSession({ step_test: { score: 80, category: 'average' } });
    const curr = makeSession({ walk_test: { score: 550, category: 'above_average' } });
    const result = compareAssessments(prev, curr);
    const aerobic = result.domainDeltas.filter((d) => d.domain === 'aerobic_endurance');
    expect(aerobic).toHaveLength(1);
  });

  it('returns exactly 6 domain deltas', () => {
    const prev = makeSession({});
    const curr = makeSession({});
    const result = compareAssessments(prev, curr);
    expect(result.domainDeltas).toHaveLength(6);
  });
});
