import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CoachMei from '../CoachMei';

vi.mock('next/dynamic', () => ({
  default: () => () => null,
}));

describe('CoachMei', () => {
  it('renders emoji fallback when animation not loaded', () => {
    render(<CoachMei state="idle" />);
    expect(screen.getByText('🌿')).toBeInTheDocument();
  });

  it('applies correct size', () => {
    render(<CoachMei state="celebrating" size={100} />);
    const el = screen.getByText('🌿').parentElement;
    expect(el).toHaveStyle({ width: '100px', height: '100px' });
  });
});
