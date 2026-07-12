// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock framer-motion (used by StadiumSeatMap)
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) =>
      <div {...props}>{children}</div>,
    path: ({ children, ...props }: React.SVGAttributes<SVGPathElement> & { children?: React.ReactNode }) =>
      <path {...props}>{children}</path>,
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

const { default: FanHomeTab } = await import('../../src/components/fan/FanHomeTab');

describe('FanHomeTab', () => {
  it('renders correctly with a seat number', () => {
    render(<FanHomeTab seatNumber="B-042" />);
    expect(screen.getByText(/FIFA World Cup 2026/)).toBeInTheDocument();
    expect(screen.getByText('2 - 1')).toBeInTheDocument();
    expect(screen.getByText('Portugal')).toBeInTheDocument();
    expect(screen.getByText('Argentina')).toBeInTheDocument();
  });

  it('shows seat number in tip card', () => {
    render(<FanHomeTab seatNumber="C-007" />);
    expect(screen.getByText(/C-007/)).toBeInTheDocument();
  });

  it('renders the seat location section', () => {
    render(<FanHomeTab seatNumber="A-101" />);
    expect(screen.getByText('Your Seat Location Pin')).toBeInTheDocument();
  });

  it('renders all three tip cards', () => {
    render(<FanHomeTab seatNumber="A-101" />);
    expect(screen.getByText('In-Seat Delivery')).toBeInTheDocument();
    expect(screen.getByText('Medical Care')).toBeInTheDocument();
    expect(screen.getByText('Issue Reporting')).toBeInTheDocument();
  });

  it('renders stadium attendance info', () => {
    render(<FanHomeTab seatNumber="A-101" />);
    expect(screen.getByText(/48,567/)).toBeInTheDocument();
    expect(screen.getAllByText(/Estádio do Nexus/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders with a different seat number correctly', () => {
    render(<FanHomeTab seatNumber="VIP-001" />);
    expect(screen.getByText(/VIP-001/)).toBeInTheDocument();
  });
});
