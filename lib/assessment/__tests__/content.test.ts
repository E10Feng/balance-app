import { describe, it, expect } from 'vitest';
import { STATION_CONTENT, getStationContent } from '../content';

describe('STATION_CONTENT', () => {
  it('has one entry for each of the 6 non-endurance station slots', () => {
    expect(STATION_CONTENT).toHaveLength(6);
  });

  it('every entry has non-empty purpose, equipment, procedure, and safety notes', () => {
    for (const content of STATION_CONTENT) {
      expect(content.purpose.length).toBeGreaterThan(0);
      expect(content.equipment.length).toBeGreaterThan(0);
      expect(content.procedure.length).toBeGreaterThan(0);
      expect(content.safetyNotes.length).toBeGreaterThan(0);
    }
  });

  it('station numbers run 1 through 6 with no duplicates', () => {
    const numbers = STATION_CONTENT.map((c) => c.stationNumber).sort((a, b) => a - b);
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('getStationContent', () => {
  it('returns content for a regular station key', () => {
    expect(getStationContent('chair_stand').title).toBe('Chair Stand Test');
  });

  it('returns the 6-minute walk content for walk_step with variant "walk"', () => {
    expect(getStationContent('walk_step', 'walk').title).toBe('6-Minute Walk Test');
  });

  it('returns the 2-minute step content for walk_step with variant "step"', () => {
    expect(getStationContent('walk_step', 'step').title).toBe('2-Minute Step in Place Test');
  });

  it('defaults walk_step to the walk variant when none is given', () => {
    expect(getStationContent('walk_step').title).toBe('6-Minute Walk Test');
  });

  it('both endurance variants are tagged as station 7', () => {
    expect(getStationContent('walk_step', 'walk').stationNumber).toBe(7);
    expect(getStationContent('walk_step', 'step').stationNumber).toBe(7);
  });
});
