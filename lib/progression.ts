export type HistoryEntry = {
  completed: boolean;
  userRating: 'too_easy' | 'just_right' | 'too_hard' | null;
};

export function computeNextLevel(currentLevel: number, recentHistory: HistoryEntry[]): number {
  // Immediate regression on too_hard
  if (recentHistory.some((h) => h.userRating === 'too_hard')) {
    return Math.max(1, currentLevel - 1);
  }

  const last3 = recentHistory.slice(-3);

  // Advance after 3 consecutive completions
  if (last3.length === 3 && last3.every((h) => h.completed)) {
    return Math.min(5, currentLevel + 1);
  }

  // Regress after 3 consecutive misses
  if (last3.length === 3 && last3.every((h) => !h.completed)) {
    return Math.max(1, currentLevel - 1);
  }

  return currentLevel;
}

export function buildDefaultPlan(
  exerciseIds: string[],
  currentLevels: Record<string, number> = {}
): Array<{ exerciseId: string; level: number; order: number }> {
  return exerciseIds.slice(0, 4).map((exerciseId, i) => ({
    exerciseId,
    level: Math.min(5, Math.max(1, currentLevels[exerciseId] ?? 1)),
    order: i + 1,
  }));
}
