import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { assessmentSessions, assessmentStationResults, users } from '@/lib/schema';
import type { AssessmentStation } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { categorizeStationResult, computeAge } from '@/lib/assessment/scoring';

const VALID_STATIONS: AssessmentStation[] = [
  'chair_stand', 'arm_curl', 'sit_reach', 'back_scratch', 'up_and_go', 'walk_test', 'step_test',
];

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; station: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, station } = await params;

  if (!VALID_STATIONS.includes(station as AssessmentStation)) {
    return NextResponse.json({ error: 'Invalid station' }, { status: 400 });
  }
  const stationKey = station as AssessmentStation;

  const { rawData, score, unit } = (await req.json()) as { rawData: unknown; score: number; unit: string };

  const [foundSession, user] = await Promise.all([
    db.query.assessmentSessions.findFirst({
      where: and(eq(assessmentSessions.id, id), eq(assessmentSessions.userId, session.user.id)),
    }),
    db.query.users.findFirst({ where: eq(users.id, session.user.id) }),
  ]);
  if (!foundSession) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const age = user?.dateOfBirth ? computeAge(user.dateOfBirth) : null;
  const sex = user?.sex ?? null;

  const category = categorizeStationResult(stationKey, score, age, sex, {
    heightCm: foundSession.heightCm,
    bmi: foundSession.bmi,
  });

  const existing = await db.query.assessmentStationResults.findFirst({
    where: and(
      eq(assessmentStationResults.sessionId, id),
      eq(assessmentStationResults.station, stationKey)
    ),
  });

  const values = { rawData, score, unit, category };

  const [result] = existing
    ? await db.update(assessmentStationResults)
        .set(values)
        .where(eq(assessmentStationResults.id, existing.id))
        .returning()
    : await db.insert(assessmentStationResults)
        .values({ sessionId: id, station: stationKey, ...values })
        .returning();

  return NextResponse.json({ result });
}
