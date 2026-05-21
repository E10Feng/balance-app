import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, reminderTime } = await req.json() as { name?: string; reminderTime?: string };

  const [updated] = await db.update(users)
    .set({
      ...(name !== undefined && { name }),
      ...(reminderTime !== undefined && { reminderTime }),
    })
    .where(eq(users.id, session.user.id))
    .returning();

  return NextResponse.json({ user: updated });
}
