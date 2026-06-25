export type NormBand = {
  ageMin: number;
  ageMax: number;
  averageLow: number;
  averageHigh: number;
};

export type NormTable = {
  higherIsBetter: boolean;
  men: NormBand[];
  women: NormBand[];
};

// Chair Sit and Reach Test (inches). Higher (more positive reach) is better.
export const SIT_REACH_NORMS: NormTable = {
  higherIsBetter: true,
  men: [
    { ageMin: 60, ageMax: 64, averageLow: -2.5, averageHigh: 4.0 },
    { ageMin: 65, ageMax: 69, averageLow: -3.0, averageHigh: 3.0 },
    { ageMin: 70, ageMax: 74, averageLow: -3.5, averageHigh: 2.5 },
    { ageMin: 75, ageMax: 79, averageLow: -4.0, averageHigh: 2.0 },
    { ageMin: 80, ageMax: 84, averageLow: -5.5, averageHigh: 1.5 },
    { ageMin: 85, ageMax: 89, averageLow: -5.5, averageHigh: 0.5 },
    { ageMin: 90, ageMax: 94, averageLow: -6.5, averageHigh: -0.5 },
  ],
  women: [
    { ageMin: 60, ageMax: 64, averageLow: -0.5, averageHigh: 5.0 },
    { ageMin: 65, ageMax: 69, averageLow: -0.5, averageHigh: 4.5 },
    { ageMin: 70, ageMax: 74, averageLow: -1.0, averageHigh: 4.0 },
    { ageMin: 75, ageMax: 79, averageLow: -1.5, averageHigh: 3.5 },
    { ageMin: 80, ageMax: 84, averageLow: -2.0, averageHigh: 3.0 },
    { ageMin: 85, ageMax: 89, averageLow: -2.5, averageHigh: 2.5 },
    { ageMin: 90, ageMax: 94, averageLow: -4.5, averageHigh: 1.0 },
  ],
};

// Back Scratch Test (inches). Lower (smaller or more negative gap) is better.
export const BACK_SCRATCH_NORMS: NormTable = {
  higherIsBetter: false,
  men: [
    { ageMin: 60, ageMax: 64, averageLow: 0, averageHigh: 6.5 },
    { ageMin: 65, ageMax: 69, averageLow: -1.0, averageHigh: 7.5 },
    { ageMin: 70, ageMax: 74, averageLow: -1.0, averageHigh: 8.0 },
    { ageMin: 75, ageMax: 79, averageLow: -2.0, averageHigh: 9.0 },
    { ageMin: 80, ageMax: 84, averageLow: -2.0, averageHigh: 9.5 },
    { ageMin: 85, ageMax: 89, averageLow: -3.0, averageHigh: 10.0 },
    { ageMin: 90, ageMax: 94, averageLow: -4.0, averageHigh: 10.5 },
  ],
  women: [
    { ageMin: 60, ageMax: 64, averageLow: 1.5, averageHigh: 3.0 },
    { ageMin: 65, ageMax: 69, averageLow: 1.5, averageHigh: 3.5 },
    { ageMin: 70, ageMax: 74, averageLow: 1.0, averageHigh: 4.0 },
    { ageMin: 75, ageMax: 79, averageLow: 0.5, averageHigh: 5.0 },
    { ageMin: 80, ageMax: 84, averageLow: 0, averageHigh: 5.5 },
    { ageMin: 85, ageMax: 89, averageLow: -1.0, averageHigh: 7.0 },
    { ageMin: 90, ageMax: 94, averageLow: -1.0, averageHigh: 8.0 },
  ],
};

// 8-Foot Up and Go Test (seconds). Lower (faster) is better.
export const UP_AND_GO_NORMS: NormTable = {
  higherIsBetter: false,
  men: [
    { ageMin: 60, ageMax: 64, averageLow: 3.8, averageHigh: 5.6 },
    { ageMin: 65, ageMax: 69, averageLow: 4.3, averageHigh: 5.7 },
    { ageMin: 70, ageMax: 74, averageLow: 4.2, averageHigh: 6.0 },
    { ageMin: 75, ageMax: 79, averageLow: 4.6, averageHigh: 7.2 },
    { ageMin: 80, ageMax: 84, averageLow: 5.2, averageHigh: 7.6 },
    { ageMin: 85, ageMax: 89, averageLow: 5.3, averageHigh: 8.9 },
    { ageMin: 90, ageMax: 94, averageLow: 6.2, averageHigh: 10.0 },
  ],
  women: [
    { ageMin: 60, ageMax: 64, averageLow: 4.4, averageHigh: 6.0 },
    { ageMin: 65, ageMax: 69, averageLow: 4.8, averageHigh: 6.4 },
    { ageMin: 70, ageMax: 74, averageLow: 4.9, averageHigh: 7.1 },
    { ageMin: 75, ageMax: 79, averageLow: 5.2, averageHigh: 7.4 },
    { ageMin: 80, ageMax: 84, averageLow: 5.7, averageHigh: 8.7 },
    { ageMin: 85, ageMax: 89, averageLow: 6.2, averageHigh: 9.6 },
    { ageMin: 90, ageMax: 94, averageLow: 7.3, averageHigh: 11.5 },
  ],
};

// 2-Minute Step in Place Test (right-knee rep count). Higher is better.
// Note: the source spec's men 65-69 row reads "Below < 87, Average 86 to 116" —
// an off-by-one inconsistency in the published table itself. Transcribed as
// averageLow: 87 (matching the stated "Below" boundary) to keep the band contiguous
// with the 60-64 row's averageHigh of 115.
export const STEP_TEST_NORMS: NormTable = {
  higherIsBetter: true,
  men: [
    { ageMin: 60, ageMax: 64, averageLow: 87, averageHigh: 115 },
    { ageMin: 65, ageMax: 69, averageLow: 87, averageHigh: 116 },
    { ageMin: 70, ageMax: 74, averageLow: 80, averageHigh: 110 },
    { ageMin: 75, ageMax: 79, averageLow: 73, averageHigh: 109 },
    { ageMin: 80, ageMax: 84, averageLow: 71, averageHigh: 103 },
    { ageMin: 85, ageMax: 89, averageLow: 59, averageHigh: 91 },
    { ageMin: 90, ageMax: 94, averageLow: 52, averageHigh: 86 },
  ],
  women: [
    { ageMin: 60, ageMax: 64, averageLow: 75, averageHigh: 107 },
    { ageMin: 65, ageMax: 69, averageLow: 73, averageHigh: 107 },
    { ageMin: 70, ageMax: 74, averageLow: 68, averageHigh: 101 },
    { ageMin: 75, ageMax: 79, averageLow: 68, averageHigh: 100 },
    { ageMin: 80, ageMax: 84, averageLow: 60, averageHigh: 91 },
    { ageMin: 85, ageMax: 89, averageLow: 55, averageHigh: 85 },
    { ageMin: 90, ageMax: 94, averageLow: 44, averageHigh: 72 },
  ],
};
