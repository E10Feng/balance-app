import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sessionLogs, exerciseLogs } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import type { UserRating } from '@/lib/schema';

const today = () => new Date().toISOString().split('T')[0];

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

  const { exerciseId, level, durationSeconds, userRating } = await req.json() as {
    exerciseId: string;
    level: number;
    durationSeconds: number;
    userRating: UserRating;
  };

  let sessionLog = await db.query.sessionLogs.findFirst({
    where: and(eq(sessionLogs.userId, userId), eq(sessionLogs.date, today())),
  });

  if (!sessionLog) {
    const [created] = await db.insert(sessionLogs).values({
      id: crypto.randomUUID(),
      userId,
      date: today(),
    }).returning();
    sessionLog = created;
  }

  const [log] = await db.insert(exerciseLogs).values({
    id: crypto.randomUUID(),
    sessionId: sessionLog.id,
    exerciseId,
    level,
    completed: true,
    durationSeconds,
    userRating,
  }).returning();

  return NextResponse.json({ log, sessionId: sessionLog.id });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;
  const { sessionId } = await req.json() as { sessionId: string };

  const [updated] = await db.update(sessionLogs)
    .set({ completedAt: new Date() })
    .where(and(eq(sessionLogs.id, sessionId), eq(sessionLogs.userId, userId)))
    .returning();

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ session: updated });
}
