// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

const { default: MatchTimer } = await import('../../src/components/MatchTimer');

describe('MatchTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a time display and LIVE label', () => {
    render(<MatchTimer initialSeconds={0} />);
    expect(screen.getByText('0:00')).toBeInTheDocument();
    expect(screen.getByText(/LIVE/)).toBeInTheDocument();
  });

  it('formats single-digit seconds with a leading zero (e.g. 1:01)', () => {
    render(<MatchTimer initialSeconds={61} />);
    expect(screen.getByText('1:01')).toBeInTheDocument();
  });

  it('formats double-digit seconds without a leading zero (e.g. 1:10)', () => {
    render(<MatchTimer initialSeconds={70} />);
    expect(screen.getByText('1:10')).toBeInTheDocument();
  });

  it('formats exactly one minute as 1:00', () => {
    render(<MatchTimer initialSeconds={60} />);
    expect(screen.getByText('1:00')).toBeInTheDocument();
  });

  it('uses custom initialSeconds prop instead of default', () => {
    render(<MatchTimer initialSeconds={125} />);
    expect(screen.getByText('2:05')).toBeInTheDocument();
  });

  it('increments the displayed time each second', async () => {
    render(<MatchTimer initialSeconds={59} />);
    expect(screen.getByText('0:59')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText('1:00')).toBeInTheDocument();
  });

  it('increments across two seconds correctly', async () => {
    render(<MatchTimer initialSeconds={0} />);
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText('0:02')).toBeInTheDocument();
  });

  it('sets a dateTime attribute on the <time> element', () => {
    render(<MatchTimer initialSeconds={70} />);
    const timeEl = screen.getByText('1:10').closest('time');
    expect(timeEl).toHaveAttribute('dateTime', 'PT1M10S');
  });
});
