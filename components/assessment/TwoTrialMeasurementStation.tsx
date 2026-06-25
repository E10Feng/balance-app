'use client';
import { useState } from 'react';

type SavePayload = { rawData: Record<string, unknown>; score: number; unit: string };

type Props = {
  higherIsBetter: boolean;
  onSave: (payload: SavePayload) => Promise<void>;
};

export default function TwoTrialMeasurementStation({ higherIsBetter, onSave }: Props) {
  const [trial1, setTrial1] = useState<number | null>(null);
  const [trial2, setTrial2] = useState<number | null>(null);
  const [manualOverride, setManualOverride] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const best =
    trial1 !== null && trial2 !== null
      ? higherIsBetter
        ? Math.max(trial1, trial2)
        : Math.min(trial1, trial2)
      : trial1 ?? trial2;
  const finalScore = manualOverride ?? best;

  async function handleSave() {
    if (finalScore === null) return;
    setSaving(true);
    await onSave({ rawData: { trial1, trial2, manualOverride }, score: finalScore, unit: 'cm' });
    setSaving(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <label className="text-dark text-lg font-medium">Trial 1 (cm)</label>
        <input
          type="number"
          step={0.5}
          value={trial1 ?? ''}
          onChange={(e) => setTrial1(e.target.value === '' ? null : Number(e.target.value))}
          className="border-2 border-primary-light rounded-xl px-4 py-3 text-xl text-dark"
        />
        <label className="text-dark text-lg font-medium">Trial 2 (cm)</label>
        <input
          type="number"
          step={0.5}
          value={trial2 ?? ''}
          onChange={(e) => setTrial2(e.target.value === '' ? null : Number(e.target.value))}
          className="border-2 border-primary-light rounded-xl px-4 py-3 text-xl text-dark"
        />
      </div>

      {best !== null && (
        <div className="flex flex-col gap-3">
          <label className="text-dark text-lg font-medium">Best score: {best} cm — adjust if needed</label>
          <input
            type="number"
            step={0.5}
            value={manualOverride ?? best}
            onChange={(e) => setManualOverride(e.target.value === '' ? null : Number(e.target.value))}
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
