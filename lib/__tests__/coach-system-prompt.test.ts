import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '../coach/system-prompt';

describe('buildSystemPrompt', () => {
  it('includes the user name', () => {
    const prompt = buildSystemPrompt({ userName: 'Ming', todayPlan: [], recentSummary: '' });
    expect(prompt).toContain('Ming');
  });

  it('includes the plan exercises with category and level', () => {
    const prompt = buildSystemPrompt({
      userName: 'Ming',
      todayPlan: [{ name: 'Tandem Stance', level: 2, category: 'agility_balance' }],
      recentSummary: '',
    });
    expect(prompt).toContain('Tandem Stance');
    expect(prompt).toContain('Level 2');
    expect(prompt).toContain('agility_balance');
  });

  it('includes the safety rules', () => {
    const prompt = buildSystemPrompt({ userName: 'Ming', todayPlan: [], recentSummary: '' });
    expect(prompt).toContain('pain');
    expect(prompt).toContain('assessment');
  });
});
