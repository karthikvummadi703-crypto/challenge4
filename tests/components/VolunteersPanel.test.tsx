// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

const { default: VolunteersPanel } = await import('../../src/components/organizer/VolunteersPanel');

const defaultProps = {
  volunteersList: [],
  newVolunteerName: '',
  setNewVolunteerName: vi.fn(),
  newVolunteerEmail: '',
  setNewVolunteerEmail: vi.fn(),
  newVolunteerPassword: 'Xy7#kQp2Lm9!Zt',
  setNewVolunteerPassword: vi.fn(),
  newVolunteerGate: 'Gate A',
  setNewVolunteerGate: vi.fn(),
  passwordAcknowledged: true,
  setPasswordAcknowledged: vi.fn(),
  isCreatingVolunteer: false,
  isPublished: false,
  onAddVolunteer: vi.fn(),
  onRemoveVolunteer: vi.fn(),
  onPublishEvent: vi.fn(),
};

const sampleVolunteers = [
  { id: 'v1', name: 'Karthik Kumar', volunteerId: 'VOL-A1B2', status: 'active' as const },
  { id: 'v2', name: 'Maria Silva',   volunteerId: 'VOL-C3D4', status: 'inactive' as const },
];

describe('VolunteersPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the Volunteer Coordination heading', () => {
    render(<VolunteersPanel {...defaultProps} />);
    expect(screen.getByText(/volunteer coordination/i)).toBeInTheDocument();
  });

  it('renders Add Volunteer form fields', () => {
    render(<VolunteersPanel {...defaultProps} />);
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/assigned gate/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/auto-generated password/i)).toBeInTheDocument();
  });

  it('shows empty-roster message when no volunteers', () => {
    render(<VolunteersPanel {...defaultProps} volunteersList={[]} />);
    expect(screen.getByText(/no volunteers added to the roster yet/i)).toBeInTheDocument();
  });

  it('renders "Publish Event" button when not published', () => {
    render(<VolunteersPanel {...defaultProps} isPublished={false} />);
    expect(screen.getByRole('button', { name: /publish event/i })).toBeInTheDocument();
  });

  it('renders "Event is Live" and disables publish button when published', () => {
    render(<VolunteersPanel {...defaultProps} isPublished={true} />);
    const btn = screen.getByRole('button', { name: /event is live/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toBeDisabled();
  });

  it('renders volunteer rows in the table', () => {
    render(<VolunteersPanel {...defaultProps} volunteersList={sampleVolunteers} />);
    expect(screen.getByText('Karthik Kumar')).toBeInTheDocument();
    expect(screen.getByText('Maria Silva')).toBeInTheDocument();
    expect(screen.getByText('VOL-A1B2')).toBeInTheDocument();
    expect(screen.getByText('VOL-C3D4')).toBeInTheDocument();
  });

  it('shows Active / Pending Publish status badges', () => {
    render(<VolunteersPanel {...defaultProps} volunteersList={sampleVolunteers} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Pending Publish')).toBeInTheDocument();
  });

  it('shows Registering... and disables submit while isCreatingVolunteer', () => {
    render(<VolunteersPanel {...defaultProps} isCreatingVolunteer={true} />);
    expect(screen.getByText(/registering/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /registering/i })).toBeDisabled();
  });

  it('calls onPublishEvent when Publish Event is clicked', () => {
    const onPublishEvent = vi.fn();
    render(<VolunteersPanel {...defaultProps} onPublishEvent={onPublishEvent} />);
    fireEvent.click(screen.getByRole('button', { name: /publish event/i }));
    expect(onPublishEvent).toHaveBeenCalledTimes(1);
  });

  it('calls onRemoveVolunteer with volunteer id when remove button clicked', () => {
    const onRemoveVolunteer = vi.fn();
    render(<VolunteersPanel {...defaultProps} volunteersList={sampleVolunteers} onRemoveVolunteer={onRemoveVolunteer} />);
    fireEvent.click(screen.getByRole('button', { name: /remove volunteer karthik kumar/i }));
    expect(onRemoveVolunteer).toHaveBeenCalledWith('v1');
  });

  it('calls onAddVolunteer when the registration form is submitted', () => {
    const onAddVolunteer = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(<VolunteersPanel {...defaultProps} onAddVolunteer={onAddVolunteer} />);
    fireEvent.submit(screen.getByRole('button', { name: /register volunteer/i }).closest('form')!);
    expect(onAddVolunteer).toHaveBeenCalledTimes(1);
  });

  it('calls setNewVolunteerName when full name input changes', () => {
    const setNewVolunteerName = vi.fn();
    render(<VolunteersPanel {...defaultProps} setNewVolunteerName={setNewVolunteerName} />);
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Alice' } });
    expect(setNewVolunteerName).toHaveBeenCalledWith('Alice');
  });

  it('calls setNewVolunteerEmail when email input changes', () => {
    const setNewVolunteerEmail = vi.fn();
    render(<VolunteersPanel {...defaultProps} setNewVolunteerEmail={setNewVolunteerEmail} />);
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'vol@nexus.com' } });
    expect(setNewVolunteerEmail).toHaveBeenCalledWith('vol@nexus.com');
  });

  it('calls setNewVolunteerGate when gate select changes', () => {
    const setNewVolunteerGate = vi.fn();
    render(<VolunteersPanel {...defaultProps} setNewVolunteerGate={setNewVolunteerGate} />);
    fireEvent.change(screen.getByLabelText(/assigned gate/i), { target: { value: 'Gate C' } });
    expect(setNewVolunteerGate).toHaveBeenCalledWith('Gate C');
  });

  it('renders the auto-generated password as read-only (cannot be edited by the admin)', () => {
    render(<VolunteersPanel {...defaultProps} />);
    const passwordField = screen.getByLabelText(/auto-generated password/i);
    expect(passwordField).toHaveValue('Xy7#kQp2Lm9!Zt');
    expect(passwordField).toHaveAttribute('readonly');
  });

  it('calls setPasswordAcknowledged when the acknowledgment checkbox is toggled', () => {
    const setPasswordAcknowledged = vi.fn();
    render(<VolunteersPanel {...defaultProps} passwordAcknowledged={false} setPasswordAcknowledged={setPasswordAcknowledged} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(setPasswordAcknowledged).toHaveBeenCalledWith(true);
  });

  it('disables Register Volunteer submit until the password is acknowledged', () => {
    render(<VolunteersPanel {...defaultProps} passwordAcknowledged={false} />);
    expect(screen.getByRole('button', { name: /register volunteer/i })).toBeDisabled();
  });

  it('shows volunteer count in table header', () => {
    render(<VolunteersPanel {...defaultProps} volunteersList={sampleVolunteers} />);
    expect(screen.getByText(/2 volunteers cataloged/i)).toBeInTheDocument();
  });
});

// ── handleCopyPassword (lines 42-43) ─────────────────────────────────────────
// The copy button calls navigator.clipboard.writeText. Because this is a
// convenience feature (not a requirement), failures are caught and swallowed.

describe('VolunteersPanel — handleCopyPassword (clipboard)', () => {
  afterEach(() => {
    // Restore real clipboard if stubbed
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
  });

  it('calls navigator.clipboard.writeText with the generated password on copy click', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(<VolunteersPanel {...defaultProps} newVolunteerPassword="Xy7#kQp2Lm9!Zt" />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /copy generated password/i }));
    });

    expect(writeText).toHaveBeenCalledWith('Xy7#kQp2Lm9!Zt');
  });

  it('does not throw when clipboard.writeText rejects (non-secure context)', async () => {
    // Simulate clipboard API unavailable by making writeText throw
    const writeText = vi.fn().mockRejectedValue(new Error('NotAllowedError'));
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(<VolunteersPanel {...defaultProps} newVolunteerPassword="SecretPwd" />);
    // Should not propagate — the catch is intentionally silent
    await expect(
      act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /copy generated password/i }));
      })
    ).resolves.not.toThrow();
  });
});
