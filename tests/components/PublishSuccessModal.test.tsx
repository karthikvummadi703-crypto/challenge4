// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(
      ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }, ref: React.Ref<HTMLDivElement>) =>
        <div ref={ref} {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

const { default: PublishSuccessModal } = await import('../../src/components/organizer/PublishSuccessModal');

const defaultProps = {
  visible: true,
  volunteerCount: 5,
  onClose: vi.fn(),
};

describe('PublishSuccessModal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders dialog when visible is true', () => {
    render(<PublishSuccessModal {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders the success title', () => {
    render(<PublishSuccessModal {...defaultProps} />);
    expect(screen.getByText(/event published successfully/i)).toBeInTheDocument();
  });

  it('renders the volunteer count in the checklist', () => {
    render(<PublishSuccessModal {...defaultProps} volunteerCount={12} />);
    expect(screen.getByText(/12\) are now active/i)).toBeInTheDocument();
  });

  it('renders "Go to Dashboard" button', () => {
    render(<PublishSuccessModal {...defaultProps} />);
    expect(screen.getByRole('button', { name: /go to dashboard/i })).toBeInTheDocument();
  });

  it('does not render dialog when visible is false', () => {
    render(<PublishSuccessModal {...defaultProps} visible={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onClose when "Go to Dashboard" button is clicked', () => {
    const onClose = vi.fn();
    render(<PublishSuccessModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /go to dashboard/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows all three checklist items', () => {
    render(<PublishSuccessModal {...defaultProps} />);
    expect(screen.getByText(/portugal vs argentina match is now live/i)).toBeInTheDocument();
    expect(screen.getByText(/ticket bookings are active/i)).toBeInTheDocument();
    expect(screen.getByText(/volunteer accounts/i)).toBeInTheDocument();
  });

  it('dialog has aria-modal attribute', () => {
    render(<PublishSuccessModal {...defaultProps} />);
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });
});
