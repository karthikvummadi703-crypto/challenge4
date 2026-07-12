// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) =>
      <div {...props}>{children}</div>,
  },
}));

const { default: OrganizerLogin } = await import('../../src/components/organizer/OrganizerLogin');

const defaultProps = {
  stadiumBg: '/fake-stadium.jpg',
  email: '',
  setEmail: vi.fn(),
  password: '',
  setPassword: vi.fn(),
  loginError: '',
  isLoggingIn: false,
  onSubmit: vi.fn(),
};

describe('OrganizerLogin', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the login heading', () => {
    render(<OrganizerLogin {...defaultProps} />);
    expect(screen.getByText(/organizer login/i)).toBeInTheDocument();
  });

  it('renders email and password inputs', () => {
    render(<OrganizerLogin {...defaultProps} />);
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/security key/i)).toBeInTheDocument();
  });

  it('renders the submit button with "Login to Command Center" label', () => {
    render(<OrganizerLogin {...defaultProps} />);
    expect(screen.getByRole('button', { name: /login to command center/i })).toBeInTheDocument();
  });

  it('does not show error alert when loginError is empty', () => {
    render(<OrganizerLogin {...defaultProps} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows loginError when provided', () => {
    render(<OrganizerLogin {...defaultProps} loginError="Invalid credentials" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials');
  });

  it('shows Logging in... and disables button when isLoggingIn is true', () => {
    render(<OrganizerLogin {...defaultProps} isLoggingIn={true} />);
    expect(screen.getByText(/logging in/i)).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('calls setEmail when email input changes', () => {
    const setEmail = vi.fn();
    render(<OrganizerLogin {...defaultProps} setEmail={setEmail} />);
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'admin@nexusai.com' } });
    expect(setEmail).toHaveBeenCalledWith('admin@nexusai.com');
  });

  it('calls setPassword when password input changes', () => {
    const setPassword = vi.fn();
    render(<OrganizerLogin {...defaultProps} setPassword={setPassword} />);
    fireEvent.change(screen.getByLabelText(/security key/i), { target: { value: 'secret' } });
    expect(setPassword).toHaveBeenCalledWith('secret');
  });

  it('calls onSubmit when form is submitted', () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(<OrganizerLogin {...defaultProps} onSubmit={onSubmit} />);
    fireEvent.submit(screen.getByRole('button').closest('form')!);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
