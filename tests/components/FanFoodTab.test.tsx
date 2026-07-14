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

// ── Cart with unknown item ID (lines 31, 86) ──────────────────────────────────
// When the cart contains an ID that is not in FOOD_MENU:
//   line 31 — reduce fallback: `item ? price*qty : 0`  (covers the `: 0` branch)
//   line 86 — map early-return: `if (!item) return null`

describe('FanFoodTab — cart with unknown item id', () => {
  // Re-define props here so this describe is self-contained (defaultProps is
  // scoped to the sibling describe block above and not accessible here).
  const unknownItemProps = {
    cart: {},
    onUpdateCartQty: vi.fn(),
    onPlaceOrder: vi.fn((e: React.FormEvent) => e.preventDefault()),
    orderSuccess: false,
    isSubmitting: false,
    seatNumber: 'A-001',
  };

  it('shows $0.00 total when cart contains only an unknown item', () => {
    render(<FanFoodTab {...unknownItemProps} cart={{ 'unknown-item-99': 2 }} />);
    // Total must be $0.00 because the unknown id has no matching FOOD_MENU entry
    expect(screen.getByText('$0.00')).toBeInTheDocument();
  });

  it('does not render a cart row for an unknown item id (returns null)', () => {
    render(<FanFoodTab {...unknownItemProps} cart={{ 'unknown-item-99': 3 }} />);
    // No item name rendered for the unknown id
    expect(screen.queryByText(/unknown-item-99/)).not.toBeInTheDocument();
  });

  it('correctly calculates total when mixing a known and an unknown item', () => {
    // item-1 (Veg Burger $6.99) × 1 = $6.99
    // item-4 (Coke      $2.49) × 1 = $2.49
    // ghost-id (unknown)       × 5 = $0.00   ← line 31 `0` branch + line 86 null guard
    // Total = $9.48 — unique value not equal to any individual cart-row total,
    // so getByText finds exactly ONE element (the overall subtotal display).
    render(<FanFoodTab {...unknownItemProps} cart={{ 'item-1': 1, 'item-4': 1, 'ghost-id': 5 }} />);
    expect(screen.getByText('$9.48')).toBeInTheDocument();
  });
});
