'use client';
import { useEffect, useRef, useState } from 'react';

type SavePayload = { rawData: Record<string, unknown>; score: number; unit: string };

function Stopwatch({ label, onFinish }: { label: string; onFinish: (seconds: number) => void }) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const startRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      startRef.current = Date.now() - elapsed * 1000;
      intervalRef.current = setInterval(() => {
        setElapsed((Date.now() - (startRef.current ?? Date.now())) / 1000);
      }, 100);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  function handleStartStop() {
    if (!running && !done) {
      setRunning(true);
    } else if (running) {
      setRunning(false);
      setDone(true);
      onFinish(Math.round(elapsed * 10) / 10);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2 flex-1">
      <p className="text-dark text-lg font-medium">{label}</p>
      <p className="font-heading text-4xl font-semibold text-dark">{elapsed.toFixed(1)}s</p>
      <button
        onClick={handleStartStop}
        disabled={done}
        className={`w-full py-4 rounded-xl text-lg font-semibold ${
          done ? 'bg-primary-light text-mid' : running ? 'bg-secondary text-white' : 'bg-primary text-white'
        }`}
      >
        {done ? 'Done' : running ? 'Stop' : 'Start'}
      </button>
    </div>
  );
}

export default function TwoTrialStopwatchStation({ onSave }: { onSave: (payload: SavePayload) => Promise<void> }) {
  const [trial1, setTrial1] = useState<number | null>(null);
  const [trial2, setTrial2] = useState<number | null>(null);
  const [manualOverride, setManualOverride] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const best = trial1 !== null && trial2 !== null ? Math.min(trial1, trial2) : trial1 ?? trial2;
  const finalScore = manualOverride ?? best;

  async function handleSave() {
    if (finalScore === null) return;
    setSaving(true);
    await onSave({ rawData: { trial1, trial2, manualOverride }, score: finalScore, unit: 'seconds' });
    setSaving(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-4">
        <Stopwatch label="Trial 1" onFinish={setTrial1} />
        <Stopwatch label="Trial 2" onFinish={setTrial2} />
      </div>

      {best !== null && (
        <div className="flex flex-col gap-3">
          <label className="text-dark text-lg font-medium">Best time: {best.toFixed(1)}s — adjust if needed</label>
          <input
            type="number"
            step={0.1}
            min={0}
            value={manualOverride ?? best}
            onChange={(e) => setManualOverride(Number(e.target.value))}
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
