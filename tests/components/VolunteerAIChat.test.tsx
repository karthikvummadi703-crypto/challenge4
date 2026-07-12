// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// ── Mock framer-motion ────────────────────────────────────────────────────────
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) =>
      <div {...props}>{children}</div>,
    button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) =>
      <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

// ── Mock apiClient (sendAICommand is defined but not called by VolunteerAIChat) ─
vi.mock('../../src/services/apiClient', () => ({
  sendAICommand: vi.fn().mockResolvedValue({ response: 'Mocked AI reply', source: 'mock' }),
  authedFetch: vi.fn(),
}));

const { default: VolunteerAIChat } = await import('../../src/components/volunteer/VolunteerAIChat');

describe('VolunteerAIChat', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders the toggle button with correct aria-label when closed', () => {
    render(<VolunteerAIChat />);
    expect(screen.getByRole('button', { name: /open route guide assistant/i })).toBeInTheDocument();
  });

  it('does not show the chat panel when initially closed', () => {
    render(<VolunteerAIChat />);
    expect(screen.queryByText(/tunnel navigator ai/i)).not.toBeInTheDocument();
  });

  it('opens the chat panel when toggle button is clicked', () => {
    render(<VolunteerAIChat />);
    fireEvent.click(screen.getByRole('button', { name: /open route guide assistant/i }));
    expect(screen.getByText(/tunnel navigator ai/i)).toBeInTheDocument();
  });

  it('shows the initial AI greeting message in the chat', () => {
    render(<VolunteerAIChat />);
    fireEvent.click(screen.getByRole('button', { name: /open route guide assistant/i }));
    expect(screen.getByText(/hello! i am nexus ai/i)).toBeInTheDocument();
  });

  it('closes the chat panel when the toggle button is clicked again', () => {
    render(<VolunteerAIChat />);
    fireEvent.click(screen.getByRole('button', { name: /open route guide assistant/i }));
    expect(screen.getByText(/tunnel navigator ai/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /close route guide assistant/i }));
    expect(screen.queryByText(/tunnel navigator ai/i)).not.toBeInTheDocument();
  });

  it('fills input when a shortcut button is clicked', () => {
    render(<VolunteerAIChat />);
    fireEvent.click(screen.getByRole('button', { name: /open route guide assistant/i }));
    fireEvent.click(screen.getByText('Tunnel guide'));
    expect(screen.getByLabelText(/ask route guide/i)).toHaveValue('Tunnel guide');
  });

  it('sends a message and shows a local AI reply after timeout', async () => {
    vi.useFakeTimers();
    render(<VolunteerAIChat />);
    fireEvent.click(screen.getByRole('button', { name: /open route guide assistant/i }));

    fireEvent.change(screen.getByLabelText(/ask route guide/i), { target: { value: 'Which route?' } });
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    // The user message should appear immediately
    expect(screen.getByText('Which route?')).toBeInTheDocument();

    // After the 600ms timeout the AI reply should appear
    await act(async () => { vi.advanceTimersByTime(700); });
    expect(screen.getByText(/avoid tunnel c4/i)).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('does not send an empty message (input required)', () => {
    render(<VolunteerAIChat />);
    fireEvent.click(screen.getByRole('button', { name: /open route guide assistant/i }));
    // input starts empty — submit is prevented by trim check; only initial AI log should exist
    const form = screen.getByLabelText(/ask route guide/i).closest('form')!;
    fireEvent.submit(form);
    // Chat logs should only contain the single initial greeting
    const messages = screen.getAllByText(/hello! i am nexus ai/i);
    expect(messages).toHaveLength(1);
  });
});
