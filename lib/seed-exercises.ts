import type { ExerciseCategory } from './schema';

type SeedExercise = {
  id: string;
  name: string;
  category: ExerciseCategory;
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
  // ── Lower Body Strength ──────────────────────────────────────
  {
    id: 'sit-to-stand',
    name: 'Sit to Stand',
    category: 'lower_body_strength',
    description: 'Rise from a chair without using your hands to strengthen your legs.',
    instruction: 'Sit at the edge of a sturdy chair with feet shoulder-width apart. Cross your arms over your chest. Lean slightly forward and push through your heels to stand fully upright. Lower back down slowly and with control.',
    animationUrl: '/animations/exercises/sit-to-stand.json',
  },
  {
    id: 'calf-raises',
    name: 'Calf Raises',
    category: 'lower_body_strength',
    description: 'Rise onto your toes to strengthen your lower legs and improve ankle stability.',
    instruction: 'Stand behind a sturdy chair and hold the back lightly for balance. Rise slowly onto the balls of your feet, pause at the top, then lower back down with control. Keep your knees straight throughout.',
    animationUrl: '/animations/exercises/calf-raises.json',
  },
  {
    id: 'squats',
    name: 'Squats',
    category: 'lower_body_strength',
    description: 'Bend your knees and hips as if sitting down to build lower-body strength.',
    instruction: 'Stand with feet shoulder-width apart, holding a chair back for support if needed. Push your hips back and bend your knees, lowering as if sitting into a chair. Keep your chest upright and knees behind your toes. Press through your heels to stand back up.',
    animationUrl: '/animations/exercises/squats.json',
  },
  {
    id: 'stationary-lunges',
    name: 'Stationary Lunges',
    category: 'lower_body_strength',
    description: 'Step one foot forward and lower your body to strengthen your thighs and glutes.',
    instruction: 'Stand tall near a wall or chair for support. Step one foot about 60 cm forward. Lower your back knee toward the floor, keeping your front knee above your ankle. Push back up and repeat on the same side before switching legs.',
    animationUrl: '/animations/exercises/stationary-lunges.json',
  },
  {
    id: 'standing-hip-extensions',
    name: 'Standing Hip Extensions',
    category: 'lower_body_strength',
    description: 'Kick your leg backward while standing to strengthen your hips and glutes.',
    instruction: 'Hold a sturdy chair or wall with both hands. Stand on one leg with a slight bend in the knee. Slowly kick the other leg straight back, squeezing your glute at the top. Hold briefly, then return. Keep your back straight throughout.',
    animationUrl: '/animations/exercises/standing-hip-extensions.json',
  },
  {
    id: 'bridges',
    name: 'Bridges',
    category: 'lower_body_strength',
    description: 'Lie on your back and lift your hips to strengthen your glutes and lower back.',
    instruction: 'Lie on your back with knees bent, feet flat on the floor, hip-width apart. Place your arms at your sides. Press through your heels and lift your hips until your body forms a straight line from knees to shoulders. Hold briefly at the top, then lower slowly.',
    animationUrl: '/animations/exercises/bridges.json',
  },

  // ── Upper Body Strength ──────────────────────────────────────
  {
    id: 'wall-push-ups',
    name: 'Wall Push-Ups',
    category: 'upper_body_strength',
    description: 'Push away from a wall to build chest, shoulder, and arm strength safely.',
    instruction: 'Stand an arm\'s length from a wall. Place your palms flat on the wall at shoulder height and width. Bend your elbows and lean toward the wall, then push back to the start. Keep your body in a straight line from head to heels.',
    animationUrl: '/animations/exercises/wall-push-ups.json',
  },
  {
    id: 'bicep-curls',
    name: 'Bicep Curls',
    category: 'upper_body_strength',
    description: 'Curl a light weight or water bottle up to strengthen your upper arms.',
    instruction: 'Sit or stand holding a light weight (0.5–1 kg) in each hand, palms facing forward and arms at your sides. Keeping your upper arms still against your body, bend your elbows and raise the weights to shoulder height. Lower slowly back down.',
    animationUrl: '/animations/exercises/bicep-curls.json',
  },
  {
    id: 'seated-rows',
    name: 'Seated Rows',
    category: 'upper_body_strength',
    description: 'Pull a resistance band or towel toward you while seated to strengthen your upper back.',
    instruction: 'Sit tall in a chair. Loop a resistance band or hold the ends of a towel around a door knob or table leg in front of you. With elbows bent slightly, pull your hands toward your sides, squeezing your shoulder blades together. Hold briefly, then release slowly.',
    animationUrl: '/animations/exercises/seated-rows.json',
  },

  // ── Agility / Balance ────────────────────────────────────────
  {
    id: 'two-foot-stance',
    name: 'Two-Foot Stance',
    category: 'agility_balance',
    description: 'Stand with feet shoulder-width apart to practise steady standing balance.',
    instruction: 'Stand tall with feet shoulder-width apart. Hold a wall or sturdy chair nearby for safety. Relax your shoulders, look straight ahead, and hold steady for the full time.',
    animationUrl: '/animations/exercises/two-foot-stance.json',
  },
  {
    id: 'tandem-stance',
    name: 'Tandem Stance',
    category: 'agility_balance',
    description: 'Stand with one foot directly in front of the other to challenge balance.',
    instruction: 'Place one foot directly in front of the other so the heel of the front foot touches the toes of the back foot. Hold a wall or chair if needed. Look straight ahead and hold steady. Switch feet and repeat.',
    animationUrl: '/animations/exercises/tandem-stance.json',
  },
  {
    id: 'single-leg-stand',
    name: 'Single-Leg Stand',
    category: 'agility_balance',
    description: 'Balance on one foot to build ankle stability and core control.',
    instruction: 'Stand behind a sturdy chair. Lift one foot slightly off the ground and hold your balance. Keep a slight bend in the standing knee. Use the chair only if you start to lose balance. Switch feet after the hold.',
    animationUrl: '/animations/exercises/single-leg-stand.json',
  },
  {
    id: 'heel-to-toe-walk',
    name: 'Heel-to-Toe Walk',
    category: 'agility_balance',
    description: 'Walk in a straight line placing each heel directly in front of the opposite toes.',
    instruction: 'Walk slowly along a straight line on the floor, placing the heel of each front foot against the toes of the back foot with each step. Keep your arms slightly out to help balance. Take 10 steps forward, then turn carefully and return.',
    animationUrl: '/animations/exercises/heel-to-toe-walk.json',
  },
  {
    id: 'weight-shifts',
    name: 'Weight Shifts',
    category: 'agility_balance',
    description: 'Slowly shift your weight from side to side to improve dynamic balance.',
    instruction: 'Stand with feet shoulder-width apart, holding a chair back lightly. Slowly shift your weight to your right foot, lifting the left foot slightly. Hold briefly, then shift to your left foot. Move slowly and with control.',
    animationUrl: '/animations/exercises/weight-shifts.json',
  },
  {
    id: 'clock-reach',
    name: 'Clock Reach',
    category: 'agility_balance',
    description: 'Balance on one leg and reach your free foot to positions around an imaginary clock face.',
    instruction: 'Stand on your right foot near a wall for safety. Imagine a clock on the floor around you. Reach your left foot to the 12 o\'clock position in front, then 9 o\'clock to the side, then 6 o\'clock behind — without touching the floor between reaches. Switch feet.',
    animationUrl: '/animations/exercises/clock-reach.json',
  },
  {
    id: 'side-stepping',
    name: 'Side Stepping',
    category: 'agility_balance',
    description: 'Step sideways along a line to build lateral stability and agility.',
    instruction: 'Stand at one end of a clear space of about 3 metres. Step sideways to the right, bringing your left foot to meet your right. Keep your feet from crossing. At the end, step back in the opposite direction. Maintain an upright posture throughout.',
    animationUrl: '/animations/exercises/side-stepping.json',
  },

  // ── Aerobic Endurance ────────────────────────────────────────
  {
    id: 'marching-in-place',
    name: 'Marching in Place',
    category: 'aerobic_endurance',
    description: 'Lift your knees alternately while standing to raise your heart rate safely.',
    instruction: 'Stand behind a chair and hold the back lightly if needed. Lift your right knee to hip height, lower it, then lift your left knee. March at a comfortable, steady pace. Swing your arms naturally if you feel stable.',
    animationUrl: '/animations/exercises/marching-in-place.json',
  },
  {
    id: 'walking-program',
    name: 'Walking Program',
    category: 'aerobic_endurance',
    description: 'Walk at a brisk but comfortable pace to build aerobic endurance.',
    instruction: 'Choose a safe, flat route indoors or outdoors. Walk at a pace where you can speak short sentences but still feel some effort. Rest if needed. Start at the low end of your time goal and gradually increase as you feel stronger.',
    animationUrl: '/animations/exercises/walking-program.json',
  },
  {
    id: 'step-ups',
    name: 'Step-Ups',
    category: 'aerobic_endurance',
    description: 'Step onto a low, stable step and back down to build lower-body endurance.',
    instruction: 'Stand in front of a low step (10–15 cm) with a handrail or wall nearby. Step up with your right foot, bring your left foot up, then step down right then left. Alternate the leading foot each time. Move at a steady, controlled pace.',
    animationUrl: '/animations/exercises/step-ups.json',
  },
  {
    id: 'seated-cardio-marches',
    name: 'Seated Cardio Marches',
    category: 'aerobic_endurance',
    description: 'March your legs while seated in a chair to boost circulation without standing.',
    instruction: 'Sit upright in a sturdy chair with feet flat on the floor. Lift your right knee toward your chest, lower it, then lift your left knee. Build a steady rhythm. Pump your arms to increase the effort. Rest briefly if needed, then continue.',
    animationUrl: '/animations/exercises/seated-cardio-marches.json',
  },
  {
    id: 'low-impact-cardio-circuit',
    name: 'Low-Impact Cardio Circuit',
    category: 'aerobic_endurance',
    description: 'Cycle through three simple movements to keep your heart rate elevated without impact.',
    instruction: 'Cycle through these three movements, spending equal time on each: (1) Marching in place, (2) Side-stepping left and right, (3) Seated cardio marches. Move at a comfortable pace and rest whenever needed. Each cycle takes about 1 minute.',
    animationUrl: '/animations/exercises/low-impact-cardio-circuit.json',
  },

  // ── Lower Body Flexibility ───────────────────────────────────
  {
    id: 'chair-sit-reach-stretch',
    name: 'Chair Sit and Reach Stretch',
    category: 'lower_body_flexibility',
    description: 'Reach toward your toes while seated to stretch your hamstrings.',
    instruction: 'Sit on the edge of a chair. Extend one leg straight in front with your heel on the floor and toes pointing up. Place one hand on top of the other. Breathe in, then breathe out as you lean forward slowly, reaching toward your toes. Hold the stretch — do not bounce. Keep your back straight.',
    animationUrl: '/animations/exercises/chair-sit-reach-stretch.json',
  },
  {
    id: 'hamstring-stretch',
    name: 'Hamstring Stretch',
    category: 'lower_body_flexibility',
    description: 'Stretch the back of your thigh while standing to improve lower-body flexibility.',
    instruction: 'Stand near a wall or chair for support. Step one foot forward and place your heel on the floor with your toes pointing up. Keep the front leg straight and your back upright. Gently bend your back knee and lean your hips forward until you feel a stretch along the back of your front thigh. Hold still.',
    animationUrl: '/animations/exercises/hamstring-stretch.json',
  },
  {
    id: 'calf-stretch',
    name: 'Calf Stretch',
    category: 'lower_body_flexibility',
    description: 'Stretch your calf muscles against a wall to reduce tightness and improve ankle flexibility.',
    instruction: 'Stand facing a wall with your hands flat against it at shoulder height. Step one foot back about 60 cm, keeping that heel on the floor and toes pointing forward. Bend your front knee slightly while keeping the back leg straight. Lean toward the wall until you feel a stretch in the back calf. Hold.',
    animationUrl: '/animations/exercises/calf-stretch.json',
  },

  // ── Upper Body Flexibility ───────────────────────────────────
  {
    id: 'chest-stretch',
    name: 'Chest Stretch',
    category: 'upper_body_flexibility',
    description: 'Open your arms wide to stretch the chest and improve upper-body posture.',
    instruction: 'Sit or stand tall. Bring both arms out to your sides at shoulder height. Slowly draw your arms back, squeezing your shoulder blades together and opening your chest toward the ceiling. Hold the stretch, breathing normally. Release slowly.',
    animationUrl: '/animations/exercises/chest-stretch.json',
  },
  {
    id: 'shoulder-stretch',
    name: 'Shoulder Stretch',
    category: 'upper_body_flexibility',
    description: 'Pull one arm across your chest to stretch the back of your shoulder.',
    instruction: 'Sit or stand tall. Bring your right arm straight across your chest at shoulder height. Use your left hand to gently pull your right arm closer to your chest until you feel a stretch in the back of your right shoulder. Keep your right shoulder down. Hold, then switch arms.',
    animationUrl: '/animations/exercises/shoulder-stretch.json',
  },
  {
    id: 'back-scratch-stretch',
    name: 'Back Scratch Stretch',
    category: 'upper_body_flexibility',
    description: 'Reach one hand over your shoulder and down your back to stretch the triceps and shoulder.',
    instruction: 'Sit or stand tall. Raise your right arm and bend it at the elbow, reaching your right hand down toward your upper back. Use your left hand to gently press the right elbow down for a deeper stretch. Hold without forcing. Switch arms.',
    animationUrl: '/animations/exercises/back-scratch-stretch.json',
  },
  {
    id: 'trunk-rotation-stretch',
    name: 'Trunk Rotation Stretch',
    category: 'upper_body_flexibility',
    description: 'Gently twist your upper body while seated to improve spinal flexibility.',
    instruction: 'Sit upright in a chair with feet flat on the floor. Cross your arms over your chest. Slowly rotate your upper body to the right as far as is comfortable, looking over your right shoulder. Hold, then return to centre. Repeat on the left. Move gently — do not jerk.',
    animationUrl: '/animations/exercises/trunk-rotation-stretch.json',
  },

  // ── Warm-Up ──────────────────────────────────────────────────
  {
    id: 'gentle-marching-warmup',
    name: 'Gentle Marching',
    category: 'warm_up',
    description: 'March slowly in place to warm up your muscles and increase circulation before exercise.',
    instruction: 'Stand behind a chair and hold the back lightly. Begin slowly lifting alternate knees, no higher than hip height. Swing your arms gently. Breathe steadily. Gradually increase your pace over the first 30 seconds until you feel your body warming up.',
    animationUrl: '/animations/exercises/gentle-marching-warmup.json',
  },
  {
    id: 'arm-circles',
    name: 'Arm Circles',
    category: 'warm_up',
    description: 'Roll your shoulders and circle your arms to warm up your shoulder joints.',
    instruction: 'Stand or sit tall. Extend both arms out to your sides at shoulder height. Draw small circles forward, gradually making the circles larger. After half the time, reverse direction. Keep your movements smooth and controlled. Then let your arms rest and roll your shoulders gently backward.',
    animationUrl: '/animations/exercises/arm-circles.json',
  },
  {
    id: 'ankle-wrist-rolls',
    name: 'Ankle and Wrist Rolls',
    category: 'warm_up',
    description: 'Gently rotate your ankles and wrists to mobilise the small joints before exercise.',
    instruction: 'Sit in a chair. Lift your right foot off the floor and slowly draw circles with your toes — 5 circles clockwise, then 5 counterclockwise. Switch feet. Then extend both arms in front of you and rotate your wrists — 5 circles each direction. Breathe normally throughout.',
    animationUrl: '/animations/exercises/ankle-wrist-rolls.json',
  },

  // ── Cool-Down ─────────────────────────────────────────────────
  {
    id: 'seated-deep-breathing',
    name: 'Seated Deep Breathing',
    category: 'cool_down',
    description: 'Slow, controlled breathing to lower your heart rate and calm the body after exercise.',
    instruction: 'Sit comfortably with your back supported. Place one hand on your chest and one on your belly. Breathe in through your nose for 4 counts, feeling your belly rise. Hold gently for 2 counts. Breathe out through your mouth for 6 counts. Repeat throughout the session.',
    animationUrl: '/animations/exercises/seated-deep-breathing.json',
  },
  {
    id: 'gentle-full-body-stretch',
    name: 'Gentle Full-Body Stretch',
    category: 'cool_down',
    description: 'Reach your arms overhead and lengthen your whole body to ease tension after exercise.',
    instruction: 'Sit tall in a chair with feet flat on the floor. Interlace your fingers and turn palms outward. Raise your arms overhead, straightening your elbows and lengthening your spine. Hold the stretch while breathing slowly. Lower your arms, then gently roll your neck from side to side.',
    animationUrl: '/animations/exercises/gentle-full-body-stretch.json',
  },
  {
    id: 'slow-marching-cooldown',
    name: 'Slow Marching Cool-Down',
    category: 'cool_down',
    description: 'March at a very slow pace to gradually bring your heart rate down after exercise.',
    instruction: 'Stand behind a chair and hold the back lightly. March very slowly — even slower than a warm-up pace. Let your breathing settle. After about a minute, slow to a gentle sway from foot to foot. Focus on lengthening each breath out.',
    animationUrl: '/animations/exercises/slow-marching-cooldown.json',
  },
];

