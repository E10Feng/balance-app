import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sessionLogs, userExercisePlan } from '@/lib/schema';
import { eq, and, gte, desc } from 'drizzle-orm';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString().split('T')[0];

  const logs = await db.query.sessionLogs.findMany({
    where: and(eq(sessionLogs.userId, userId), gte(sessionLogs.date, cutoff)),
    orderBy: desc(sessionLogs.date),
  });

  const completedDates = logs.filter((l) => l.completedAt).map((l) => l.date);

  const today = new Date().toISOString().split('T')[0];
  const plan = await db.query.userExercisePlan.findMany({
    where: and(eq(userExercisePlan.userId, userId), eq(userExercisePlan.scheduledDate, today)),
    with: { exercise: true },
  });

  let streak = 0;
  const check = new Date();
  for (const log of logs) {
    const diff = Math.round((check.getTime() - new Date(log.date).getTime()) / 86400000);
    if (diff === streak && log.completedAt) { streak++; check.setDate(check.getDate() - 1); }
    else break;
  }

  return NextResponse.json({ completedDates, plan, streak });
}
