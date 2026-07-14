// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ── Suppress framer-motion animations in tests ────────────────────────────────
vi.mock('framer-motion', () => ({
  motion: {
    button: ({ children, onClick, className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) =>
      <button onClick={onClick} className={className} {...rest}>{children}</button>,
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) =>
      <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

// ── Antigravity uses WebGL/Three.js — stub it out in jsdom ───────────────────
vi.mock('../../src/components/Antigravity', () => ({
  default: () => <canvas data-testid="antigravity-stub" />,
}));

const { default: LandingPage } = await import('../../src/components/LandingPage');

const defaultProps = {
  onSelectRole: vi.fn(),
  onEnterDemo: vi.fn(),
  stadiumBg: '/fake-stadium.jpg',
  ronaldoConcept: '/fake-ronaldo.jpg',
};

describe('LandingPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the NEXUS AI brand name', () => {
    render(<LandingPage {...defaultProps} />);
    expect(screen.getByText('NEXUS')).toBeInTheDocument();
    expect(screen.getByText('AI')).toBeInTheDocument();
  });

  it('renders the FIFA World Cup 2026 badge', () => {
    render(<LandingPage {...defaultProps} />);
    // Multiple elements can contain this text; verify at least one exists
    const badges = screen.getAllByText(/FIFA WORLD CUP 2026/i);
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it('renders the three login buttons', () => {
    render(<LandingPage {...defaultProps} />);
    expect(screen.getByText('ORGANIZER LOGIN')).toBeInTheDocument();
    expect(screen.getByText('VOLUNTEER LOGIN')).toBeInTheDocument();
    expect(screen.getByText('FAN PORTAL')).toBeInTheDocument();
  });

  it('calls onSelectRole("organizer") when organizer button is clicked', () => {
    render(<LandingPage {...defaultProps} />);
    fireEvent.click(screen.getByText('ORGANIZER LOGIN'));
    expect(defaultProps.onSelectRole).toHaveBeenCalledWith('organizer');
  });

  it('calls onSelectRole("volunteer") when volunteer button is clicked', () => {
    render(<LandingPage {...defaultProps} />);
    fireEvent.click(screen.getByText('VOLUNTEER LOGIN'));
    expect(defaultProps.onSelectRole).toHaveBeenCalledWith('volunteer');
  });

  it('calls onSelectRole("fan") when fan portal button is clicked', () => {
    render(<LandingPage {...defaultProps} />);
    fireEvent.click(screen.getByText('FAN PORTAL'));
    expect(defaultProps.onSelectRole).toHaveBeenCalledWith('fan');
  });

  it('renders the "Try Demo Mode" button', () => {
    render(<LandingPage {...defaultProps} />);
    expect(screen.getByText(/try demo mode/i)).toBeInTheDocument();
  });

  it('opens the demo role picker when "Try Demo Mode" is clicked', () => {
    render(<LandingPage {...defaultProps} />);
    fireEvent.click(screen.getByText(/try demo mode/i));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Try Demo Mode', { selector: '#demo-picker-title' })).toBeInTheDocument();
  });

  it('shows all three demo role options in the picker', () => {
    render(<LandingPage {...defaultProps} />);
    fireEvent.click(screen.getByText(/try demo mode/i));
    expect(screen.getByText('Organizer Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Volunteer Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Fan Portal')).toBeInTheDocument();
  });

  it('calls onEnterDemo("organizer") when organizer demo is chosen', () => {
    render(<LandingPage {...defaultProps} />);
    fireEvent.click(screen.getByText(/try demo mode/i));
    fireEvent.click(screen.getByText('Organizer Dashboard'));
    expect(defaultProps.onEnterDemo).toHaveBeenCalledWith('organizer');
  });

  it('calls onEnterDemo("volunteer") when volunteer demo is chosen', () => {
    render(<LandingPage {...defaultProps} />);
    fireEvent.click(screen.getByText(/try demo mode/i));
    fireEvent.click(screen.getByText('Volunteer Dashboard'));
    expect(defaultProps.onEnterDemo).toHaveBeenCalledWith('volunteer');
  });

  it('calls onEnterDemo("fan") when fan demo is chosen', () => {
    render(<LandingPage {...defaultProps} />);
    fireEvent.click(screen.getByText(/try demo mode/i));
    fireEvent.click(screen.getByText('Fan Portal'));
    expect(defaultProps.onEnterDemo).toHaveBeenCalledWith('fan');
  });

  it('closes the demo picker when the X button is clicked', () => {
    render(<LandingPage {...defaultProps} />);
    fireEvent.click(screen.getByText(/try demo mode/i));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /close demo mode picker/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the hero heading', () => {
    render(<LandingPage {...defaultProps} />);
    expect(screen.getByText(/stadium operations/i)).toBeInTheDocument();
  });

  it('renders the three operational step badges', () => {
    render(<LandingPage {...defaultProps} />);
    expect(screen.getByText('01. ORCHESTRATE')).toBeInTheDocument();
    expect(screen.getByText('02. DISPATCH')).toBeInTheDocument();
    expect(screen.getByText('03. ENGAGE')).toBeInTheDocument();
  });

  it('renders the stadium background image as decorative (aria-hidden, empty alt)', () => {
    const { container } = render(<LandingPage {...defaultProps} />);
    // Background image is purely decorative (opacity-15 blurred backdrop) —
    // it must have alt="" and aria-hidden="true" so screen readers skip it.
    const bgImg = container.querySelector('img[aria-hidden="true"]');
    expect(bgImg).toBeInTheDocument();
    expect(bgImg).toHaveAttribute('alt', '');
  });

  it('renders the footer', () => {
    render(<LandingPage {...defaultProps} />);
    expect(screen.getByText(/© 2026 NEXUS AI/i)).toBeInTheDocument();
  });

  it('the demo picker dialog has aria-modal="true"', () => {
    render(<LandingPage {...defaultProps} />);
    fireEvent.click(screen.getByText(/try demo mode/i));
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('closes the demo picker when the backdrop overlay is clicked (line 233)', () => {
    render(<LandingPage {...defaultProps} />);
    fireEvent.click(screen.getByText(/try demo mode/i));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // The outer motion.div (rendered as a plain div) has onClick=setShowDemoPicker(false).
    // The inner dialog has onClick=stopPropagation, so clicking the parent directly
    // (not the dialog itself) fires the close handler without propagation interference.
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog.parentElement!);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
