'use client';
import { useEffect, useRef, useState } from 'react';
import TimerRing from '@/components/TimerRing';

export type TimerPhase = 'ready' | 'countdown' | 'running' | 'done';

type Props = {
  durationSeconds: number;
  goLabel?: string;
  onComplete: (elapsedSeconds: number) => void;
  children?: (phase: TimerPhase, remaining: number) => React.ReactNode;
};

export default function CountdownTimer({ durationSeconds, goLabel = 'Start', onComplete, children }: Props) {
  const [phase, setPhase] = useState<TimerPhase>('ready');
  const [countdown, setCountdown] = useState(3);
  const [remaining, setRemaining] = useState(durationSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown === 0) {
      setPhase('running');
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  useEffect(() => {
    if (phase === 'running' && remaining > 0) {
      intervalRef.current = setInterval(() => setRemaining((r) => r - 1), 1000);
    } else if (phase === 'running' && remaining === 0) {
      setPhase('done');
      onComplete(durationSeconds);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase, remaining, durationSeconds, onComplete]);

  function handleStart() {
    setPhase('countdown');
    setCountdown(3);
  }

  function handleStop() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPhase('done');
    onComplete(durationSeconds - remaining);
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {phase === 'ready' && (
        <button
          onClick={handleStart}
          className="w-full py-5 rounded-2xl bg-primary text-white text-xl font-semibold"
        >
          Get Ready
        </button>
      )}

      {phase === 'countdown' && (
        <div className="font-heading text-6xl font-semibold text-primary py-8">
          {countdown > 0 ? countdown : goLabel}
        </div>
      )}

      {(phase === 'running' || phase === 'done') && (
        <>
          <TimerRing total={durationSeconds} remaining={remaining} />
          <div className="w-full h-2 bg-primary-light rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{
                width: `${((durationSeconds - remaining) / durationSeconds) * 100}%`,
                transition: 'width 1s linear',
              }}
            />
          </div>
        </>
      )}

      {children?.(phase, remaining)}

      {phase === 'running' && (
        <button
          onClick={handleStop}
          className="w-full py-5 rounded-2xl border-2 border-muted text-mid text-lg font-medium"
        >
          Stop
        </button>
      )}

      {phase === 'done' && (
        <p className="font-heading text-2xl font-semibold text-secondary">Test Complete</p>
      )}
    </div>
  );
}
