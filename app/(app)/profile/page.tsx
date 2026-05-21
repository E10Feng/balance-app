'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

type UserData = { name: string | null; email: string | null; reminderTime: string; createdAt: string | null };
type ProgressData = { streak: number };

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

const REMINDER_LABELS: Record<string, string> = {
  '07:00': '7:00 AM', '08:00': '8:00 AM', '09:00': '9:00 AM', '10:00': '10:00 AM',
  '14:00': '2:00 PM', '16:00': '4:00 PM', '18:00': '6:00 PM', '20:00': '8:00 PM',
};

export default function ProfilePage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [streak, setStreak] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/user').then((r) => r.json()).then(setUser);
    fetch('/api/progress').then((r) => r.json()).then((d: ProgressData) => setStreak(d.streak));
  }, []);

  if (!user) {
    return <div className="p-6 text-mid text-xl">Loading...</div>;
  }

  return (
    <div className="p-6 pt-10 flex flex-col gap-6 max-w-md mx-auto">
      <div>
        <p className="text-mid text-sm font-medium uppercase tracking-widest">Your account</p>
        <h1 className="font-heading text-4xl font-semibold text-dark mt-1">Profile</h1>
      </div>

      <div className="bg-surface rounded-2xl p-6 flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-heading font-semibold flex-shrink-0">
            {user.name ? user.name[0].toUpperCase() : '?'}
          </div>
          <div>
            <p className="font-heading text-2xl font-semibold text-dark">{user.name ?? '—'}</p>
            <p className="text-mid text-base">{user.email ?? '—'}</p>
          </div>
        </div>

        <div className="h-px bg-primary-light" />

        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <p className="text-dark text-lg">Current streak</p>
            <p className="font-heading text-xl font-semibold text-primary">
              {streak !== null ? `🔥 ${streak} day${streak === 1 ? '' : 's'}` : '—'}
            </p>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-dark text-lg">Daily reminder</p>
            <p className="text-mid text-lg">{REMINDER_LABELS[user.reminderTime] ?? user.reminderTime}</p>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-dark text-lg">Member since</p>
            <p className="text-mid text-lg">{formatDate(user.createdAt)}</p>
          </div>
        </div>
      </div>

      <Link
        href="/settings"
        className="w-full bg-surface border-2 border-primary-light text-primary text-xl font-semibold py-5 rounded-2xl text-center"
      >
        Settings
      </Link>
    </div>
  );
}
