// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const { default: FanIssueTab } = await import('../../src/components/fan/FanIssueTab');

describe('FanIssueTab', () => {
  const defaultProps = {
    selectedIssueCategory: 'Seat Occupancy',
    onSelectCategory: vi.fn(),
    issueDescription: '',
    onDescriptionChange: vi.fn(),
    issueSuccess: false,
    onSubmit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with default props', () => {
    render(<FanIssueTab {...defaultProps} />);
    expect(screen.getByText('Log Stadium Issue')).toBeInTheDocument();
    expect(screen.getByText(/Report seating, washroom/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Seat Occupancy' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Harassment' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Broken Seat' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dirty Washroom' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Other' })).toBeInTheDocument();
  });

  it('renders the textarea with current description value', () => {
    render(<FanIssueTab {...defaultProps} issueDescription="The seat is broken" />);
    expect(screen.getByDisplayValue('The seat is broken')).toBeInTheDocument();
  });

  it('shows success message when issueSuccess is true', () => {
    render(<FanIssueTab {...defaultProps} issueSuccess={true} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/Incident Report logged/)).toBeInTheDocument();
  });

  it('does not show success message when issueSuccess is false', () => {
    render(<FanIssueTab {...defaultProps} issueSuccess={false} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('calls onSelectCategory when a category button is clicked', () => {
    const onSelectCategory = vi.fn();
    render(<FanIssueTab {...defaultProps} onSelectCategory={onSelectCategory} />);
    fireEvent.click(screen.getByRole('button', { name: 'Harassment' }));
    expect(onSelectCategory).toHaveBeenCalledTimes(1);
    expect(onSelectCategory).toHaveBeenCalledWith('Harassment');
  });

  it('calls onDescriptionChange when textarea value changes', () => {
    const onDescriptionChange = vi.fn();
    render(<FanIssueTab {...defaultProps} onDescriptionChange={onDescriptionChange} />);
    fireEvent.change(screen.getByRole('textbox', { name: /Describe the Incident/i }), {
      target: { value: 'Chair is broken' },
    });
    expect(onDescriptionChange).toHaveBeenCalledWith('Chair is broken');
  });

  it('calls onSubmit when form is submitted', () => {
    const onSubmit = vi.fn((e) => e.preventDefault());
    render(<FanIssueTab {...defaultProps} issueDescription="Test issue" onSubmit={onSubmit} />);
    fireEvent.submit(screen.getByRole('button', { name: /Submit Incident Pass/i }).closest('form')!);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('highlights selected category', () => {
    render(<FanIssueTab {...defaultProps} selectedIssueCategory="Broken Seat" />);
    const brokenSeatBtn = screen.getByRole('button', { name: 'Broken Seat' });
    expect(brokenSeatBtn.className).toContain('bg-emerald-500');
  });
});
