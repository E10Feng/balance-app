'use client';
import { useRouter } from 'next/navigation';
import ExerciseCard from '@/components/ExerciseCard';
import { EXERCISES, EXERCISE_LEVELS } from '@/lib/seed-exercises';

const CATEGORIES = [
  { key: 'warm_up', label: 'Warm-Up' },
  { key: 'lower_body_strength', label: 'Lower Body Strength' },
  { key: 'upper_body_strength', label: 'Upper Body Strength' },
  { key: 'agility_balance', label: 'Agility & Balance' },
  { key: 'lower_body_flexibility', label: 'Lower Body Flexibility' },
  { key: 'upper_body_flexibility', label: 'Upper Body Flexibility' },
  { key: 'aerobic_endurance', label: 'Aerobic Endurance' },
  { key: 'cool_down', label: 'Cool-Down' },
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
                const level1 = EXERCISE_LEVELS.find((l) => l.exerciseId === ex.id && l.level === 1);
                if (!level1) return null;
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
