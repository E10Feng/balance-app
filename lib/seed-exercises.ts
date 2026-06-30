import type { ExerciseCategory } from './schema';

type SeedExercise = {
  id: string;
  name: string;
  category: ExerciseCategory;
  usesReps: boolean;
  description: string;
  instruction: string;
  animationUrl: string;
};

type SeedLevel = {
  exerciseId: string;
  level: number;
  durationSeconds: number | null;
  reps: number | null;
  difficultyNotes: string;
};

export const EXERCISES: SeedExercise[] = [
  {
    id: 'two-foot-stance',
    name: 'Two-Foot Stance',
    category: 'agility_balance',
    usesReps: false,
    description: 'Stand with feet shoulder-width apart.',
    instruction: 'Stand tall with feet shoulder-width apart. Hold steady. Use a wall or sturdy chair nearby for safety.',
    animationUrl: '/animations/exercises/two-foot-stance.json',
  },
  {
    id: 'tandem-stance',
    name: 'Tandem Stance',
    category: 'agility_balance',
    usesReps: false,
    description: 'Stand with one foot directly in front of the other.',
    instruction: 'Place one foot directly in front of the other, heel touching toe. Hold steady. Reach out to the wall if needed.',
    animationUrl: '/animations/exercises/tandem-stance.json',
  },
  {
    id: 'single-leg-stand',
    name: 'Single-Leg Stand',
    category: 'agility_balance',
    usesReps: false,
    description: 'Balance on one foot.',
    instruction: 'Lift one foot slightly off the ground. Keep your standing leg slightly bent. Hold a chair or wall nearby.',
    animationUrl: '/animations/exercises/single-leg-stand.json',
  },
  {
    id: 'heel-to-toe-walk',
    name: 'Heel-to-Toe Walk',
    category: 'agility_balance',
    usesReps: true,
    description: 'Walk in a straight line, heel touching toe with each step.',
    instruction: 'Walk slowly placing the heel of your front foot directly against the toes of your back foot. Take 10 steps forward.',
    animationUrl: '/animations/exercises/heel-to-toe-walk.json',
  },
  {
    id: 'weight-shifts',
    name: 'Weight Shifts',
    category: 'agility_balance',
    usesReps: true,
    description: 'Shift your weight slowly from one foot to the other.',
    instruction: 'Stand with feet shoulder-width apart. Slowly shift your weight to the right foot, then to the left. Use a chair for support.',
    animationUrl: '/animations/exercises/weight-shifts.json',
  },
  {
    id: 'sit-to-stand',
    name: 'Sit to Stand',
    category: 'lower_body_strength',
    usesReps: false,
    description: 'Rise from a chair without using your hands.',
    instruction: 'Sit at the edge of a sturdy chair. Cross your arms over your chest. Slowly stand up, then sit back down in a controlled way.',
    animationUrl: '/animations/exercises/sit-to-stand.json',
  },
  {
    id: 'calf-raises',
    name: 'Calf Raises',
    category: 'lower_body_strength',
    usesReps: false,
    description: 'Rise up onto your toes to strengthen lower legs.',
    instruction: 'Stand behind a sturdy chair. Hold the back lightly for balance. Slowly rise up on your toes, then lower back down.',
    animationUrl: '/animations/exercises/calf-raises.json',
  },
];

export const EXERCISE_LEVELS: SeedLevel[] = EXERCISES.flatMap((ex) => [
  { exerciseId: ex.id, level: 1, durationSeconds: !ex.usesReps ? 15 : null, reps: ex.usesReps ? 5 : null, difficultyNotes: 'Eyes open, wall or chair support allowed.' },
  { exerciseId: ex.id, level: 2, durationSeconds: !ex.usesReps ? 20 : null, reps: ex.usesReps ? 8 : null, difficultyNotes: 'Eyes open, fingertip support only.' },
  { exerciseId: ex.id, level: 3, durationSeconds: !ex.usesReps ? 30 : null, reps: ex.usesReps ? 10 : null, difficultyNotes: 'Eyes open, no support.' },
  { exerciseId: ex.id, level: 4, durationSeconds: !ex.usesReps ? 30 : null, reps: ex.usesReps ? 10 : null, difficultyNotes: 'Eyes closed, or gentle head turns.' },
  { exerciseId: ex.id, level: 5, durationSeconds: !ex.usesReps ? 45 : null, reps: ex.usesReps ? 15 : null, difficultyNotes: 'Eyes closed, on a foam pad or uneven surface.' },
]);
