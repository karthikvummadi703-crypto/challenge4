// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const { default: VolunteerHeader } = await import('../../src/components/volunteer/VolunteerHeader');

describe('VolunteerHeader', () => {
  const defaultProps = {
    volunteerName: 'Jane Smith',
    volunteerId: 'VOL-1234',
    onLogout: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the volunteer name and ID', () => {
    render(<VolunteerHeader {...defaultProps} />);
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('VOL-1234')).toBeInTheDocument();
  });

  it('renders the NEXUS AI branding', () => {
    render(<VolunteerHeader {...defaultProps} />);
    expect(screen.getByText('NEXUS')).toBeInTheDocument();
    expect(screen.getByText('AI')).toBeInTheDocument();
  });

  it('renders the logout button', () => {
    render(<VolunteerHeader {...defaultProps} />);
    expect(screen.getByRole('button', { name: /logout device/i })).toBeInTheDocument();
  });

  it('renders with empty volunteer name and ID gracefully', () => {
    render(<VolunteerHeader volunteerName="" volunteerId="" onLogout={vi.fn()} />);
    expect(screen.getByRole('button', { name: /logout device/i })).toBeInTheDocument();
  });

  it('calls onLogout when logout button is clicked', () => {
    const onLogout = vi.fn();
    render(<VolunteerHeader {...defaultProps} onLogout={onLogout} />);
    fireEvent.click(screen.getByRole('button', { name: /logout device/i }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
