import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sessionLogs, userCategoryLevels } from '@/lib/schema';
import { eq, and, gte, desc } from 'drizzle-orm';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString().split('T')[0];

  const logs = await db.query.sessionLogs.findMany({
    where: and(eq(sessionLogs.userId, userId), gte(sessionLogs.date, cutoff)),
    orderBy: desc(sessionLogs.date),
  });

  const completedDates = logs.filter((l) => l.completedAt).map((l) => l.date);

  // Weekly: days since start of current week (Sunday)
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const startOfWeekStr = startOfWeek.toISOString().split('T')[0];
  const weeklyCount = logs.filter((l) => l.completedAt && l.date >= startOfWeekStr).length;

  // Monthly: current calendar month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const monthlyCount = logs.filter((l) => l.completedAt && l.date >= startOfMonth).length;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  const categoryLevelRows = await db.query.userCategoryLevels.findMany({
    where: eq(userCategoryLevels.userId, userId),
  });

  let streak = 0;
  const check = new Date();
  for (const log of logs) {
    const diff = Math.round((check.getTime() - new Date(log.date).getTime()) / 86400000);
    if (diff === streak && log.completedAt) { streak++; check.setDate(check.getDate() - 1); }
    else break;
  }

  return NextResponse.json({
    completedDates,
    streak,
    categoryLevels: categoryLevelRows,
    weeklyCount,
    weeklyGoal: 7,
    monthlyCount,
    monthlyGoal: daysInMonth,
  });
}
