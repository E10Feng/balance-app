import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BottomNav from '../BottomNav';

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
vi.mock('next/link', () => ({
  default: ({ href, className, children }: { href: string; className: string; children: React.ReactNode }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

describe('BottomNav', () => {
  it('renders all 4 navigation items', () => {
    render(<BottomNav />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Exercises')).toBeInTheDocument();
    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('Coach')).toBeInTheDocument();
  });

  it('marks Home as active on root path', () => {
    render(<BottomNav />);
    const homeLink = screen.getByText('Home').closest('a');
    expect(homeLink).toHaveClass('text-primary');
  });
});
