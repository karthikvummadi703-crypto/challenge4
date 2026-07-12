// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const { default: VolunteersPanel } = await import('../../src/components/organizer/VolunteersPanel');

const defaultProps = {
  volunteersList: [],
  newVolunteerName: '',
  setNewVolunteerName: vi.fn(),
  newVolunteerEmail: '',
  setNewVolunteerEmail: vi.fn(),
  newVolunteerPassword: '',
  setNewVolunteerPassword: vi.fn(),
  newVolunteerGate: 'Gate A',
  setNewVolunteerGate: vi.fn(),
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
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
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

  it('calls setNewVolunteerPassword when password input changes', () => {
    const setNewVolunteerPassword = vi.fn();
    render(<VolunteersPanel {...defaultProps} setNewVolunteerPassword={setNewVolunteerPassword} />);
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secure123' } });
    expect(setNewVolunteerPassword).toHaveBeenCalledWith('secure123');
  });

  it('shows volunteer count in table header', () => {
    render(<VolunteersPanel {...defaultProps} volunteersList={sampleVolunteers} />);
    expect(screen.getByText(/2 volunteers cataloged/i)).toBeInTheDocument();
  });
});
