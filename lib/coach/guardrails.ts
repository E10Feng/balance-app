const PAIN_KEYWORDS = ['pain', 'hurt', 'hurts', 'hurting', 'ache', 'aching', 'fall', 'fell', 'injured', 'injury'];

export const PAIN_RESPONSE = "I'm concerned about what you've shared. Please stop exercising and speak with your doctor before continuing. Your safety is the most important thing. 🌿";

export function containsPainKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  return PAIN_KEYWORDS.some((kw) => lower.includes(kw));
}

export function validatePlanUpdate(
  entries: Array<{ exercise_id: string; level: number }>,
  currentLevels: Record<string, number>
): Array<{ exercise_id: string; level: number }> {
  return entries.map((e) => {
    const current = currentLevels[e.exercise_id];
    let level = e.level;
    if (current !== undefined && level > current + 1) level = current + 1;
    level = Math.min(5, Math.max(1, level));
    return { ...e, level };
  });
}
