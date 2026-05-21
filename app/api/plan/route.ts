import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { userExercisePlan, sessionLogs, users } from '@/lib/schema';
import { eq, and, desc } from 'drizzle-orm';
import { buildDefaultPlan } from '@/lib/progression';
import { EXERCISES } from '@/lib/seed-exercises';

const today = () => new Date().toISOString().split('T')[0];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

  // Check if user needs onboarding
  const userRecord = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!userRecord?.name) {
    return NextResponse.json({ error: 'needs_onboarding' });
  }

  const date = today();

  let plan = await db.query.userExercisePlan.findMany({
    where: and(eq(userExercisePlan.userId, userId), eq(userExercisePlan.scheduledDate, date)),
    with: { exercise: true },
    orderBy: userExercisePlan.order,
  });

  if (plan.length === 0) {
    plan = await seedTodaysPlan(userId, date);
  }

  const sessionLog = await db.query.sessionLogs.findFirst({
    where: and(eq(sessionLogs.userId, userId), eq(sessionLogs.date, date)),
    with: { exerciseLogs: true },
  });

  const completedIds = new Set(
    (sessionLog?.exerciseLogs ?? []).filter((l) => l.completed).map((l) => l.exerciseId)
  );

  const streak = await computeStreak(userId);

  return NextResponse.json({
    plan: plan.map((p) => ({ ...p, completed: completedIds.has(p.exerciseId) })),
    sessionId: sessionLog?.id ?? null,
    streak,
  });
}

async function seedTodaysPlan(userId: string, date: string) {
  const defaultExerciseIds = EXERCISES.slice(0, 4).map((e) => e.id);
  const entries = buildDefaultPlan(defaultExerciseIds);
  const rows = entries.map((e) => ({ ...e, id: crypto.randomUUID(), userId, scheduledDate: date }));
  await db.insert(userExercisePlan).values(rows);
  return db.query.userExercisePlan.findMany({
    where: and(eq(userExercisePlan.userId, userId), eq(userExercisePlan.scheduledDate, date)),
    with: { exercise: true },
    orderBy: userExercisePlan.order,
  });
}

async function computeStreak(userId: string): Promise<number> {
  const logs = await db.query.sessionLogs.findMany({
    where: eq(sessionLogs.userId, userId),
    orderBy: desc(sessionLogs.date),
    limit: 30,
  });
  let streak = 0;
  const check = new Date();
  for (const log of logs) {
    const diff = Math.round(
      (check.getTime() - new Date(log.date).getTime()) / 86400000
    );
    if (diff === streak && log.completedAt) {
      streak++;
      check.setDate(check.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}
