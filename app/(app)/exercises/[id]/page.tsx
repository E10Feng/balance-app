'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import TimerRing from '@/components/TimerRing';
import { EXERCISES, EXERCISE_LEVELS } from '@/lib/seed-exercises';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

type Rating = 'too_easy' | 'just_right' | 'too_hard';

export default function ExercisePlayerPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const level = Number(searchParams.get('level') ?? '1');
  const sessionId = searchParams.get('sessionId') ?? '';

  const exercise = EXERCISES.find((e) => e.id === id);
  const levelData = EXERCISE_LEVELS.find((l) => l.exerciseId === id && l.level === level);
  const duration = levelData?.durationSeconds ?? 30;

  const [animData, setAnimData] = useState<object | null>(null);
  const [remaining, setRemaining] = useState(duration);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [rating, setRating] = useState<Rating>('just_right');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (exercise) {
      fetch(exercise.animationUrl)
        .then((r) => r.json())
        .then(setAnimData)
        .catch(() => setAnimData(null));
    }
  }, [exercise]);

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => setRemaining((r) => r - 1), 1000);
    } else if (running && remaining === 0) {
      setRunning(false);
      setDone(true);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, remaining]);

  async function handleDone() {
    await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exerciseId: id,
        level,
        durationSeconds: duration - remaining,
        userRating: rating,
        sessionId,
      }),
    });
    router.back();
  }

  if (!exercise || !levelData) {
    return <div className="p-8 text-mid text-xl">Exercise not found.</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-bg max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 p-5">
        <button
          onClick={() => router.back()}
          className="w-12 h-12 rounded-full bg-surface flex items-center justify-center flex-shrink-0"
          aria-label="Go back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--dark)" strokeWidth="2.5" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <div className="flex-1 h-1.5 bg-primary-light rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full"
            style={{ width: `${done ? 100 : ((duration - remaining) / duration) * 100}%`, transition: 'width 1s linear' }}
          />
        </div>
        <span className="text-mid text-sm font-medium flex-shrink-0">Level {level}</span>
      </div>

      {/* Animation */}
      <div className="flex-1 flex items-center justify-center p-8">
        {animData ? (
          <Lottie animationData={animData} loop className="w-64 h-64" />
        ) : (
          <div className="w-64 h-64 bg-primary-light rounded-3xl flex items-center justify-center text-8xl">
            🧍
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-6 pb-4">
        <h1 className="font-heading text-3xl font-semibold text-dark leading-tight">{exercise.name}</h1>
        <span className="inline-block mt-2 bg-secondary-light text-secondary text-sm font-semibold px-3 py-1 rounded-full">
          ⭐ Level {level} — {levelData.difficultyNotes}
        </span>
        <p className="text-mid text-lg mt-3 leading-relaxed">{exercise.instruction}</p>
      </div>

      {/* Timer */}
      <div className="flex justify-center py-4">
        <TimerRing total={duration} remaining={remaining} />
      </div>

      {/* Rating (shown after done) */}
      {done && (
        <div className="px-6 pb-4">
          <p className="text-dark text-lg font-medium mb-3">How did that feel?</p>
          <div className="flex gap-3">
            {(['too_easy', 'just_right', 'too_hard'] as Rating[]).map((r) => (
              <button
                key={r}
                onClick={() => setRating(r)}
                className={`flex-1 py-3 rounded-xl text-sm font-medium border-2 transition-all ${rating === r ? 'bg-primary text-white border-primary' : 'border-primary-light text-mid'}`}
              >
                {r === 'too_easy' ? '😊 Easy' : r === 'just_right' ? '✓ Just right' : '😤 Too hard'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 px-6 pb-8">
        {!done ? (
          <>
            <button
              onClick={() => { setRunning(false); setDone(true); setRating('too_hard'); }}
              className="flex-1 py-5 rounded-2xl border-2 border-muted text-mid text-lg font-medium"
            >
              Too hard
            </button>
            <button
              onClick={() => setRunning((r) => !r)}
              className="flex-[2] py-5 rounded-2xl bg-primary text-white text-lg font-semibold"
            >
              {running ? '⏸ Pause' : remaining === duration ? '▶ Start' : '▶ Resume'}
            </button>
          </>
        ) : (
          <button
            onClick={handleDone}
            className="w-full py-5 rounded-2xl bg-secondary text-white text-xl font-semibold"
          >
            ✓ Done — back to plan
          </button>
        )}
      </div>
    </div>
  );
}
