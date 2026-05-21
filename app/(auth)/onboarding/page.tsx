'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const REMINDER_TIMES = ['07:00', '08:00', '09:00', '10:00', '14:00', '16:00', '18:00', '20:00'];
const REMINDER_LABELS: Record<string, string> = {
  '07:00': '7:00 AM', '08:00': '8:00 AM', '09:00': '9:00 AM', '10:00': '10:00 AM',
  '14:00': '2:00 PM', '16:00': '4:00 PM', '18:00': '6:00 PM', '20:00': '8:00 PM',
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [reminderTime, setReminderTime] = useState('09:00');
  const [saving, setSaving] = useState(false);

  async function handleFinish() {
    setSaving(true);
    await fetch('/api/user', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), reminderTime }),
    });
    router.push('/');
  }

  return (
    <div className="flex flex-col min-h-screen bg-bg p-8 pt-16 max-w-md mx-auto">
      {step === 1 && (
        <>
          <div className="text-6xl mb-6 text-center">🌿</div>
          <h1 className="font-heading text-4xl font-semibold text-dark mb-2">
            Welcome to<br /><span className="italic text-primary">BalanceWell</span>
          </h1>
          <p className="text-mid text-xl mb-10">
            Your daily balance exercise companion. Let&apos;s get started.
          </p>
          <label className="text-dark text-xl font-medium mb-3">What should Coach Mei call you?</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your first name"
            className="w-full text-xl p-5 rounded-2xl border-2 border-primary-light bg-surface text-dark outline-none focus:border-primary mb-6"
          />
          <button
            onClick={() => setStep(2)}
            disabled={!name.trim()}
            className="w-full bg-primary text-white text-xl font-semibold py-5 rounded-2xl disabled:opacity-50"
          >
            Continue →
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <h1 className="font-heading text-4xl font-semibold text-dark mb-2">
            When should we<br /><span className="italic text-primary">remind you?</span>
          </h1>
          <p className="text-mid text-xl mb-8">We&apos;ll send a daily reminder at this time.</p>
          <div className="grid grid-cols-2 gap-3 mb-8">
            {REMINDER_TIMES.map((t) => (
              <button
                key={t}
                onClick={() => setReminderTime(t)}
                className={`py-4 rounded-2xl text-xl font-medium border-2 transition-all ${
                  reminderTime === t
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface text-dark border-primary-light'
                }`}
              >
                {REMINDER_LABELS[t]}
              </button>
            ))}
          </div>
          <button
            onClick={handleFinish}
            disabled={saving}
            className="w-full bg-primary text-white text-xl font-semibold py-5 rounded-2xl disabled:opacity-60"
          >
            {saving ? 'Setting up...' : "Let's go! 🌿"}
          </button>
        </>
      )}
    </div>
  );
}
