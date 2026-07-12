// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const { default: OrganizerSidebar } = await import('../../src/components/organizer/OrganizerSidebar');

const defaultProps = {
  activeTab: 'dashboard' as const,
  onTabChange: vi.fn(),
  onOpenSettings: vi.fn(),
  onLogout: vi.fn(),
};

describe('OrganizerSidebar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders NEXUS AI brand', () => {
    render(<OrganizerSidebar {...defaultProps} />);
    expect(screen.getByText('NEXUS')).toBeInTheDocument();
    expect(screen.getByText('AI')).toBeInTheDocument();
  });

  it('renders all three nav tabs', () => {
    render(<OrganizerSidebar {...defaultProps} />);
    expect(screen.getByRole('button', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /match setup/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /volunteers/i })).toBeInTheDocument();
  });

  it('marks the active tab with aria-current="page"', () => {
    render(<OrganizerSidebar {...defaultProps} activeTab="setup" />);
    const setupBtn = screen.getByRole('button', { name: /match setup/i });
    expect(setupBtn).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: /dashboard/i })).not.toHaveAttribute('aria-current');
  });

  it('renders n8n Settings and Logout buttons', () => {
    render(<OrganizerSidebar {...defaultProps} />);
    expect(screen.getByRole('button', { name: /n8n settings/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logout panel/i })).toBeInTheDocument();
  });

  it('calls onTabChange with correct tab when nav button clicked', () => {
    const onTabChange = vi.fn();
    render(<OrganizerSidebar {...defaultProps} onTabChange={onTabChange} />);
    fireEvent.click(screen.getByRole('button', { name: /volunteers/i }));
    expect(onTabChange).toHaveBeenCalledWith('volunteers');
  });

  it('calls onTabChange with "setup" when Match Setup is clicked', () => {
    const onTabChange = vi.fn();
    render(<OrganizerSidebar {...defaultProps} onTabChange={onTabChange} />);
    fireEvent.click(screen.getByRole('button', { name: /match setup/i }));
    expect(onTabChange).toHaveBeenCalledWith('setup');
  });

  it('calls onOpenSettings when n8n Settings button is clicked', () => {
    const onOpenSettings = vi.fn();
    render(<OrganizerSidebar {...defaultProps} onOpenSettings={onOpenSettings} />);
    fireEvent.click(screen.getByRole('button', { name: /n8n settings/i }));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('calls onLogout when Logout Panel button is clicked', () => {
    const onLogout = vi.fn();
    render(<OrganizerSidebar {...defaultProps} onLogout={onLogout} />);
    fireEvent.click(screen.getByRole('button', { name: /logout panel/i }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('renders admin panel label', () => {
    render(<OrganizerSidebar {...defaultProps} />);
    expect(screen.getByText(/admin panel/i)).toBeInTheDocument();
  });
});
