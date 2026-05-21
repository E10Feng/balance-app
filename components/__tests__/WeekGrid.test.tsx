import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import WeekGrid from '../WeekGrid';

describe('WeekGrid', () => {
  it('renders 7 day cells', () => {
    render(<WeekGrid completedDates={[]} />);
    const cells = document.querySelectorAll('[data-testid="day-cell"]');
    expect(cells).toHaveLength(7);
  });

  it('marks completed days with a checkmark', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    render(<WeekGrid completedDates={[dateStr]} />);
    expect(screen.getByText('✓')).toBeInTheDocument();
  });
});
