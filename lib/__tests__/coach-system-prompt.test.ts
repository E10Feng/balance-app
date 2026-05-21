import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '../coach/system-prompt';

describe('buildSystemPrompt', () => {
  it('includes the user name', () => {
    const prompt = buildSystemPrompt({ userName: 'Ming', todayPlan: [], recentSummary: '' });
    expect(prompt).toContain('Ming');
  });

  it('includes the plan exercises', () => {
    const prompt = buildSystemPrompt({
      userName: 'Ming',
      todayPlan: [{ name: 'Tandem Stance', level: 2 }],
      recentSummary: '',
    });
    expect(prompt).toContain('Tandem Stance');
    expect(prompt).toContain('Level 2');
  });

  it('includes the safety rules', () => {
    const prompt = buildSystemPrompt({ userName: 'Ming', todayPlan: [], recentSummary: '' });
    expect(prompt).toContain('pain');
    expect(prompt).toContain('4 exercises');
  });
});
