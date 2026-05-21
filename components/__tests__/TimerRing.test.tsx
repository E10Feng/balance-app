import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import TimerRing from '../TimerRing';

describe('TimerRing', () => {
  it('displays the remaining seconds', () => {
    render(<TimerRing total={30} remaining={15} />);
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('sec')).toBeInTheDocument();
  });

  it('shows 0 when complete', () => {
    render(<TimerRing total={30} remaining={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
