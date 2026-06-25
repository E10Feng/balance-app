import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { assessmentSessions } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { computeBMI } from '@/lib/assessment/scoring';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const { heightCm, weightKg } = (await req.json()) as { heightCm: number; weightKg: number };

  const found = await db.query.assessmentSessions.findFirst({
    where: and(eq(assessmentSessions.id, id), eq(assessmentSessions.userId, session.user.id)),
  });
  if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { bmi, category } = computeBMI(weightKg, heightCm);

  const [updated] = await db.update(assessmentSessions)
    .set({ heightCm, weightKg, bmi, bmiCategory: category })
    .where(eq(assessmentSessions.id, id))
    .returning();

  return NextResponse.json({ session: updated });
}
