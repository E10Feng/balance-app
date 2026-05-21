import { auth } from '@/lib/auth';
import { generateText, stepCountIs } from 'ai';
import { google } from '@ai-sdk/google';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessionLogs, users, userExercisePlan } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { makeCoachTools } from '@/lib/coach/tools';
import { buildSystemPrompt } from '@/lib/coach/system-prompt';

const today = () => new Date().toISOString().split('T')[0];

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

  const { sessionId, overall, notes } = await req.json() as {
    sessionId: string;
    overall: number | null;
    notes: string;
  };

  const date = today();

  // Save check-in to session log
  await db.update(sessionLogs)
    .set({ checkInOverall: overall, checkInNotes: notes, completedAt: new Date() })
    .where(and(eq(sessionLogs.id, sessionId), eq(sessionLogs.userId, userId)));

  // Build context for coach
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  const plan = await db.query.userExercisePlan.findMany({
    where: and(eq(userExercisePlan.userId, userId), eq(userExercisePlan.scheduledDate, date)),
    with: { exercise: true },
  });

  // Fire-and-forget: trigger coach to update tomorrow's plan without blocking the response
  generateText({
    model: google('gemini-2.5-flash-preview-05-20'),
    system: buildSystemPrompt({
      userName: user?.name ?? 'friend',
      todayPlan: plan.map((p) => ({ name: p.exercise.name, level: p.level })),
      recentSummary: "Use get_user_history to review recent sessions then update tomorrow's plan.",
    }),
    messages: [{
      role: 'user',
      content: `The user just finished their session. Check-in: overall feeling ${overall ?? 'not rated'}/5. Notes: "${notes || 'none'}". Review their last 7 days and update tomorrow's plan accordingly.`,
    }],
    tools: makeCoachTools(userId, date),
    stopWhen: stepCountIs(5),
  }).catch(console.error);

  return NextResponse.json({ ok: true });
}
