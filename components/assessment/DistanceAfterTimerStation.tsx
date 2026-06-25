'use client';
import { useState } from 'react';
import CountdownTimer from './CountdownTimer';

type SavePayload = { rawData: Record<string, unknown>; score: number; unit: string };

type Props = {
  durationSeconds: number;
  onSave: (payload: SavePayload) => Promise<void>;
};

export default function DistanceAfterTimerStation({ durationSeconds, onSave }: Props) {
  const [completed, setCompleted] = useState(false);
  const [distanceM, setDistanceM] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (distanceM === null) return;
    setSaving(true);
    await onSave({ rawData: { distanceM }, score: distanceM, unit: 'meters' });
    setSaving(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <CountdownTimer durationSeconds={durationSeconds} goLabel="Go" onComplete={() => setCompleted(true)} />

      {completed && (
        <div className="flex flex-col gap-3">
          <label className="text-dark text-lg font-medium">Distance walked (meters)</label>
          <input
            type="number"
            min={0}
            step={0.1}
            value={distanceM ?? ''}
            onChange={(e) => setDistanceM(e.target.value === '' ? null : Number(e.target.value))}
            className="border-2 border-primary-light rounded-xl px-4 py-3 text-xl text-dark"
          />
          <button
            onClick={handleSave}
            disabled={saving || distanceM === null}
            className="w-full py-5 rounded-2xl bg-primary text-white text-xl font-semibold disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save & Continue'}
          </button>
        </div>
      )}
    </div>
  );
}
