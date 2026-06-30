import type { ExerciseCategory } from '@/lib/schema';

const PAIN_KEYWORDS = ['pain', 'hurt', 'hurts', 'hurting', 'ache', 'aching', 'fall', 'fell', 'injured', 'injury', 'sore', 'soreness', 'dizzy', 'dizziness', 'nausea', 'nauseous', 'chest', 'breathe', 'breathing', 'faint', 'fainting', 'lightheaded', 'numbness', 'numb'];

export const PAIN_RESPONSE = "I'm concerned about what you've shared. Please stop exercising and speak with your doctor before continuing. Your safety is the most important thing. 🌿";

export function containsPainKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  return PAIN_KEYWORDS.some((kw) => lower.includes(kw));
}

export function validatePlanUpdate(
  entries: Array<{ exercise_id: string; level: number }>,
  exerciseCategoryMap: Record<string, ExerciseCategory>,
  categoryLevels: Record<ExerciseCategory, number>
): Array<{ exercise_id: string; level: number }> {
  return entries.map((e) => {
    const category = exerciseCategoryMap[e.exercise_id];
    const fixedLevel = category !== undefined ? (categoryLevels[category] ?? 2) : 2;
    return { ...e, level: fixedLevel };
  });
}
