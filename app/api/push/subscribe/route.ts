import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { pushSubscriptions } from '@/lib/schema';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { endpoint, keys } = await req.json() as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };

  await db.insert(pushSubscriptions).values({
    userId: session.user.id,
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
  }).onConflictDoUpdate({
    target: pushSubscriptions.endpoint,
    set: { p256dh: keys.p256dh, auth: keys.auth },
  });

  return NextResponse.json({ ok: true });
}