// ── Exercise levels (3 per exercise) ─────────────────────────
const strengthLevels = (id: string): SeedLevel[] => [
  { exerciseId: id, level: 1, durationSeconds: null, reps: 8,  difficultyNotes: '1–2 sets. Use a chair for support. Rest 60 s between sets.' },
  { exerciseId: id, level: 2, durationSeconds: null, reps: 10, difficultyNotes: '2–3 sets. Light support only if needed. Rest 45 s between sets.' },
  { exerciseId: id, level: 3, durationSeconds: null, reps: 12, difficultyNotes: '3 sets. No support. Slow the lowering phase (3 counts down). Rest 30 s between sets.' },
];

const balanceLevels = (id: string): SeedLevel[] => [
  { exerciseId: id, level: 1, durationSeconds: 15, reps: null, difficultyNotes: 'Chair or wall support allowed. Eyes open.' },
  { exerciseId: id, level: 2, durationSeconds: 25, reps: null, difficultyNotes: 'Fingertip support only. Eyes open.' },
  { exerciseId: id, level: 3, durationSeconds: 45, reps: null, difficultyNotes: 'No support. Try gentle head turns.' },
];

const flexLevels = (id: string): SeedLevel[] => [
  { exerciseId: id, level: 1, durationSeconds: 15, reps: null, difficultyNotes: 'Hold gently — no bouncing. Breathe out into the stretch.' },
  { exerciseId: id, level: 2, durationSeconds: 20, reps: null, difficultyNotes: 'Deepen the stretch slightly with each breath out.' },
  { exerciseId: id, level: 3, durationSeconds: 30, reps: null, difficultyNotes: 'Hold at the limit of your comfortable range. Breathe slowly.' },
];

