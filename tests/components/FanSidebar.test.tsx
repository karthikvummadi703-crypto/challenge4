// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const { default: FanSidebar } = await import('../../src/components/fan/FanSidebar');

describe('FanSidebar', () => {
  const defaultProps = {
    activeTab: 'dashboard' as const,
    onTabChange: vi.fn(),
    onLogout: vi.fn(),
    userName: 'John Doe',
    seatNumber: 'A-101',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with typical props', () => {
    render(<FanSidebar {...defaultProps} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText(/SEAT: A-101/)).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Food Ordering')).toBeInTheDocument();
    expect(screen.getByText('Medical Help')).toBeInTheDocument();
    expect(screen.getByText('Report Issue')).toBeInTheDocument();
  });

  it('renders user initial avatar', () => {
    render(<FanSidebar {...defaultProps} userName="Alice" />);
    expect(screen.getByText('A', { selector: '[aria-hidden="true"]' })).toBeInTheDocument();
  });

  it('shows "?" avatar when userName is empty', () => {
    render(<FanSidebar {...defaultProps} userName="" />);
    expect(screen.getByText('?', { selector: '[aria-hidden="true"]' })).toBeInTheDocument();
  });

  it('marks the active tab with aria-current="page"', () => {
    render(<FanSidebar {...defaultProps} activeTab="food" />);
    const foodBtn = screen.getByRole('button', { name: /Food Ordering/i });
    expect(foodBtn).toHaveAttribute('aria-current', 'page');
  });

  it('does not mark inactive tabs with aria-current', () => {
    render(<FanSidebar {...defaultProps} activeTab="dashboard" />);
    const foodBtn = screen.getByRole('button', { name: /Food Ordering/i });
    expect(foodBtn).not.toHaveAttribute('aria-current', 'page');
  });

  it('calls onTabChange with correct tab when nav button is clicked', () => {
    const onTabChange = vi.fn();
    render(<FanSidebar {...defaultProps} onTabChange={onTabChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Medical Help/i }));
    expect(onTabChange).toHaveBeenCalledTimes(1);
    expect(onTabChange).toHaveBeenCalledWith('medical');
  });

  it('calls onTabChange with "issue" when Report Issue is clicked', () => {
    const onTabChange = vi.fn();
    render(<FanSidebar {...defaultProps} onTabChange={onTabChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Report Issue/i }));
    expect(onTabChange).toHaveBeenCalledWith('issue');
  });

  it('calls onLogout when Leave Fan Pass button is clicked', () => {
    const onLogout = vi.fn();
    render(<FanSidebar {...defaultProps} onLogout={onLogout} />);
    fireEvent.click(screen.getByRole('button', { name: /Leave Fan Pass/i }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('renders navigation landmark', () => {
    render(<FanSidebar {...defaultProps} />);
    expect(screen.getByRole('navigation', { name: /Fan dashboard navigation/i })).toBeInTheDocument();
  });
});
