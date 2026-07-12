// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const { default: FanMedicalTab } = await import('../../src/components/fan/FanMedicalTab');

describe('FanMedicalTab', () => {
  const defaultProps = {
    emergencySeat: 'A-101',
    onEmergencySeatChange: vi.fn(),
    emergencySuccess: false,
    onSubmit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with typical props', () => {
    render(<FanMedicalTab {...defaultProps} />);
    expect(screen.getByText('In-Stadium Emergency')).toBeInTheDocument();
    expect(screen.getByText(/Contact our stadium response team/)).toBeInTheDocument();
    expect(screen.getByText('Critical Beacon Portal')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Trigger Emergency Aid/i })).toBeInTheDocument();
  });

  it('renders seat input with current emergencySeat value', () => {
    render(<FanMedicalTab {...defaultProps} emergencySeat="C-007" />);
    expect(screen.getByDisplayValue('C-007')).toBeInTheDocument();
  });

  it('renders with empty emergencySeat value', () => {
    render(<FanMedicalTab {...defaultProps} emergencySeat="" />);
    const input = screen.getByLabelText(/Verify Your Coordinate Seat/i);
    expect(input).toHaveValue('');
  });

  it('shows emergency success alert when emergencySuccess is true', () => {
    render(<FanMedicalTab {...defaultProps} emergencySuccess={true} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/EMERGENCY RESOLUTION ACTIVE/)).toBeInTheDocument();
  });

  it('does not show alert when emergencySuccess is false', () => {
    render(<FanMedicalTab {...defaultProps} emergencySuccess={false} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('calls onEmergencySeatChange when input changes', () => {
    const onEmergencySeatChange = vi.fn();
    render(<FanMedicalTab {...defaultProps} onEmergencySeatChange={onEmergencySeatChange} />);
    fireEvent.change(screen.getByLabelText(/Verify Your Coordinate Seat/i), {
      target: { value: 'B-222' },
    });
    expect(onEmergencySeatChange).toHaveBeenCalledWith('B-222');
  });

  it('calls onSubmit when form is submitted', () => {
    const onSubmit = vi.fn((e) => e.preventDefault());
    render(<FanMedicalTab {...defaultProps} onSubmit={onSubmit} />);
    fireEvent.submit(screen.getByRole('button', { name: /Trigger Emergency Aid/i }).closest('form')!);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('shows average paramedic arrival time', () => {
    render(<FanMedicalTab {...defaultProps} />);
    expect(screen.getByText(/2.4 minutes/)).toBeInTheDocument();
  });
});
