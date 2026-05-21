'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import StreakCard from '@/components/StreakCard';
import ExerciseCard from '@/components/ExerciseCard';

type PlanItem = {
  id: string;
  exerciseId: string;
  level: number;
  order: number;
  completed: boolean;
  exercise: { id: string; name: string; category: string; animationUrl: string };
};

type PlanData = {
  plan: PlanItem[];
  sessionId: string | null;
  streak: number;
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function HomePage() {
  const router = useRouter();
  const [data, setData] = useState<PlanData | null>(null);
  const now = new Date();

  useEffect(() => {
    fetch('/api/plan').then((r) => r.json()).then(setData);
  }, []);

  if (!data) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <p className="text-mid text-xl">Loading today&apos;s plan...</p>
      </div>
    );
  }

  const doneCount = data.plan.filter((p) => p.completed).length;
  const firstPending = data.plan.find((p) => !p.completed);
  const allDone = doneCount === data.plan.length;
  const pendingItems = data.plan.filter((p) => !p.completed);
  const lastPendingId = pendingItems[pendingItems.length - 1]?.exerciseId;

  return (
    <div className="p-6 pt-10 flex flex-col gap-6">
      <div>
        <p className="text-mid text-sm font-medium uppercase tracking-widest">
          {DAYS[now.getDay()]}, {MONTHS[now.getMonth()]} {now.getDate()}
        </p>
        <h1 className="font-heading text-4xl font-semibold text-dark mt-1 leading-tight">
          {allDone ? 'Well done!' : now.getHours() < 12 ? 'Good morning,' : now.getHours() < 17 ? 'Good afternoon,' : 'Good evening,'}
        </h1>
      </div>

      <StreakCard streak={data.streak} />

      <div>
        <h2 className="font-heading text-2xl font-medium text-dark mb-4">Today&apos;s exercises</h2>
        <div className="flex flex-col gap-3">
          {data.plan.map((item) => (
            <ExerciseCard
              key={item.id}
              name={item.exercise.name}
              category={item.exercise.category}
              level={item.level}
              durationSeconds={null}
              reps={null}
              completed={item.completed}
              onClick={() => router.push(
                `/exercises/${item.exerciseId}?level=${item.level}&sessionId=${data.sessionId ?? ''}&isLast=${item.exerciseId === lastPendingId}`
              )}
            />
          ))}
        </div>
      </div>

      {!allDone && firstPending && (
        <button
          onClick={() => router.push(
            `/exercises/${firstPending.exerciseId}?level=${firstPending.level}&sessionId=${data.sessionId ?? ''}&isLast=${firstPending.exerciseId === lastPendingId}`
          )}
          className="w-full bg-primary text-white text-xl font-semibold py-5 rounded-2xl"
        >
          ▶ {doneCount === 0 ? 'Start Exercises' : 'Continue Exercises'}
        </button>
      )}

      {allDone && (
        <div className="bg-secondary-light rounded-2xl p-5 text-center">
          <p className="text-2xl mb-2">🎉</p>
          <p className="font-heading text-2xl font-semibold text-dark">All done for today!</p>
          <p className="text-mid mt-1">Come back tomorrow to keep your streak.</p>
        </div>
      )}
    </div>
  );
}
