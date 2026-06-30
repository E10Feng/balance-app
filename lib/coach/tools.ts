import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/lib/db';
import { sessionLogs, userExercisePlan } from '@/lib/schema';
import { eq, and, gte, desc } from 'drizzle-orm';
import { EXERCISES, EXERCISE_LEVELS } from '@/lib/seed-exercises';
import { validatePlanUpdate } from './guardrails';

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
      description: 'Get available exercises and their 5 difficulty levels',
      inputSchema: z.object({
        category: z.enum([
          'lower_body_strength', 'upper_body_strength',
          'lower_body_flexibility', 'upper_body_flexibility',
          'agility_balance', 'aerobic_endurance',
          'warm_up', 'cool_down',
        ]).optional()
          .describe('Filter by category, or omit for all'),
      }),
      execute: async (input) => {
        const filtered = input.category
          ? EXERCISES.filter((e) => e.category === input.category)
          : EXERCISES;
        return { exercises: filtered, levels: EXERCISE_LEVELS };
      },
    }),

    update_exercise_plan: tool({
      description: "Update the user's exercise plan for tomorrow. Call this after reviewing history.",
      inputSchema: z.object({
        exercises: z.array(z.object({
          exercise_id: z.string().describe('Exercise ID from the library'),
          level: z.number().min(1).max(5).describe('Difficulty level 1-5'),
        })).min(1).max(4),
      }),
      execute: async (input) => {
        const proposed = input.exercises;
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        // Get current plan for level validation
        const currentPlan = await db.query.userExercisePlan.findMany({
          where: and(eq(userExercisePlan.userId, userId), eq(userExercisePlan.scheduledDate, todayDate)),
        });
        const currentLevels = Object.fromEntries(currentPlan.map((p) => [p.exerciseId, p.level]));

        const validated = validatePlanUpdate(proposed, currentLevels);

        // Replace tomorrow's plan
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
