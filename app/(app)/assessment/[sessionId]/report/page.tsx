'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { AssessmentStation, AssessmentCategory, BmiCategory } from '@/lib/schema';

type StationResult = { station: AssessmentStation; score: number | null; category: AssessmentCategory | null; unit: string };
type SessionDetail = {
  id: string;
  dateOfTest: string;
  bmi: number | null;
  bmiCategory: BmiCategory | null;
  stationResults: StationResult[];
};
type OverallResult = {
  total: number | null;
  overallCategory: AssessmentCategory | null;
  missingDomains: string[];
  strengths: string[];
  maintain: string[];
  areasForImprovement: string[];
  recommendations: string[];
};
type UserProfile = { name: string | null; sex: 'male' | 'female' | null; dateOfBirth: string | null };

const CATEGORY_LABELS: Record<AssessmentCategory, string> = {
  below_average: 'Below Average',
  average: 'Average',
  above_average: 'Above Average',
};

const DOMAIN_LABELS: Record<string, string> = {
  lower_body_strength: 'Lower Body Strength',
  upper_body_strength: 'Upper Body Strength',
  lower_body_flexibility: 'Lower Body Flexibility',
  upper_body_flexibility: 'Upper Body Flexibility',
  agility_balance: 'Agility and Dynamic Balance',
  aerobic_endurance: 'Aerobic Endurance',
};

const STATION_TITLES: Record<AssessmentStation, string> = {
  chair_stand: 'Chair Stand Test',
  arm_curl: 'Arm Curl Test',
  sit_reach: 'Chair Sit and Reach Test',
  back_scratch: 'Back Scratch Test',
  up_and_go: '8-Foot Up and Go Test',
  walk_test: '6-Minute Walk Test',
  step_test: '2-Minute Step in Place Test',
};

export default function ReportPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [overall, setOverall] = useState<OverallResult | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/assessment/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      }).then((r) => r.json()),
      fetch('/api/user').then((r) => r.json()),
    ]).then(([completion, userData]: [{ session: SessionDetail; overall: OverallResult }, UserProfile]) => {
      setSession(completion.session);
      setOverall(completion.overall);
      setUser(userData);
    });
  }, [sessionId]);

  if (!session || !overall || !user) return <div className="p-6 text-mid text-xl">Generating report...</div>;

  return (
    <div className="p-6 pt-10 pb-12 flex flex-col gap-6 max-w-md mx-auto print:p-0">
      <div className="flex items-center gap-3 print:hidden">
        <button
          onClick={() => router.push('/assessment')}
          className="w-12 h-12 rounded-full bg-surface flex items-center justify-center"
          aria-label="Back to dashboard"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--dark)" strokeWidth="2.5" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <h1 className="font-heading text-3xl font-semibold text-dark">Final Report</h1>
      </div>

      <div className="bg-surface rounded-2xl p-5 flex flex-col gap-1">
        <p className="text-dark text-lg"><strong>{user.name ?? '—'}</strong></p>
        <p className="text-mid text-base">Sex: {user.sex ?? '—'} · Date of test: {session.dateOfTest}</p>
      </div>

      <div className="bg-surface rounded-2xl p-5 flex flex-col gap-2">
        <p className="font-heading text-xl text-dark">Body Mass Index</p>
        <p className="text-dark text-lg">
          {session.bmi !== null ? `${session.bmi} (${session.bmiCategory})` : 'Not recorded'}
        </p>
      </div>

      <div className="bg-surface rounded-2xl p-5 flex flex-col gap-3">
        <p className="font-heading text-xl text-dark">Station Results</p>
        {session.stationResults.map((r) => (
          <div key={r.station} className="flex justify-between items-center">
            <span className="text-dark text-base">{STATION_TITLES[r.station]}</span>
            <span className="text-mid text-base font-medium">
              {r.score !== null ? `${r.score} ${r.unit}` : '—'} —{' '}
              {r.category ? CATEGORY_LABELS[r.category] : 'Not scored (norms unavailable)'}
            </span>
          </div>
        ))}
      </div>

      <div className="bg-surface rounded-2xl p-5 flex flex-col gap-2">
        <p className="font-heading text-xl text-dark">Overall Functional Fitness Score</p>
        {overall.total !== null ? (
          <>
            <p className="font-heading text-3xl font-semibold text-primary">{overall.total}/18</p>
            <p className="text-dark text-lg">{overall.overallCategory ? CATEGORY_LABELS[overall.overallCategory] : ''}</p>
          </>
        ) : (
          <p className="text-mid text-base">
            Overall score unavailable — {overall.missingDomains.map((d) => DOMAIN_LABELS[d]).join(', ')} norms not yet
            configured.
          </p>
        )}
      </div>

      {overall.strengths.length > 0 && (
        <div className="bg-secondary-light rounded-2xl p-5">
          <p className="font-heading text-lg text-dark mb-2">Strengths</p>
          {overall.strengths.map((d) => (
            <p key={d} className="text-dark text-base">{DOMAIN_LABELS[d]}</p>
          ))}
        </div>
      )}

      {overall.maintain.length > 0 && (
        <div className="bg-surface rounded-2xl p-5">
          <p className="font-heading text-lg text-dark mb-2">Maintain</p>
          {overall.maintain.map((d) => (
            <p key={d} className="text-dark text-base">{DOMAIN_LABELS[d]}</p>
          ))}
        </div>
      )}

      {overall.areasForImprovement.length > 0 && (
        <div className="bg-primary-light rounded-2xl p-5">
          <p className="font-heading text-lg text-dark mb-2">Areas for Improvement</p>
          {overall.areasForImprovement.map((d) => (
            <p key={d} className="text-dark text-base">{DOMAIN_LABELS[d]}</p>
          ))}
        </div>
      )}

      {overall.recommendations.length > 0 && (
        <div className="bg-surface rounded-2xl p-5">
          <p className="font-heading text-lg text-dark mb-2">Fall Prevention Recommendations</p>
          {overall.recommendations.map((rec, i) => (
            <p key={i} className="text-dark text-base">{rec}</p>
          ))}
        </div>
      )}

      <p className="text-mid text-sm">
        This overall score is a simple app-generated summary based on Senior Fitness Test category labels. It is
        not a medical diagnosis or formal fall-risk diagnosis.
      </p>

      <button
        onClick={() => window.print()}
        className="w-full py-5 rounded-2xl bg-primary text-white text-xl font-semibold print:hidden"
      >
        Print Report
      </button>
    </div>
  );
}
