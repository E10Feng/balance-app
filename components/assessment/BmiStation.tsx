'use client';
import { useState } from 'react';

type Props = {
  onSave: (payload: { heightCm: number; weightKg: number }) => Promise<void>;
};

export default function BmiStation({ onSave }: Props) {
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (heightCm === null || weightKg === null) return;
    setSaving(true);
    await onSave({ heightCm, weightKg });
    setSaving(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <label className="text-dark text-lg font-medium">Height (cm)</label>
        <input
          type="number"
          step={0.1}
          value={heightCm ?? ''}
          onChange={(e) => setHeightCm(e.target.value === '' ? null : Number(e.target.value))}
          className="border-2 border-primary-light rounded-xl px-4 py-3 text-xl text-dark"
        />
        <label className="text-dark text-lg font-medium">Weight (kg)</label>
        <input
          type="number"
          step={0.1}
          value={weightKg ?? ''}
          onChange={(e) => setWeightKg(e.target.value === '' ? null : Number(e.target.value))}
          className="border-2 border-primary-light rounded-xl px-4 py-3 text-xl text-dark"
        />
      </div>
      <button
        onClick={handleSave}
        disabled={saving || heightCm === null || weightKg === null}
        className="w-full py-5 rounded-2xl bg-primary text-white text-xl font-semibold disabled:opacity-60"
      >
        {saving ? 'Saving...' : 'Save & Continue'}
      </button>
    </div>
  );
}
