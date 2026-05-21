'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CoachMei from '@/components/CoachMei';

const EMOJI_RATINGS = ['😟', '😕', '😐', '🙂', '😊'];
const QUICK_CHIPS = ['Too easy', 'Too hard', 'Felt great', 'Feeling tired', 'Some discomfort'];

export default function CheckInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId') ?? '';

  const [overall, setOverall] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function addChip(chip: string) {
    setNotes((prev) => prev ? `${prev}, ${chip}` : chip);
  }

  async function handleSubmit() {
    setSubmitting(true);
    await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, overall, notes }),
    });
    router.push('/');
  }

  return (
    <div className="flex flex-col min-h-screen bg-bg p-6 pt-10 max-w-md mx-auto">
      <div className="flex flex-col items-center gap-4 mb-8">
        <CoachMei state="celebrating" size={100} />
        <h1 className="font-heading text-3xl font-semibold text-dark text-center">Great work today! 🎉</h1>
        <p className="text-mid text-xl text-center">Help Coach Mei plan tomorrow&apos;s session.</p>
      </div>

      <div className="flex flex-col gap-6">
        <div>
          <p className="text-dark text-xl font-medium mb-4">How did today feel overall?</p>
          <div className="flex justify-between gap-2">
            {EMOJI_RATINGS.map((emoji, i) => (
              <button
                key={i}
                onClick={() => setOverall(i + 1)}
                className={`flex-1 py-4 rounded-2xl text-3xl border-2 transition-all ${
                  overall === i + 1 ? 'border-primary bg-primary-light' : 'border-primary-light bg-surface'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-dark text-xl font-medium mb-3">Anything to tell Coach Mei?</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => addChip(chip)}
                className="bg-surface border-2 border-primary-light text-primary text-base font-medium px-4 py-2 rounded-full"
              >
                {chip}
              </button>
            ))}
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Or type something..."
            rows={3}
            className="w-full text-lg p-4 rounded-2xl border-2 border-primary-light bg-surface text-dark outline-none focus:border-primary resize-none"
          />
        </div>
      </div>

      <div className="flex gap-3 mt-8">
        <button
          onClick={() => router.push('/')}
          className="flex-1 py-5 rounded-2xl border-2 border-muted text-mid text-lg font-medium"
        >
          Skip
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting || overall === null}
          className="flex-[2] py-5 rounded-2xl bg-primary text-white text-lg font-semibold disabled:opacity-60"
        >
          {submitting ? 'Updating plan...' : 'Send to Coach Mei'}
        </button>
      </div>
    </div>
  );
}
