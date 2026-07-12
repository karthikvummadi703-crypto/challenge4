// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ── Mock framer-motion ────────────────────────────────────────────────────────
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) =>
      <div {...props}>{children}</div>,
  },
}));

const { default: VolunteerLogin } = await import('../../src/components/volunteer/VolunteerLogin');

const demoAccounts = [
  { id: 'acc1', name: 'Alice Volunteer', volunteerId: 'VOL-AAAA', email: 'alice@nexusai.com' },
  { id: 'acc2', name: 'Bob Volunteer',   volunteerId: 'VOL-BBBB', email: 'bob@nexusai.com'   },
];

const defaultProps = {
  email: '',
  setEmail: vi.fn(),
  password: '',
  setPassword: vi.fn(),
  loginError: '',
  isLoggingIn: false,
  onSubmit: vi.fn(),
  demoAccounts,
  onQuickLogin: vi.fn(),
};

describe('VolunteerLogin', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders the form with email and password fields', () => {
    render(<VolunteerLogin {...defaultProps} />);
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in to device/i })).toBeInTheDocument();
  });

  it('renders the Volunteer Gateway heading', () => {
    render(<VolunteerLogin {...defaultProps} />);
    expect(screen.getByText(/volunteer gateway/i)).toBeInTheDocument();
  });

  it('renders demo accounts when provided', () => {
    render(<VolunteerLogin {...defaultProps} />);
    expect(screen.getByText('Alice Volunteer')).toBeInTheDocument();
    expect(screen.getByText('Bob Volunteer')).toBeInTheDocument();
  });

  it('shows empty-state message when no demo accounts', () => {
    render(<VolunteerLogin {...defaultProps} demoAccounts={[]} />);
    expect(screen.getByText(/no volunteer profiles registered yet/i)).toBeInTheDocument();
  });

  it('shows a login error when loginError prop is set', () => {
    render(<VolunteerLogin {...defaultProps} loginError="Invalid credentials" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials');
  });

  it('shows Signing In… and disables button while logging in', () => {
    render(<VolunteerLogin {...defaultProps} isLoggingIn={true} />);
    expect(screen.getByText(/signing in/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
  });

  it('calls onSubmit when the login form is submitted', () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(<VolunteerLogin {...defaultProps} onSubmit={onSubmit} />);
    fireEvent.submit(screen.getByRole('button', { name: /log in to device/i }).closest('form')!);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('calls setEmail when the email field changes', () => {
    const setEmail = vi.fn();
    render(<VolunteerLogin {...defaultProps} setEmail={setEmail} />);
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@example.com' } });
    expect(setEmail).toHaveBeenCalledWith('test@example.com');
  });

  it('calls onQuickLogin with the correct account when a demo button is clicked', () => {
    const onQuickLogin = vi.fn();
    render(<VolunteerLogin {...defaultProps} onQuickLogin={onQuickLogin} />);
    fireEvent.click(screen.getByText('Alice Volunteer'));
    expect(onQuickLogin).toHaveBeenCalledTimes(1);
    expect(onQuickLogin).toHaveBeenCalledWith(demoAccounts[0]);
  });
});
