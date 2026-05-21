import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { db } from '@/lib/db';
import { users, pushSubscriptions } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { sendEmailReminder, sendPushReminder } from '@/lib/reminders';

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`;
  const safe = authHeader.length === expected.length &&
    timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
  if (!safe) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentTime = new Date().toTimeString().slice(0, 5); // e.g. "09:00"

  const dueUsers = await db.query.users.findMany({
    where: eq(users.reminderTime, currentTime),
  });

  const results = await Promise.allSettled(
    dueUsers.map(async (user) => {
      if (!user.email || !user.name) return;
      await sendEmailReminder(user.email, user.name).catch(() => null);
      const subs = await db.query.pushSubscriptions.findMany({
        where: eq(pushSubscriptions.userId, user.id),
      });
      await Promise.allSettled(subs.map((s) => sendPushReminder(s, user.name!)));
    })
  );

  return NextResponse.json({ sent: dueUsers.length, results: results.length });
}
