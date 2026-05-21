'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/', label: 'Home', icon: HomeIcon },
  { href: '/exercises', label: 'Exercises', icon: PlayIcon },
  { href: '/progress', label: 'Progress', icon: BarIcon },
  { href: '/coach', label: 'Coach', icon: ChatIcon },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-surface border-t-2 border-primary-light flex max-w-md mx-auto z-50">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = path === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors relative ${active ? 'text-primary' : 'text-muted'}`}
          >
            {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-b-full" />}
            <Icon active={active} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--primary)' : 'var(--muted)'} strokeWidth="1.8" strokeLinecap="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  );
}

function PlayIcon({ active }: { active: boolean }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--primary)' : 'var(--muted)'} strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="10"/>
      <polygon points="10 8 16 12 10 16 10 8" fill={active ? 'var(--primary)' : 'var(--muted)'} stroke="none"/>
    </svg>
  );
}

function BarIcon({ active }: { active: boolean }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--primary)' : 'var(--muted)'} strokeWidth="1.8" strokeLinecap="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  );
}

function ChatIcon({ active }: { active: boolean }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--primary)' : 'var(--muted)'} strokeWidth="1.8" strokeLinecap="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  );
}
