import type { BmiCategory } from '@/lib/schema';

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
