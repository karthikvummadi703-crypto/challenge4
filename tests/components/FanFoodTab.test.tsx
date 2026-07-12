// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const { default: FanFoodTab } = await import('../../src/components/fan/FanFoodTab');

describe('FanFoodTab', () => {
  const defaultProps = {
    seatNumber: 'A-101',
    cart: {},
    onUpdateCartQty: vi.fn(),
    onPlaceOrder: vi.fn(),
    orderSuccess: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with typical props', () => {
    render(<FanFoodTab {...defaultProps} />);
    expect(screen.getByText('In-Seat Catering')).toBeInTheDocument();
    expect(screen.getByText(/Delivered directly to seat/)).toBeInTheDocument();
    expect(screen.getByText('A-101')).toBeInTheDocument();
    expect(screen.getByText('Veg Burger')).toBeInTheDocument();
    expect(screen.getByText('Chicken Burger')).toBeInTheDocument();
    expect(screen.getByText('French Fries')).toBeInTheDocument();
    expect(screen.getByText('Coke')).toBeInTheDocument();
  });

  it('renders empty cart state correctly', () => {
    render(<FanFoodTab {...defaultProps} cart={{}} />);
    expect(screen.getByText(/Your catering tray is empty/)).toBeInTheDocument();
    expect(screen.getByText('$0.00')).toBeInTheDocument();
  });

  it('renders cart items when cart has quantities', () => {
    const cart = { 'item-1': 2, 'item-3': 1 };
    render(<FanFoodTab {...defaultProps} cart={cart} />);
    // Both appear in menu and cart — use getAllByText
    expect(screen.getAllByText(/Veg Burger/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/French Fries/).length).toBeGreaterThanOrEqual(1);
    // Total: 2*6.99 + 1*3.49 = 17.47
    expect(screen.getByText('$17.47')).toBeInTheDocument();
  });

  it('shows order success message when orderSuccess is true', () => {
    render(<FanFoodTab {...defaultProps} orderSuccess={true} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/Order Placed/)).toBeInTheDocument();
  });

  it('does not show success message when orderSuccess is false', () => {
    render(<FanFoodTab {...defaultProps} orderSuccess={false} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('calls onUpdateCartQty with correct args when Add button clicked', () => {
    const onUpdateCartQty = vi.fn();
    render(<FanFoodTab {...defaultProps} onUpdateCartQty={onUpdateCartQty} />);
    fireEvent.click(screen.getByRole('button', { name: /Add one Veg Burger/i }));
    expect(onUpdateCartQty).toHaveBeenCalledTimes(1);
    expect(onUpdateCartQty).toHaveBeenCalledWith('item-1', 1);
  });

  it('calls onUpdateCartQty with -1 when Remove button clicked', () => {
    const onUpdateCartQty = vi.fn();
    render(<FanFoodTab {...defaultProps} cart={{ 'item-2': 1 }} onUpdateCartQty={onUpdateCartQty} />);
    fireEvent.click(screen.getByRole('button', { name: /Remove one Chicken Burger/i }));
    expect(onUpdateCartQty).toHaveBeenCalledWith('item-2', -1);
  });

  it('calls onPlaceOrder when form is submitted', () => {
    const onPlaceOrder = vi.fn((e) => e.preventDefault());
    const cart = { 'item-1': 1 };
    render(<FanFoodTab {...defaultProps} cart={cart} onPlaceOrder={onPlaceOrder} />);
    fireEvent.submit(screen.getByRole('button', { name: /Place Catering Order/i }).closest('form')!);
    expect(onPlaceOrder).toHaveBeenCalledTimes(1);
  });

  it('disables submit button when cart is empty', () => {
    render(<FanFoodTab {...defaultProps} cart={{}} />);
    expect(screen.getByRole('button', { name: /Place Catering Order/i })).toBeDisabled();
  });

  it('enables submit button when cart has items', () => {
    render(<FanFoodTab {...defaultProps} cart={{ 'item-1': 1 }} />);
    expect(screen.getByRole('button', { name: /Place Catering Order/i })).not.toBeDisabled();
  });
});
