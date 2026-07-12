// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock framer-motion — FanAuth uses motion.div
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) =>
      <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

const { default: FanAuth } = await import('../../src/components/fan/FanAuth');

const baseProps = {
  stadiumBg: '/stadium.jpg',
  isRegistering: false,
  onToggleMode: vi.fn(),
  name: '', setName: vi.fn(),
  email: 'fan@test.com', setEmail: vi.fn(),
  password: 'secret123', setPassword: vi.fn(),
  phone: '', setPhone: vi.fn(),
  country: '', setCountry: vi.fn(),
  preferredLanguage: 'English', setPreferredLanguage: vi.fn(),
  favoriteTeam: '', setFavoriteTeam: vi.fn(),
  seatNumber: '',
  isGeneratingSeat: false,
  onRegenerateSeat: vi.fn(),
  isSubmitting: false,
  error: null,
  onSubmit: vi.fn(),
};

describe('FanAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login mode correctly', () => {
    render(<FanAuth {...baseProps} isRegistering={false} />);
    expect(screen.getByText('Fan Pass Portal')).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Enter Fan Pass/i })).toBeInTheDocument();
  });

  it('renders registration mode correctly', () => {
    render(<FanAuth {...baseProps} isRegistering={true} seatNumber="A-101" />);
    expect(screen.getByText('Register Fan Pass')).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Country/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Register and Enter/i })).toBeInTheDocument();
  });

  it('shows error message when error prop is set', () => {
    render(<FanAuth {...baseProps} error="Invalid email address." />);
    expect(screen.getByText('Invalid email address.')).toBeInTheDocument();
  });

  it('does not show error block when error is null', () => {
    render(<FanAuth {...baseProps} error={null} />);
    expect(screen.queryByText(/Invalid/i)).not.toBeInTheDocument();
  });

  it('shows Processing... label and disables button when isSubmitting', () => {
    render(<FanAuth {...baseProps} isSubmitting={true} />);
    expect(screen.getByText('Processing...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Processing/i })).toBeDisabled();
  });

  it('shows seat input in registration mode with current seatNumber value', () => {
    render(<FanAuth {...baseProps} isRegistering={true} seatNumber="B-042" />);
    expect(screen.getByDisplayValue('B-042')).toBeInTheDocument();
  });

  it('calls onToggleMode when toggle link is clicked', () => {
    const onToggleMode = vi.fn();
    render(<FanAuth {...baseProps} isRegistering={false} onToggleMode={onToggleMode} />);
    fireEvent.click(screen.getByText(/New to stadium\? Create Fan Pass/i));
    expect(onToggleMode).toHaveBeenCalledTimes(1);
  });

  it('calls onSubmit when form is submitted', () => {
    const onSubmit = vi.fn((e) => e.preventDefault());
    render(<FanAuth {...baseProps} onSubmit={onSubmit} />);
    fireEvent.submit(screen.getByRole('button', { name: /Enter Fan Pass/i }).closest('form')!);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('calls setEmail when email input changes', () => {
    const setEmail = vi.fn();
    render(<FanAuth {...baseProps} setEmail={setEmail} />);
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'new@test.com' },
    });
    expect(setEmail).toHaveBeenCalledWith('new@test.com');
  });

  it('calls onRegenerateSeat when regenerate button is clicked in registration mode', () => {
    const onRegenerateSeat = vi.fn();
    render(<FanAuth {...baseProps} isRegistering={true} seatNumber="A-101" onRegenerateSeat={onRegenerateSeat} />);
    fireEvent.click(screen.getByLabelText(/Generate new seat number/i));
    expect(onRegenerateSeat).toHaveBeenCalledTimes(1);
  });

  it('disables regenerate button when isGeneratingSeat is true', () => {
    render(<FanAuth {...baseProps} isRegistering={true} seatNumber="A-101" isGeneratingSeat={true} />);
    expect(screen.getByLabelText(/Generate new seat number/i)).toBeDisabled();
  });

  it('calls setName when the full name input changes in registration mode', () => {
    const setName = vi.fn();
    render(<FanAuth {...baseProps} isRegistering={true} seatNumber="A-101" setName={setName} />);
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Lionel Messi' } });
    expect(setName).toHaveBeenCalledWith('Lionel Messi');
  });

  it('calls setPhone when phone input changes in registration mode', () => {
    const setPhone = vi.fn();
    render(<FanAuth {...baseProps} isRegistering={true} seatNumber="A-101" setPhone={setPhone} />);
    fireEvent.change(screen.getByLabelText(/Phone/i), { target: { value: '+55 11 99999-0000' } });
    expect(setPhone).toHaveBeenCalledWith('+55 11 99999-0000');
  });

  it('calls setCountry when country input changes in registration mode', () => {
    const setCountry = vi.fn();
    render(<FanAuth {...baseProps} isRegistering={true} seatNumber="A-101" setCountry={setCountry} />);
    fireEvent.change(screen.getByLabelText(/Country/i), { target: { value: 'Brazil' } });
    expect(setCountry).toHaveBeenCalledWith('Brazil');
  });

  it('calls setPreferredLanguage when language select changes in registration mode', () => {
    const setPreferredLanguage = vi.fn();
    render(<FanAuth {...baseProps} isRegistering={true} seatNumber="A-101" setPreferredLanguage={setPreferredLanguage} />);
    fireEvent.change(screen.getByLabelText(/Language/i), { target: { value: 'Spanish' } });
    expect(setPreferredLanguage).toHaveBeenCalledWith('Spanish');
  });

  it('calls setFavoriteTeam when favorite team input changes in registration mode', () => {
    const setFavoriteTeam = vi.fn();
    render(<FanAuth {...baseProps} isRegistering={true} seatNumber="A-101" setFavoriteTeam={setFavoriteTeam} />);
    fireEvent.change(screen.getByLabelText(/Favorite Team/i), { target: { value: 'Brazil' } });
    expect(setFavoriteTeam).toHaveBeenCalledWith('Brazil');
  });

  it('shows "Already registered? Login instead" toggle link in registration mode', () => {
    render(<FanAuth {...baseProps} isRegistering={true} seatNumber="A-101" />);
    expect(screen.getByText(/Already registered\? Login instead/i)).toBeInTheDocument();
  });

  it('calls setPassword when password input changes', () => {
    const setPassword = vi.fn();
    render(<FanAuth {...baseProps} setPassword={setPassword} />);
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'newpass99' } });
    expect(setPassword).toHaveBeenCalledWith('newpass99');
  });
});
