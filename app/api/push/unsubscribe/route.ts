import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { pushSubscriptions } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { endpoint } = await req.json() as { endpoint: string };

  await db.delete(pushSubscriptions).where(
    and(
      eq(pushSubscriptions.userId, session.user.id),
      eq(pushSubscriptions.endpoint, endpoint)
    )
  );

  return NextResponse.json({ ok: true });
}
