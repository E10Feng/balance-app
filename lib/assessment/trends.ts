import type { AssessmentStation, AssessmentCategory } from '@/lib/schema';
import type { Domain } from './scoring';
import { STATION_TO_DOMAIN } from './scoring';

type StationResult = {
  station: AssessmentStation;
  score: number | null;
  category: AssessmentCategory | null;
  unit: string;
};

type SessionForComparison = {
  stationResults: StationResult[];
  overallScore: number | null;
};

export type DomainDelta = {
  domain: Domain;
  previousCategory: AssessmentCategory | null;
  currentCategory: AssessmentCategory | null;
  previousScore: number | null;
  currentScore: number | null;
  unit: string | null;
  scoreDelta: number | null;
  categoryChanged: boolean;
  improved: boolean;
};

export type ComparisonResult = {
  domainDeltas: DomainDelta[];
  overallScoreDelta: number | null;
};

const ALL_DOMAINS: Domain[] = [
  'lower_body_strength', 'upper_body_strength',
  'lower_body_flexibility', 'upper_body_flexibility',
  'agility_balance', 'aerobic_endurance',
];

const CATEGORY_ORDER: Record<AssessmentCategory, number> = {
  below_average: 0, average: 1, above_average: 2,
};

export function compareAssessments(
  previous: SessionForComparison,
  current: SessionForComparison,
): ComparisonResult {
  const domainDeltas: DomainDelta[] = ALL_DOMAINS.map((domain) => {
    const stationsForDomain = (Object.entries(STATION_TO_DOMAIN) as [AssessmentStation, Domain][])
      .filter(([, d]) => d === domain)
      .map(([s]) => s);

    const prevResult = previous.stationResults.find((r) => stationsForDomain.includes(r.station));
    const currResult = current.stationResults.find((r) => stationsForDomain.includes(r.station));

    const prevScore = prevResult?.score ?? null;
    const currScore = currResult?.score ?? null;
    const scoreDelta = prevScore !== null && currScore !== null ? currScore - prevScore : null;
    const prevCategory = prevResult?.category ?? null;
    const currCategory = currResult?.category ?? null;
    const categoryChanged = prevCategory !== currCategory;

    const improved =
      prevCategory !== null && currCategory !== null
        ? CATEGORY_ORDER[currCategory] > CATEGORY_ORDER[prevCategory]
        : scoreDelta !== null && scoreDelta > 0;

    return {
      domain, previousCategory: prevCategory, currentCategory: currCategory,
      previousScore: prevScore, currentScore: currScore,
      unit: currResult?.unit ?? prevResult?.unit ?? null,
      scoreDelta, categoryChanged, improved,
    };
  });

  const overallScoreDelta =
    previous.overallScore !== null && current.overallScore !== null
      ? current.overallScore - previous.overallScore
      : null;

  return { domainDeltas, overallScoreDelta };
}
