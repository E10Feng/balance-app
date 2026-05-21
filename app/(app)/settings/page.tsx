'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';

const REMINDER_TIMES = ['07:00', '08:00', '09:00', '10:00', '14:00', '16:00', '18:00', '20:00'];
const REMINDER_LABELS: Record<string, string> = {
  '07:00': '7:00 AM', '08:00': '8:00 AM', '09:00': '9:00 AM', '10:00': '10:00 AM',
  '14:00': '2:00 PM', '16:00': '4:00 PM', '18:00': '6:00 PM', '20:00': '8:00 PM',
};

export default function SettingsPage() {
  const router = useRouter();
  const [reminderTime, setReminderTime] = useState('09:00');
  const [largeText, setLargeText] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/user')
      .then((r) => r.json())
      .then((d: { reminderTime?: string }) => {
        if (d.reminderTime) setReminderTime(d.reminderTime);
      });
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('largeText');
    if (stored === 'true') {
      setLargeText(true);
      document.documentElement.style.fontSize = '24px';
    }
    if ('Notification' in window && Notification.permission === 'granted') {
      setPushEnabled(true);
    }
  }, []);

  function toggleLargeText() {
    const next = !largeText;
    setLargeText(next);
    localStorage.setItem('largeText', String(next));
    document.documentElement.style.fontSize = next ? '24px' : '20px';
  }

  async function togglePush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (pushEnabled) {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await fetch('/api/push/unsubscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
      }
      setPushEnabled(false);
    } else {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });
      const subJson = sub.toJSON();
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
        }),
      });
      setPushEnabled(true);
    }
  }

  async function save() {
    setSaving(true);
    await fetch('/api/user', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reminderTime }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="p-6 pt-10 flex flex-col gap-6 max-w-md mx-auto">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-12 h-12 rounded-full bg-surface flex items-center justify-center"
          aria-label="Go back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--dark)" strokeWidth="2.5" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <h1 className="font-heading text-3xl font-semibold text-dark">Settings</h1>
      </div>

      <div className="bg-surface rounded-2xl p-5">
        <p className="font-heading text-xl text-dark mb-4">Daily Reminder</p>
        <div className="grid grid-cols-2 gap-3">
          {REMINDER_TIMES.map((t) => (
            <button
              key={t}
              onClick={() => setReminderTime(t)}
              className={`py-3 rounded-xl text-lg font-medium border-2 transition-all ${
                reminderTime === t ? 'bg-primary text-white border-primary' : 'bg-bg text-dark border-primary-light'
              }`}
            >
              {REMINDER_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-surface rounded-2xl p-5 flex items-center justify-between">
        <div>
          <p className="font-heading text-xl text-dark">Large Text</p>
          <p className="text-mid text-base mt-1">Increases all text size by 20%</p>
        </div>
        <button
          onClick={toggleLargeText}
          aria-label={largeText ? 'Disable large text' : 'Enable large text'}
          className={`w-14 h-8 rounded-full transition-colors relative ${largeText ? 'bg-primary' : 'bg-muted'}`}
        >
          <span className={`absolute top-1 block w-6 h-6 rounded-full bg-white transition-transform ${largeText ? 'left-7' : 'left-1'}`} />
        </button>
      </div>

      <div className="bg-surface rounded-2xl p-5 flex items-center justify-between">
        <div>
          <p className="font-heading text-xl text-dark">Push Notifications</p>
          <p className="text-mid text-base mt-1">Get reminded in your browser</p>
        </div>
        <button
          onClick={togglePush}
          aria-label={pushEnabled ? 'Disable push notifications' : 'Enable push notifications'}
          className={`w-14 h-8 rounded-full transition-colors relative ${pushEnabled ? 'bg-primary' : 'bg-muted'}`}
        >
          <span className={`absolute top-1 block w-6 h-6 rounded-full bg-white transition-transform ${pushEnabled ? 'left-7' : 'left-1'}`} />
        </button>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="w-full bg-primary text-white text-xl font-semibold py-5 rounded-2xl disabled:opacity-60"
      >
        {saved ? '✓ Saved!' : saving ? 'Saving...' : 'Save Settings'}
      </button>

      <button
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="w-full py-5 rounded-2xl border-2 border-muted text-mid text-xl font-medium"
      >
        Sign Out
      </button>
    </div>
  );
}
