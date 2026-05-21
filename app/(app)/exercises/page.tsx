'use client';
import { useRouter } from 'next/navigation';
import ExerciseCard from '@/components/ExerciseCard';
import { EXERCISES, EXERCISE_LEVELS } from '@/lib/seed-exercises';

const CATEGORIES = [
  { key: 'static_balance', label: 'Static Balance' },
  { key: 'dynamic_balance', label: 'Dynamic Balance' },
  { key: 'strength_support', label: 'Strength Support' },
];

export default function ExercisesPage() {
  const router = useRouter();

  return (
    <div className="p-6 pt-10 pb-8">
      <p className="text-mid text-sm font-medium uppercase tracking-widest">All exercises</p>
      <h1 className="font-heading text-4xl font-semibold text-dark mt-1 mb-6">Library</h1>

      {CATEGORIES.map(({ key, label }) => {
        const group = EXERCISES.filter((e) => e.category === key);
        if (!group.length) return null;
        return (
          <div key={key} className="mb-8">
            <h2 className="font-heading text-xl text-dark mb-3">{label}</h2>
            <div className="flex flex-col gap-3">
              {group.map((ex) => {
                const level1 = EXERCISE_LEVELS.find((l) => l.exerciseId === ex.id && l.level === 1)!;
                return (
                  <ExerciseCard
                    key={ex.id}
                    name={ex.name}
                    category={ex.category}
                    level={1}
                    durationSeconds={level1.durationSeconds}
                    reps={level1.reps}
                    completed={false}
                    onClick={() => router.push(`/exercises/${ex.id}?level=1&sessionId=`)}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
