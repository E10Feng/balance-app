'use client';
import { useState } from 'react';
import CountdownTimer from './CountdownTimer';

type SavePayload = { rawData: Record<string, unknown>; score: number; unit: string };

type Props = {
  durationSeconds: number;
  extraFields?: React.ReactNode;
  onSave: (payload: SavePayload) => Promise<void>;
};

export default function RepCountStation({ durationSeconds, extraFields, onSave }: Props) {
  const [reps, setReps] = useState(0);
  const [manualReps, setManualReps] = useState<number | null>(null);
  const [completed, setCompleted] = useState(false);
  const [saving, setSaving] = useState(false);

  const finalScore = manualReps ?? reps;

  async function handleSave() {
    setSaving(true);
    await onSave({ rawData: { countedReps: reps, manualOverride: manualReps }, score: finalScore, unit: 'reps' });
    setSaving(false);
  }

  return (
    <div className="flex flex-col gap-5">
      {extraFields}

      <CountdownTimer durationSeconds={durationSeconds} onComplete={() => setCompleted(true)}>
        {(phase) =>
          phase === 'running' ? (
            <div className="flex flex-col items-center gap-3">
              <p className="font-heading text-5xl font-semibold text-dark">{reps}</p>
              <button
                onClick={() => setReps((r) => r + 1)}
                className="w-20 h-20 rounded-full bg-secondary text-white text-2xl font-bold"
                aria-label="Count one repetition"
              >
                +1
              </button>
            </div>
          ) : null
        }
      </CountdownTimer>

      {completed && (
        <div className="flex flex-col gap-3">
          <label className="text-dark text-lg font-medium">Reps counted: {reps} — adjust if needed</label>
          <input
            type="number"
            min={0}
            value={manualReps ?? reps}
            onChange={(e) => setManualReps(Number(e.target.value))}
            className="border-2 border-primary-light rounded-xl px-4 py-3 text-xl text-dark"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-5 rounded-2xl bg-primary text-white text-xl font-semibold disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save & Continue'}
          </button>
        </div>
      )}
    </div>
  );
}
