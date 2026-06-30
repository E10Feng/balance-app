import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { exercises, exerciseLevels, userExercisePlan, userCategoryLevels } from '@/lib/schema';
import { EXERCISES, EXERCISE_LEVELS } from '@/lib/seed-exercises';

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
  }
  // Clear in dependency order so FKs don't block
  await db.delete(userExercisePlan);
  await db.delete(userCategoryLevels);
  await db.delete(exerciseLevels);
  await db.delete(exercises);
  // Reseed
  await db.insert(exercises).values(EXERCISES);
  await db.insert(exerciseLevels).values(
    EXERCISE_LEVELS.map((l) => ({ ...l, id: crypto.randomUUID() }))
  );
  return NextResponse.json({ ok: true, exerciseCount: EXERCISES.length, levelCount: EXERCISE_LEVELS.length });
}
