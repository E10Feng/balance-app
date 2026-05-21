import { auth } from '@/lib/auth';
import { streamText, stepCountIs } from 'ai';
import type { ModelMessage } from 'ai';
import { google } from '@ai-sdk/google';
import { NextResponse } from 'next/server';
import { makeCoachTools } from '@/lib/coach/tools';
import { buildSystemPrompt } from '@/lib/coach/system-prompt';
import { containsPainKeywords, PAIN_RESPONSE } from '@/lib/coach/guardrails';
import { db } from '@/lib/db';
import { users, userExercisePlan } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

const today = () => new Date().toISOString().split('T')[0];

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

  const { messages } = await req.json() as { messages: Array<{ role: string; content: string }> };
  const lastMessage = messages[messages.length - 1]?.content ?? '';

  if (containsPainKeywords(lastMessage)) {
    return NextResponse.json({ type: 'text', text: PAIN_RESPONSE });
  }

  const date = today();
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  const plan = await db.query.userExercisePlan.findMany({
    where: and(eq(userExercisePlan.userId, userId), eq(userExercisePlan.scheduledDate, date)),
    with: { exercise: true },
  });

  const result = streamText({
    model: google('gemini-2.5-flash-preview-05-20'),
    system: buildSystemPrompt({
      userName: user?.name ?? 'friend',
      todayPlan: plan.map((p) => ({ name: p.exercise.name, level: p.level })),
      recentSummary: 'Use get_user_history tool to fetch recent sessions.',
    }),
    messages: messages as ModelMessage[],
    tools: makeCoachTools(userId, date),
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
