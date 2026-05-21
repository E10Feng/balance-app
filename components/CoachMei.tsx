'use client';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

export type MeiState = 'idle' | 'thinking' | 'speaking' | 'celebrating';

const STATE_URLS: Record<MeiState, string> = {
  idle: '/animations/coach/idle.json',
  thinking: '/animations/coach/thinking.json',
  speaking: '/animations/coach/speaking.json',
  celebrating: '/animations/coach/celebrating.json',
};

type Props = { state: MeiState; size?: number };

export default function CoachMei({ state, size = 80 }: Props) {
  const [animData, setAnimData] = useState<object | null>(null);

  useEffect(() => {
    setAnimData(null);
    fetch(STATE_URLS[state])
      .then((r) => r.json())
      .then(setAnimData)
      .catch(() => setAnimData(null));
  }, [state]);

  const style = { width: size, height: size };

  if (!animData) {
    return (
      <div
        style={style}
        className="rounded-full bg-secondary flex items-center justify-center text-3xl flex-shrink-0"
      >
        <span>🌿</span>
      </div>
    );
  }

  return (
    <div style={style} className="flex-shrink-0">
      <Lottie animationData={animData} loop />
    </div>
  );
}
