import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/lib/db';
import { sessionLogs, userExercisePlan, userCategoryLevels } from '@/lib/schema';
import { eq, and, gte, desc } from 'drizzle-orm';
import { EXERCISES, EXERCISE_LEVELS } from '@/lib/seed-exercises';
import { validatePlanUpdate } from './guardrails';
import type { ExerciseCategory } from '@/lib/schema';

const exerciseCategoryMap: Record<string, ExerciseCategory> = Object.fromEntries(
  EXERCISES.map((e) => [e.id, e.category])
);

export function makeCoachTools(userId: string, todayDate: string) {
  return {
    get_user_history: tool({
      description: "Get the user's exercise history and session check-ins for the last N days",
      inputSchema: z.object({ days: z.number().min(1).max(30).describe('Number of days of history to fetch') }),
      execute: async (input) => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - input.days);
        const cutoffStr = cutoff.toISOString().split('T')[0];
        const sessions = await db.query.sessionLogs.findMany({
          where: and(eq(sessionLogs.userId, userId), gte(sessionLogs.date, cutoffStr)),
          with: { exerciseLogs: true },
          orderBy: desc(sessionLogs.date),
        });
        return { sessions };
      },
    }),

    get_exercise_library: tool({
      description: 'Get available exercises filtered by category. Use this to find exercises to swap in.',
      inputSchema: z.object({
        category: z.enum([
          'lower_body_strength', 'upper_body_strength',
          'lower_body_flexibility', 'upper_body_flexibility',
          'agility_balance', 'aerobic_endurance',
          'warm_up', 'cool_down',
        ] as const).optional().describe('Filter by category, or omit for all'),
      }),
      execute: async (input) => {
        const filtered = input.category
          ? EXERCISES.filter((e) => e.category === input.category)
          : EXERCISES;
        return { exercises: filtered, levels: EXERCISE_LEVELS };
      },
    }),

    update_exercise_plan: tool({
      description: "Update the user's exercise plan for tomorrow. You may only swap exercises within the same category — never change categories or levels. Call get_exercise_library first to see available exercises.",
      inputSchema: z.object({
        exercises: z.array(z.object({
          exercise_id: z.string().describe('Exercise ID from the library'),
          level: z.number().min(1).max(3).describe('Difficulty level 1–3 (must match the fixed level for this category — the system will enforce this)'),
        })).min(1).max(8),
      }),
      execute: async (input) => {
        const proposed = input.exercises;
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        const categoryLevelRows = await db.query.userCategoryLevels.findMany({
          where: eq(userCategoryLevels.userId, userId),
        });
        const defaultLevel: Record<ExerciseCategory, number> = {
          lower_body_strength: 2, upper_body_strength: 2,
          lower_body_flexibility: 2, upper_body_flexibility: 2,
          agility_balance: 2, aerobic_endurance: 2,
          warm_up: 2, cool_down: 2,
        };
        const categoryLevels = { ...defaultLevel };
        for (const row of categoryLevelRows) {
          categoryLevels[row.category] = row.level;
        }

        const validated = validatePlanUpdate(proposed, exerciseCategoryMap, categoryLevels);

        await db.delete(userExercisePlan).where(
          and(eq(userExercisePlan.userId, userId), eq(userExercisePlan.scheduledDate, tomorrowStr))
        );
        await db.insert(userExercisePlan).values(
          validated.map((e, i) => ({
            id: crypto.randomUUID(),
            userId,
            exerciseId: e.exercise_id,
            level: e.level,
            scheduledDate: tomorrowStr,
            order: i + 1,
          }))
        );

        return { success: true, updatedExercises: validated };
      },
    }),
  };
}