const cardioLevels = (id: string): SeedLevel[] => [
  { exerciseId: id, level: 1, durationSeconds: 420,  reps: null, difficultyNotes: '7 minutes. Rest whenever needed. Aim to talk in short sentences.' },
  { exerciseId: id, level: 2, durationSeconds: 900,  reps: null, difficultyNotes: '15 minutes. Rest only if necessary. Maintain a steady pace.' },
  { exerciseId: id, level: 3, durationSeconds: 1500, reps: null, difficultyNotes: '25 minutes. Minimal rest. Challenge yourself to keep moving.' },
];

const warmCoolLevels = (id: string): SeedLevel[] => [
  { exerciseId: id, level: 1, durationSeconds: 120, reps: null, difficultyNotes: '2 minutes. Very easy pace to prepare the body.' },
  { exerciseId: id, level: 2, durationSeconds: 180, reps: null, difficultyNotes: '3 minutes. Comfortable pace.' },
  { exerciseId: id, level: 3, durationSeconds: 240, reps: null, difficultyNotes: '4 minutes. Thorough preparation or wind-down.' },
];

export const EXERCISE_LEVELS: SeedLevel[] = [
  // lower_body_strength
  ...strengthLevels('sit-to-stand'),
  ...strengthLevels('calf-raises'),
  ...strengthLevels('squats'),
  ...strengthLevels('stationary-lunges'),
  ...strengthLevels('standing-hip-extensions'),
  ...strengthLevels('bridges'),
  // upper_body_strength
  ...strengthLevels('wall-push-ups'),
  ...strengthLevels('bicep-curls'),
  ...strengthLevels('seated-rows'),
  // agility_balance
  ...balanceLevels('two-foot-stance'),
  ...balanceLevels('tandem-stance'),
  ...balanceLevels('single-leg-stand'),
  ...balanceLevels('heel-to-toe-walk'),
  ...balanceLevels('weight-shifts'),
  ...balanceLevels('clock-reach'),
  ...balanceLevels('side-stepping'),
  // aerobic_endurance
  ...cardioLevels('marching-in-place'),
  ...cardioLevels('walking-program'),
  ...cardioLevels('step-ups'),
  ...cardioLevels('seated-cardio-marches'),
  ...cardioLevels('low-impact-cardio-circuit'),
  // lower_body_flexibility
  ...flexLevels('chair-sit-reach-stretch'),
  ...flexLevels('hamstring-stretch'),
  ...flexLevels('calf-stretch'),
  // upper_body_flexibility
  ...flexLevels('chest-stretch'),
  ...flexLevels('shoulder-stretch'),
  ...flexLevels('back-scratch-stretch'),
  ...flexLevels('trunk-rotation-stretch'),
  // warm_up
  ...warmCoolLevels('gentle-marching-warmup'),
  ...warmCoolLevels('arm-circles'),
  ...warmCoolLevels('ankle-wrist-rolls'),
  // cool_down
  ...warmCoolLevels('seated-deep-breathing'),
  ...warmCoolLevels('gentle-full-body-stretch'),
  ...warmCoolLevels('slow-marching-cooldown'),
];
