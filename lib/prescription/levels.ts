import type { ExerciseCategory } from '@/lib/schema';
import type { Domain, DomainCategories } from '@/lib/assessment/scoring';

const DOMAIN_TO_CATEGORY: Record<Domain, ExerciseCategory> = {
  lower_body_strength: 'lower_body_strength',
  upper_body_strength: 'upper_body_strength',
  lower_body_flexibility: 'lower_body_flexibility',
  upper_body_flexibility: 'upper_body_flexibility',
  agility_balance: 'agility_balance',
  aerobic_endurance: 'aerobic_endurance',
};

export function computeCategoryLevels(
  domains: DomainCategories
): Record<ExerciseCategory, number> {
  const result: Record<ExerciseCategory, number> = {
    lower_body_strength: 2, upper_body_strength: 2,
    lower_body_flexibility: 2, upper_body_flexibility: 2,
    agility_balance: 2, aerobic_endurance: 2,
    warm_up: 2, cool_down: 2,
  };
  for (const [domain, category] of Object.entries(DOMAIN_TO_CATEGORY) as [Domain, ExerciseCategory][]) {
    const cat = domains[domain];
    if (cat === 'below_average') result[category] = 1;
    else if (cat === 'above_average') result[category] = 3;
    // null or 'average' → remains 2
  }
  return result;
}
