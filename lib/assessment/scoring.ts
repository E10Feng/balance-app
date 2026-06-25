import type { Sex, AssessmentStation, BmiCategory } from '@/lib/schema';
import { SIT_REACH_NORMS, BACK_SCRATCH_NORMS, UP_AND_GO_NORMS, STEP_TEST_NORMS, type NormTable } from './norms';
import { cmToInches } from './units';

export function computeBMI(weightKg: number, heightCm: number): { bmi: number; category: BmiCategory } {
  const heightM = heightCm / 100;
  const bmi = Math.round((weightKg / (heightM * heightM)) * 10) / 10;
  let category: BmiCategory;
  if (bmi < 18.5) category = 'underweight';
  else if (bmi < 25) category = 'normal';
  else if (bmi < 30) category = 'overweight';
  else category = 'obesity';
  return { bmi, category };
}

export type AssessmentCategory = 'below_average' | 'average' | 'above_average';
export type TableStation = 'sit_reach' | 'back_scratch' | 'up_and_go' | 'step_test';

const TABLES: Record<TableStation, NormTable> = {
  sit_reach: SIT_REACH_NORMS,
  back_scratch: BACK_SCRATCH_NORMS,
  up_and_go: UP_AND_GO_NORMS,
  step_test: STEP_TEST_NORMS,
};

export function categorizeTableStation(
  station: TableStation,
  score: number,
  age: number,
  sex: Sex
): AssessmentCategory | null {
  const table = TABLES[station];
  const bands = sex === 'male' ? table.men : table.women;
  const band = bands.find((b) => age >= b.ageMin && age <= b.ageMax);
  if (!band) return null;

  if (table.higherIsBetter) {
    if (score < band.averageLow) return 'below_average';
    if (score > band.averageHigh) return 'above_average';
    return 'average';
  }
  if (score > band.averageHigh) return 'below_average';
  if (score < band.averageLow) return 'above_average';
  return 'average';
}

export function predictedWalkDistance(age: number, sex: Sex, heightCm: number, bmi = 0): number {
  return sex === 'male'
    ? 867 - 5.71 * age + 1.03 * heightCm
    : 525 - 2.86 * age + 2.71 * heightCm - 6.22 * bmi;
}

export function categorizeWalkTest(
  actualMeters: number,
  age: number,
  sex: Sex,
  heightCm: number,
  bmi = 0
): AssessmentCategory | null {
  if (age < 60 || age > 94) return null;
  const predicted = predictedWalkDistance(age, sex, heightCm, bmi);
  const diffRatio = (actualMeters - predicted) / predicted;
  if (diffRatio > 0.1) return 'above_average';
  if (diffRatio < -0.1) return 'below_average';
  return 'average';
}

export type Domain =
  | 'lower_body_strength'
  | 'upper_body_strength'
  | 'lower_body_flexibility'
  | 'upper_body_flexibility'
  | 'agility_balance'
  | 'aerobic_endurance';

export type DomainCategories = Record<Domain, AssessmentCategory | null>;

export type OverallResult = {
  total: number | null;
  overallCategory: AssessmentCategory | null;
  missingDomains: Domain[];
  strengths: Domain[];
  maintain: Domain[];
  areasForImprovement: Domain[];
  recommendations: string[];
};

const ALL_DOMAINS: Domain[] = [
  'lower_body_strength',
  'upper_body_strength',
  'lower_body_flexibility',
  'upper_body_flexibility',
  'agility_balance',
  'aerobic_endurance',
];

const DOMAIN_POINTS: Record<AssessmentCategory, number> = {
  below_average: 1,
  average: 2,
  above_average: 3,
};

export function computeOverallScore(domains: DomainCategories): OverallResult {
  const missingDomains = ALL_DOMAINS.filter((d) => domains[d] === null);
  const strengths = ALL_DOMAINS.filter((d) => domains[d] === 'above_average');
  const maintain = ALL_DOMAINS.filter((d) => domains[d] === 'average');
  const areasForImprovement = ALL_DOMAINS.filter((d) => domains[d] === 'below_average');

  let total: number | null = null;
  let overallCategory: AssessmentCategory | null = null;
  if (missingDomains.length === 0) {
    total = ALL_DOMAINS.reduce((sum, d) => sum + DOMAIN_POINTS[domains[d] as AssessmentCategory], 0);
    if (total <= 9) overallCategory = 'below_average';
    else if (total <= 14) overallCategory = 'average';
    else overallCategory = 'above_average';
  }

  const recommendations: string[] = [];
  if (domains.lower_body_strength === 'below_average') {
    recommendations.push('Recommend lower-body strengthening.');
  }
  if (domains.agility_balance === 'below_average') {
    recommendations.push('Recommend balance and agility training.');
  }
  if (domains.lower_body_flexibility === 'below_average' || domains.upper_body_flexibility === 'below_average') {
    recommendations.push('Recommend flexibility and mobility exercises.');
  }
  if (domains.aerobic_endurance === 'below_average') {
    recommendations.push('Recommend aerobic endurance training such as walking or step-in-place progression.');
  }
  if (areasForImprovement.length >= 2) {
    recommendations.push('Multiple areas were below average. A comprehensive fall-prevention program may be beneficial.');
  }

  return { total, overallCategory, missingDomains, strengths, maintain, areasForImprovement, recommendations };
}

export const STATION_TO_DOMAIN: Record<AssessmentStation, Domain> = {
  chair_stand: 'lower_body_strength',
  arm_curl: 'upper_body_strength',
  sit_reach: 'lower_body_flexibility',
  back_scratch: 'upper_body_flexibility',
  up_and_go: 'agility_balance',
  walk_test: 'aerobic_endurance',
  step_test: 'aerobic_endurance',
};

export function computeAge(dateOfBirth: string, asOf: Date = new Date()): number {
  const dob = new Date(dateOfBirth);
  let age = asOf.getFullYear() - dob.getFullYear();
  const hasHadBirthdayThisYear =
    asOf.getMonth() > dob.getMonth() ||
    (asOf.getMonth() === dob.getMonth() && asOf.getDate() >= dob.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

const INCH_CONVERTED_STATIONS: AssessmentStation[] = ['sit_reach', 'back_scratch'];
const DIRECT_TABLE_STATIONS: AssessmentStation[] = ['up_and_go', 'step_test'];

export function categorizeStationResult(
  station: AssessmentStation,
  score: number,
  age: number | null,
  sex: Sex | null,
  context: { heightCm?: number | null; bmi?: number | null }
): AssessmentCategory | null {
  if (age === null || sex === null) return null;

  if (station === 'chair_stand' || station === 'arm_curl') return null;

  if (INCH_CONVERTED_STATIONS.includes(station)) {
    return categorizeTableStation(station as TableStation, cmToInches(score), age, sex);
  }

  if (DIRECT_TABLE_STATIONS.includes(station)) {
    return categorizeTableStation(station as TableStation, score, age, sex);
  }

  if (station === 'walk_test') {
    if (context.heightCm === undefined || context.heightCm === null) return null;
    return categorizeWalkTest(score, age, sex, context.heightCm, context.bmi ?? 0);
  }

  return null;
}
