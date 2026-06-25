'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getStationContent, type StationRouteKey } from '@/lib/assessment/content';
import type { AssessmentStation, WalkTestVariant, Sex } from '@/lib/schema';

type StationResult = { station: AssessmentStation };
type SessionDetail = {
  id: string;
  status: 'in_progress' | 'completed';
  heightCm: number | null;
  walkTestVariant: WalkTestVariant | null;
  stationResults: StationResult[];
};
type UserProfile = { name: string | null; sex: Sex | null; dateOfBirth: string | null };

const DASHBOARD_STATIONS: StationRouteKey[] = [
  'chair_stand', 'arm_curl', 'height_weight', 'sit_reach', 'back_scratch', 'up_and_go', 'walk_step',
];

function ageFromDOB(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const hadBirthday = now.getMonth() > d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() >= d.getDate());
  if (!hadBirthday) age -= 1;
  return age;
}

function isStationDone(session: SessionDetail, key: StationRouteKey): boolean {
  if (key === 'height_weight') return session.heightCm !== null;
  if (key === 'walk_step') {
    if (!session.walkTestVariant) return false;
    const dbStation = session.walkTestVariant === 'step' ? 'step_test' : 'walk_test';
    return session.stationResults.some((r) => r.station === dbStation);
  }
  return session.stationResults.some((r) => r.station === key);
}

export default function AssessmentDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeSession, setActiveSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  async function loadActiveSession() {
    const listRes = await fetch('/api/assessment/sessions');
    const { sessions } = (await listRes.json()) as { sessions: { id: string; status: string }[] };
    const inProgress = sessions.find((s) => s.status === 'in_progress');
    if (!inProgress) {
      setActiveSession(null);
      return;
    }
    const detailRes = await fetch(`/api/assessment/sessions/${inProgress.id}`);
    const { session } = (await detailRes.json()) as { session: SessionDetail };
    setActiveSession(session);
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([fetch('/api/user').then((r) => r.json()), loadActiveSession()]).then(([userData]) => {
      setUser(userData);
      setLoading(false);
    });
  }, []);

  async function handleStartAssessment() {
    setCreating(true);
    await fetch('/api/assessment/sessions', { method: 'POST' });
    await loadActiveSession();
    setCreating(false);
  }

  async function handleSelectWalkVariant(variant: 'walk' | 'step') {
    if (!activeSession) return;
    await fetch(`/api/assessment/sessions/${activeSession.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walkTestVariant: variant }),
    });
    await loadActiveSession();
  }

  if (loading) return <div className="p-6 text-mid text-xl">Loading...</div>;

  const allDone = activeSession ? DASHBOARD_STATIONS.every((k) => isStationDone(activeSession, k)) : false;

  return (
    <div className="p-6 pt-10 flex flex-col gap-6 max-w-md mx-auto">
      <div>
        <p className="text-mid text-sm font-medium uppercase tracking-widest">Senior Fitness Test</p>
        <h1 className="font-heading text-4xl font-semibold text-dark mt-1">Fitness Assessment</h1>
      </div>

      <div className="bg-surface rounded-2xl p-5 flex flex-col gap-2">
        <p className="text-dark text-lg"><strong>{user?.name ?? 'Participant'}</strong></p>
        <p className="text-mid text-base">
          Age: {ageFromDOB(user?.dateOfBirth ?? null) ?? 'Not set'} · Sex: {user?.sex ?? 'Not set'}
        </p>
        {(!user?.dateOfBirth || !user?.sex) && (
          <Link href="/settings" className="text-primary text-base font-medium underline">
            Set age and sex in Settings to enable scoring norms
          </Link>
        )}
      </div>

      {!activeSession ? (
        <button
          onClick={handleStartAssessment}
          disabled={creating}
          className="w-full py-5 rounded-2xl bg-primary text-white text-xl font-semibold disabled:opacity-60"
        >
          {creating ? 'Starting...' : 'Start New Assessment'}
        </button>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {DASHBOARD_STATIONS.map((key) => {
              const content = getStationContent(key, activeSession.walkTestVariant ?? undefined);
              const done = isStationDone(activeSession, key);
              const blocked = key === 'walk_step' && !activeSession.walkTestVariant;
              return (
                <button
                  key={key}
                  disabled={blocked}
                  onClick={() => router.push(`/assessment/${activeSession.id}/station/${key}`)}
                  className={`flex flex-col items-start gap-1 p-4 rounded-2xl border-2 text-left disabled:opacity-50 ${
                    done ? 'bg-secondary-light border-secondary' : 'bg-surface border-primary-light'
                  }`}
                >
                  <span className="text-mid text-sm font-medium">Station {content.stationNumber}</span>
                  <span className="text-dark text-base font-semibold leading-tight">{content.title}</span>
                  <span className="text-sm font-medium" style={{ color: done ? 'var(--secondary)' : 'var(--muted)' }}>
                    {done ? '✓ Done' : 'Not started'}
                  </span>
                </button>
              );
            })}
          </div>

          {!activeSession.walkTestVariant && (
            <div className="bg-surface rounded-2xl p-5 flex flex-col gap-3">
              <p className="text-dark text-lg font-medium">Choose Station 7 test</p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleSelectWalkVariant('walk')}
                  className="flex-1 py-4 rounded-xl border-2 border-primary-light text-dark text-base font-medium"
                >
                  6-Minute Walk
                </button>
                <button
                  onClick={() => handleSelectWalkVariant('step')}
                  className="flex-1 py-4 rounded-xl border-2 border-primary-light text-dark text-base font-medium"
                >
                  2-Minute Step
                </button>
              </div>
            </div>
          )}

          {allDone ? (
            <Link
              href={`/assessment/${activeSession.id}/report`}
              className="w-full py-5 rounded-2xl bg-secondary text-white text-xl font-semibold text-center"
            >
              View Final Report
            </Link>
          ) : (
            <button disabled className="w-full py-5 rounded-2xl bg-muted text-surface text-xl font-semibold opacity-60">
              View Final Report
            </button>
          )}
        </>
      )}
    </div>
  );
}
