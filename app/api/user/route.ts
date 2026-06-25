import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import type { Sex } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await db.query.users.findFirst({ where: eq(users.id, session.user.id) });
  return NextResponse.json({
    name: user?.name ?? null,
    email: user?.email ?? null,
    reminderTime: user?.reminderTime ?? '09:00',
    sex: user?.sex ?? null,
    dateOfBirth: user?.dateOfBirth ?? null,
    createdAt: user?.createdAt ?? null,
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, reminderTime, sex, dateOfBirth } = (await req.json()) as {
    name?: string;
    reminderTime?: string;
    sex?: Sex;
    dateOfBirth?: string;
  };

  const [updated] = await db.update(users)
    .set({
      ...(name !== undefined && { name }),
      ...(reminderTime !== undefined && { reminderTime }),
      ...(sex !== undefined && { sex }),
      ...(dateOfBirth !== undefined && { dateOfBirth }),
    })
    .where(eq(users.id, session.user.id))
    .returning();

  return NextResponse.json({ user: updated });
}
