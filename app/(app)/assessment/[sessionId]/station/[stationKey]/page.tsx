'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getStationContent, type StationRouteKey } from '@/lib/assessment/content';
import type { AssessmentStation, WalkTestVariant } from '@/lib/schema';
import RepCountStation from '@/components/assessment/RepCountStation';
import TwoTrialMeasurementStation from '@/components/assessment/TwoTrialMeasurementStation';
import TwoTrialStopwatchStation from '@/components/assessment/TwoTrialStopwatchStation';
import DistanceAfterTimerStation from '@/components/assessment/DistanceAfterTimerStation';
import BmiStation from '@/components/assessment/BmiStation';

type SessionDetail = { id: string; walkTestVariant: WalkTestVariant | null };
type SavePayload = { rawData: Record<string, unknown>; score: number; unit: string };

export default function StationPage() {
  const { sessionId, stationKey } = useParams<{ sessionId: string; stationKey: StationRouteKey }>();
  const router = useRouter();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [armSide, setArmSide] = useState<'right' | 'left'>('right');
  const [armWeightLb, setArmWeightLb] = useState(8);

  useEffect(() => {
    fetch(`/api/assessment/sessions/${sessionId}`)
      .then((r) => r.json())
      .then((d: { session: SessionDetail }) => setSession(d.session));
  }, [sessionId]);

  useEffect(() => {
    if (session && stationKey === 'walk_step' && !session.walkTestVariant) {
      router.push('/assessment');
    }
  }, [session, stationKey, router]);

  if (!session) return <div className="p-6 text-mid text-xl">Loading...</div>;

  if (stationKey === 'walk_step' && !session.walkTestVariant) {
    return <div className="p-6 text-mid text-xl">Redirecting...</div>;
  }

  const content = getStationContent(stationKey, session.walkTestVariant ?? undefined);

  async function saveStation(payload: SavePayload) {
    const dbStation: AssessmentStation =
      stationKey === 'walk_step'
        ? session!.walkTestVariant === 'step' ? 'step_test' : 'walk_test'
        : (stationKey as AssessmentStation);
    await fetch(`/api/assessment/sessions/${sessionId}/stations/${dbStation}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    router.push('/assessment');
  }

  async function saveBmi(payload: { heightCm: number; weightKg: number }) {
    await fetch(`/api/assessment/sessions/${sessionId}/bmi`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    router.push('/assessment');
  }

  return (
    <div className="p-6 pt-10 flex flex-col gap-6 max-w-md mx-auto">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/assessment')}
          className="w-12 h-12 rounded-full bg-surface flex items-center justify-center"
          aria-label="Back to dashboard"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--dark)" strokeWidth="2.5" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <h1 className="font-heading text-2xl font-semibold text-dark">
          Station {content.stationNumber}: {content.title}
        </h1>
      </div>

      <div className="bg-surface rounded-2xl p-5 flex flex-col gap-3">
        <p className="text-dark text-lg"><strong>Purpose:</strong> {content.purpose}</p>
        <p className="text-dark text-base"><strong>Equipment:</strong> {content.equipment.join(', ')}</p>
        <p className="text-dark text-base"><strong>Procedure:</strong> {content.procedure}</p>
        <div className="bg-bg rounded-xl p-3">
          {content.safetyNotes.map((note, i) => (
            <p key={i} className="text-mid text-sm">⚠ {note}</p>
          ))}
        </div>
      </div>

      {stationKey === 'chair_stand' && <RepCountStation durationSeconds={30} onSave={saveStation} />}

      {stationKey === 'arm_curl' && (
        <RepCountStation
          durationSeconds={30}
          extraFields={
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <button
                  onClick={() => setArmSide('right')}
                  className={`flex-1 py-3 rounded-xl text-base font-medium border-2 ${
                    armSide === 'right' ? 'bg-primary text-white border-primary' : 'border-primary-light text-dark'
                  }`}
                >
                  Right arm
                </button>
                <button
                  onClick={() => setArmSide('left')}
                  className={`flex-1 py-3 rounded-xl text-base font-medium border-2 ${
                    armSide === 'left' ? 'bg-primary text-white border-primary' : 'border-primary-light text-dark'
                  }`}
                >
                  Left arm
                </button>
              </div>
              <label className="text-dark text-base font-medium">Weight used (lb)</label>
              <input
                type="number"
                value={armWeightLb}
                onChange={(e) => setArmWeightLb(Number(e.target.value))}
                className="border-2 border-primary-light rounded-xl px-4 py-3 text-lg text-dark"
              />
            </div>
          }
          onSave={(payload) => saveStation({ ...payload, rawData: { ...payload.rawData, armSide, armWeightLb } })}
        />
      )}

      {stationKey === 'height_weight' && <BmiStation onSave={saveBmi} />}

      {stationKey === 'sit_reach' && <TwoTrialMeasurementStation higherIsBetter={true} onSave={saveStation} />}

      {stationKey === 'back_scratch' && <TwoTrialMeasurementStation higherIsBetter={false} onSave={saveStation} />}

      {stationKey === 'up_and_go' && <TwoTrialStopwatchStation onSave={saveStation} />}

      {stationKey === 'walk_step' && session.walkTestVariant === 'step' && (
        <RepCountStation durationSeconds={120} onSave={saveStation} />
      )}

      {stationKey === 'walk_step' && session.walkTestVariant !== 'step' && (
        <DistanceAfterTimerStation durationSeconds={360} onSave={saveStation} />
      )}
    </div>
  );
}
