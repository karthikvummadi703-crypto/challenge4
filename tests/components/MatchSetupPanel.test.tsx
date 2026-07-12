// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const { default: MatchSetupPanel } = await import('../../src/components/organizer/MatchSetupPanel');

const defaultProps = {
  stadiumName: 'Estádio do Nexus',
  setStadiumName: vi.fn(),
  matchName: 'Portugal vs Argentina',
  setMatchName: vi.fn(),
  matchDate: '18/07/2026',
  setMatchDate: vi.fn(),
  matchTime: '19:30',
  setMatchTime: vi.fn(),
  ticketPrice: '120',
  setTicketPrice: vi.fn(),
  matchSaveSuccess: false,
  matches: [],
  onSubmit: vi.fn(),
};

const sampleMatches = [
  {
    id: 'm1',
    stadiumName: 'Estádio do Nexus',
    matchName: 'Portugal vs Argentina',
    matchDate: '18/07/2026',
    matchTime: '19:30',
    ticketPrice: 120,
    published: true,
  },
  {
    id: 'm2',
    stadiumName: 'Nexus Arena',
    matchName: 'France vs Brazil',
    matchDate: '20/07/2026',
    matchTime: '21:00',
    ticketPrice: 200,
    published: false,
  },
];

describe('MatchSetupPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the Match Setup Panel heading', () => {
    render(<MatchSetupPanel {...defaultProps} />);
    expect(screen.getByText(/match setup panel/i)).toBeInTheDocument();
  });

  it('renders all form inputs with correct values', () => {
    render(<MatchSetupPanel {...defaultProps} />);
    expect(screen.getByLabelText(/stadium name/i)).toHaveValue('Estádio do Nexus');
    expect(screen.getByLabelText(/match name/i)).toHaveValue('Portugal vs Argentina');
    expect(screen.getByLabelText(/match date/i)).toHaveValue('18/07/2026');
    expect(screen.getByLabelText(/match time/i)).toHaveValue('19:30');
    expect(screen.getByLabelText(/ticket price/i)).toHaveValue(120);
  });

  it('renders Save Match Configurations button', () => {
    render(<MatchSetupPanel {...defaultProps} />);
    expect(screen.getByRole('button', { name: /save match configurations/i })).toBeInTheDocument();
  });

  it('shows empty-state message when no matches exist', () => {
    render(<MatchSetupPanel {...defaultProps} matches={[]} />);
    expect(screen.getByText(/no matches set up yet/i)).toBeInTheDocument();
  });

  it('does not show success message when matchSaveSuccess is false', () => {
    render(<MatchSetupPanel {...defaultProps} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows success status when matchSaveSuccess is true', () => {
    render(<MatchSetupPanel {...defaultProps} matchSaveSuccess={true} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/match logistics updated/i);
  });

  it('renders match cards from matches prop', () => {
    render(<MatchSetupPanel {...defaultProps} matches={sampleMatches} />);
    expect(screen.getByText('Portugal vs Argentina')).toBeInTheDocument();
    expect(screen.getByText('France vs Brazil')).toBeInTheDocument();
  });

  it('shows Live/Draft badges on match cards', () => {
    render(<MatchSetupPanel {...defaultProps} matches={sampleMatches} />);
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('calls onSubmit when form is submitted', () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(<MatchSetupPanel {...defaultProps} onSubmit={onSubmit} />);
    fireEvent.submit(screen.getByRole('button', { name: /save match configurations/i }).closest('form')!);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('calls setStadiumName when stadium input changes', () => {
    const setStadiumName = vi.fn();
    render(<MatchSetupPanel {...defaultProps} setStadiumName={setStadiumName} />);
    fireEvent.change(screen.getByLabelText(/stadium name/i), { target: { value: 'New Arena' } });
    expect(setStadiumName).toHaveBeenCalledWith('New Arena');
  });
});
