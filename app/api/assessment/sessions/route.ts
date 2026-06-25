import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { assessmentSessions } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [created] = await db.insert(assessmentSessions).values({
    userId: session.user.id,
    dateOfTest: new Date().toISOString().slice(0, 10),
    status: 'in_progress',
  }).returning();

  return NextResponse.json({ session: created });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sessions = await db.query.assessmentSessions.findMany({
    where: eq(assessmentSessions.userId, session.user.id),
    orderBy: [desc(assessmentSessions.createdAt)],
  });

  return NextResponse.json({ sessions });
}
