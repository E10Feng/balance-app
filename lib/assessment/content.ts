// UI routing key for the 7 dashboard station slots — distinct from the `AssessmentStation`
// DB enum in `lib/schema.ts`. `height_weight` has no DB station-result counterpart; it writes
// directly to `assessment_session`'s BMI fields rather than an `assessment_station_result` row.
// `walk_step` is a single UI slot that fans out to one of two DB stations (`walk_test` or
// `step_test`) depending on the session's `walkTestVariant`.
export type StationRouteKey =
  | 'chair_stand' | 'arm_curl' | 'height_weight'
  | 'sit_reach' | 'back_scratch' | 'up_and_go' | 'walk_step';

export type StationContent = {
  key: StationRouteKey;
  stationNumber: number;
  title: string;
  purpose: string;
  equipment: string[];
  procedure: string;
  safetyNotes: string[];
};

const GENERIC_STOP_CONDITION =
  'Stop immediately if you experience pain, dizziness, shortness of breath, or discomfort.';

export const STATION_CONTENT: StationContent[] = [
  {
    key: 'chair_stand',
    stationNumber: 1,
    title: 'Chair Stand Test',
    purpose: 'Measure lower-body strength.',
    equipment: ['Straight-back chair, 17 inches', 'Stopwatch or built-in timer'],
    procedure:
      'Participant sits in the middle of the chair, feet shoulder-width apart, feet flat on the floor. ' +
      'Arms are crossed at the wrists and held close to the chest. On "Go," participant stands completely ' +
      'up and sits completely down as many times as possible in 30 seconds.',
    safetyNotes: [GENERIC_STOP_CONDITION],
  },
  {
    key: 'arm_curl',
    stationNumber: 2,
    title: 'Arm Curl Test',
    purpose: 'Measure upper-body strength.',
    equipment: ['Chair without armrests', '5 lb weight for women', '8 lb weight for men', 'Stopwatch or built-in timer'],
    procedure:
      'Participant sits in a chair and uses the dominant or stronger arm. They hold the weight using a ' +
      'suitcase grip with palm facing the body. The arm starts straight down beside the chair. The upper ' +
      'arm stays stable against the body. The participant curls the arm through full range of motion, ' +
      'turning the palm up, then lowers the arm back to the starting position.',
    safetyNotes: ['The upper arm must stay stable and should not swing.', GENERIC_STOP_CONDITION],
  },
  {
    key: 'height_weight',
    stationNumber: 3,
    title: 'Height and Weight (BMI)',
    purpose: 'Assess Body Mass Index.',
    equipment: ['Scale', 'Tape measure or stadiometer'],
    procedure: 'Measure height and weight using a stable scale and tape measure.',
    safetyNotes: [GENERIC_STOP_CONDITION],
  },
  {
    key: 'sit_reach',
    stationNumber: 4,
    title: 'Chair Sit and Reach Test',
    purpose: 'Assess lower-body flexibility, primarily hamstring flexibility.',
    equipment: ['Folding chair, 17 inches, placed against wall', '18-inch ruler'],
    procedure:
      'Participant sits on edge of chair. One foot stays flat on the floor. The other leg is extended ' +
      'forward with knee straight, heel on floor, and ankle at 90 degrees. Participant places one hand on ' +
      'top of the other with middle fingers even. Participant inhales, then exhales while reaching forward ' +
      'toward the toes. Keep back straight and head up. Avoid bouncing or pain. Hold reach for 2 seconds.',
    safetyNotes: ['Do not perform this test with severe osteoporosis.', GENERIC_STOP_CONDITION],
  },
  {
    key: 'back_scratch',
    stationNumber: 5,
    title: 'Back Scratch Test',
    purpose: 'Measure upper-body flexibility.',
    equipment: ['18-inch ruler'],
    procedure:
      'Participant stands. One hand reaches over the shoulder and down the back. The other hand reaches ' +
      'behind the back and upward. Measure the distance between middle fingertips.',
    safetyNotes: ['Stop if pain occurs.', GENERIC_STOP_CONDITION],
  },
  {
    key: 'up_and_go',
    stationNumber: 6,
    title: '8-Foot Up and Go Test',
    purpose: 'Assess agility and dynamic balance.',
    equipment: ['Stopwatch', 'Chair, about 17 inches high', 'Cone marker', 'Measuring tape', 'Clear area'],
    procedure:
      'Place chair next to wall. Place marker 8 feet in front of chair. Participant starts seated with ' +
      'hands on knees and feet flat. On "Go," participant stands, walks quickly and safely around the cone, ' +
      'returns to chair, and sits down. Timing stops when participant sits.',
    safetyNotes: [
      'Cane or walker may be used if that is the usual walking method. Push-off from chair is allowed. No running.',
      GENERIC_STOP_CONDITION,
    ],
  },
];

export const WALK_TEST_CONTENT: StationContent = {
  key: 'walk_step',
  stationNumber: 7,
  title: '6-Minute Walk Test',
  purpose: 'Assess aerobic endurance.',
  equipment: ['Measuring tape', 'Stopwatch or built-in 6-minute timer', 'Chairs for resting', 'Walking course'],
  procedure:
    'Participant walks as quickly as possible for 6 minutes to cover as much distance as possible. ' +
    'Participant may set their own pace and may stop and rest if needed.',
  safetyNotes: ['Terminate the test if participant reports dizziness, nausea, excessive fatigue, pain, or concerning symptoms.'],
};

export const STEP_TEST_CONTENT: StationContent = {
  key: 'walk_step',
  stationNumber: 7,
  title: '2-Minute Step in Place Test',
  purpose: 'Measure aerobic endurance. Use as an alternative to the 6-Minute Walk Test for participants who use orthopedic devices or have difficulty balancing.',
  equipment: ['Tape for marking wall', 'Stopwatch or built-in 2-minute timer', 'Wall or stable chair'],
  procedure:
    'Participant stands next to wall. Mark a point midway between the kneecap and top of hip bone. ' +
    'Participant marches in place for two minutes, lifting knees to the marked height. Resting is allowed. ' +
    'Holding wall or stable chair is allowed.',
  safetyNotes: [GENERIC_STOP_CONDITION],
};

export function getStationContent(key: StationRouteKey, walkTestVariant?: 'walk' | 'step'): StationContent {
  if (key === 'walk_step') {
    return walkTestVariant === 'step' ? STEP_TEST_CONTENT : WALK_TEST_CONTENT;
  }
  const content = STATION_CONTENT.find((c) => c.key === key);
  if (!content) throw new Error(`No content for station ${key}`);
  return content;
}
