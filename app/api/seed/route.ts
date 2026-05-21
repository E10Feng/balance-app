import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { exercises, exerciseLevels } from '@/lib/schema';
import { EXERCISES, EXERCISE_LEVELS } from '@/lib/seed-exercises';

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
  }
  await db.insert(exercises).values(EXERCISES).onConflictDoNothing();
  await db.insert(exerciseLevels).values(
    EXERCISE_LEVELS.map((l) => ({ ...l, id: crypto.randomUUID() }))
  ).onConflictDoNothing();
  return NextResponse.json({ ok: true });
}
