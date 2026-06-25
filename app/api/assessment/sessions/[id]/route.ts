import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { assessmentSessions } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { computeOverallScore, STATION_TO_DOMAIN, type Domain, type AssessmentCategory } from '@/lib/assessment/scoring';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const found = await db.query.assessmentSessions.findFirst({
    where: and(eq(assessmentSessions.id, id), eq(assessmentSessions.userId, session.user.id)),
    with: { stationResults: true },
  });

  if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ session: found });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const body = (await req.json()) as { status?: 'completed'; walkTestVariant?: 'walk' | 'step' };

  const found = await db.query.assessmentSessions.findFirst({
    where: and(eq(assessmentSessions.id, id), eq(assessmentSessions.userId, session.user.id)),
    with: { stationResults: true },
  });
  if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Picking the Station 7 variant doesn't need scoring — just record the choice.
  if (body.walkTestVariant && !body.status) {
    const [updated] = await db.update(assessmentSessions)
      .set({ walkTestVariant: body.walkTestVariant })
      .where(eq(assessmentSessions.id, id))
      .returning();
    return NextResponse.json({ session: updated });
  }

  if (body.status !== 'completed') {
    return NextResponse.json({ error: 'Unsupported status' }, { status: 400 });
  }

  const domains: Record<Domain, AssessmentCategory | null> = {
    lower_body_strength: null,
    upper_body_strength: null,
    lower_body_flexibility: null,
    upper_body_flexibility: null,
    agility_balance: null,
    aerobic_endurance: null,
  };
  for (const result of found.stationResults) {
    domains[STATION_TO_DOMAIN[result.station]] = result.category;
  }

  const overall = computeOverallScore(domains);
  const wasAlreadyCompleted = found.status === 'completed';

  const [updated] = await db.update(assessmentSessions)
    .set({
      status: 'completed',
      overallScore: overall.total,
      overallCategory: overall.overallCategory,
      ...(wasAlreadyCompleted ? {} : { completedAt: new Date() }),
    })
    .where(eq(assessmentSessions.id, id))
    .returning();

  return NextResponse.json({ session: updated, overall });
}
