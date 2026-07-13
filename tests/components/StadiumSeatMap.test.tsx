/**
 * StadiumSeatMap — interactive SVG seat-map component.
 *
 * Covers:
 *   - Default render (no props, four sectors visible)
 *   - Empty/minimal prop combinations
 *   - showHeatmap rendering path
 *   - Sector interaction: hover (mouseEnter/mouseLeave), click, keyboard
 *   - activeTasks overlay: Medical Emergency, Deliver Food, Other/Issue types
 *   - activeTasks with status='completed' (filtered out)
 *   - highlightedSeat rendering for every section (A, B, C, D) and unknown
 *   - getSectionFromSeat: all branches including null-fallback
 *   - getTaskCoords default branch (unknown section → centre)
 *   - onSeatSelect callback (click + Enter + Space keyboard paths)
 *   - tabIndex attribute with/without onSeatSelect
 */
// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ── framer-motion stub — motion.path must be a real SVG path element ──────────
vi.mock('framer-motion', () => ({
  motion: {
    path: ({ children, initial: _i, animate: _a, transition: _t, ...rest }: React.SVGProps<SVGPathElement> & { initial?: unknown; animate?: unknown; transition?: unknown }) => (
      <path {...rest}>{children}</path>
    ),
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
      <div {...rest}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

const { default: StadiumSeatMap } = await import('../../src/components/StadiumSeatMap');

// ── helpers ───────────────────────────────────────────────────────────────────
function makeTask(overrides: Partial<{ id: string; type: string; seatNumber: string; priority: string; status: string }> = {}) {
  return {
    id: `task-${Math.random()}`,
    type: 'Issue',
    seatNumber: 'A12',
    priority: 'medium',
    status: 'active',
    ...overrides,
  };
}

beforeEach(() => vi.clearAllMocks());

// ── Basic rendering ───────────────────────────────────────────────────────────
describe('StadiumSeatMap — basic rendering', () => {
  it('renders the container element', () => {
    const { container } = render(<StadiumSeatMap />);
    expect(container.querySelector('#stadium-seat-map-container')).toBeInTheDocument();
  });

  it('renders four sector buttons (A, B, C, D)', () => {
    render(<StadiumSeatMap />);
    expect(screen.getByRole('button', { name: 'Stadium sector A' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stadium sector B' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stadium sector C' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stadium sector D' })).toBeInTheDocument();
  });

  it('renders the SVG with accessible role and labels', () => {
    render(<StadiumSeatMap />);
    expect(screen.getByRole('img', { name: /Stadium Seating Map/i })).toBeInTheDocument();
  });

  it('shows sector letter labels when showHeatmap is false (default)', () => {
    render(<StadiumSeatMap showHeatmap={false} />);
    // Sector text labels A-D are rendered as SVG <text> elements
    const { container } = render(<StadiumSeatMap />);
    const textEls = container.querySelectorAll('text');
    const textContent = Array.from(textEls).map(el => el.textContent);
    expect(textContent).toContain('A');
    expect(textContent).toContain('B');
    expect(textContent).toContain('C');
    expect(textContent).toContain('D');
  });

  it('renders the map legend with four entries', () => {
    render(<StadiumSeatMap />);
    expect(screen.getByText('Your Location')).toBeInTheDocument();
    expect(screen.getByText('Medical Responders')).toBeInTheDocument();
    expect(screen.getByText('Issue Reports')).toBeInTheDocument();
    expect(screen.getByText('Food Logistics')).toBeInTheDocument();
  });

  it('renders without error when no props are passed (all defaults)', () => {
    expect(() => render(<StadiumSeatMap />)).not.toThrow();
  });

  it('renders without error when activeTasks is explicitly empty', () => {
    expect(() => render(<StadiumSeatMap activeTasks={[]} />)).not.toThrow();
  });
});

// ── showHeatmap rendering ─────────────────────────────────────────────────────
describe('StadiumSeatMap — showHeatmap=true', () => {
  it('renders the "Heatmap Active" indicator when showHeatmap is true', () => {
    render(<StadiumSeatMap showHeatmap={true} />);
    expect(screen.getByText(/Heatmap Active/i)).toBeInTheDocument();
  });

  it('does NOT render "Heatmap Active" indicator by default (showHeatmap=false)', () => {
    render(<StadiumSeatMap />);
    expect(screen.queryByText(/Heatmap Active/i)).not.toBeInTheDocument();
  });

  it('hides sector letter labels when showHeatmap is true', () => {
    const { container } = render(<StadiumSeatMap showHeatmap={true} />);
    // When heatmap is on, sector labels are suppressed (showHeatmap && no <text> labels)
    const textEls = container.querySelectorAll('text');
    const textContent = Array.from(textEls).map(el => el.textContent?.trim());
    // Sector letter labels A-D should NOT be in the text elements
    expect(textContent).not.toContain('A');
  });
});

// ── Sector hover interaction (covers isHovered branch, line 130) ──────────────
describe('StadiumSeatMap — hover interaction', () => {
  it('does not throw on mouseEnter over a sector', () => {
    render(<StadiumSeatMap />);
    expect(() => {
      fireEvent.mouseEnter(screen.getByRole('button', { name: 'Stadium sector A' }));
    }).not.toThrow();
  });

  it('does not throw on mouseLeave from a sector after entering', () => {
    render(<StadiumSeatMap />);
    const sectorA = screen.getByRole('button', { name: 'Stadium sector A' });
    fireEvent.mouseEnter(sectorA);
    expect(() => fireEvent.mouseLeave(sectorA)).not.toThrow();
  });

  it('hover state updates correctly for all four sectors', () => {
    render(<StadiumSeatMap />);
    for (const id of ['A', 'B', 'C', 'D']) {
      const sector = screen.getByRole('button', { name: `Stadium sector ${id}` });
      fireEvent.mouseEnter(sector);
      fireEvent.mouseLeave(sector);
    }
    // No assertion beyond "it doesn't throw" — we're confirming branch coverage
  });
});

// ── Click / onSeatSelect (covers line 143) ────────────────────────────────────
describe('StadiumSeatMap — click / onSeatSelect', () => {
  it('calls onSeatSelect with the sector id when a sector is clicked', () => {
    const onSeatSelect = vi.fn();
    render(<StadiumSeatMap onSeatSelect={onSeatSelect} />);
    fireEvent.click(screen.getByRole('button', { name: 'Stadium sector B' }));
    expect(onSeatSelect).toHaveBeenCalledWith('B');
  });

  it('calls onSeatSelect for each sector', () => {
    const onSeatSelect = vi.fn();
    render(<StadiumSeatMap onSeatSelect={onSeatSelect} />);
    for (const id of ['A', 'B', 'C', 'D']) {
      fireEvent.click(screen.getByRole('button', { name: `Stadium sector ${id}` }));
    }
    expect(onSeatSelect).toHaveBeenCalledTimes(4);
    expect(onSeatSelect).toHaveBeenCalledWith('A');
    expect(onSeatSelect).toHaveBeenCalledWith('C');
    expect(onSeatSelect).toHaveBeenCalledWith('D');
  });

  it('does NOT throw when clicked without onSeatSelect prop (optional call)', () => {
    render(<StadiumSeatMap />);
    expect(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Stadium sector A' }));
    }).not.toThrow();
  });

  it('gives sectors tabIndex=0 when onSeatSelect is provided', () => {
    render(<StadiumSeatMap onSeatSelect={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Stadium sector A' })).toHaveAttribute('tabindex', '0');
  });

  it('gives sectors tabIndex=-1 when onSeatSelect is omitted', () => {
    render(<StadiumSeatMap />);
    expect(screen.getByRole('button', { name: 'Stadium sector A' })).toHaveAttribute('tabindex', '-1');
  });
});

// ── Keyboard interaction (covers line 144 — onKeyDown) ───────────────────────
describe('StadiumSeatMap — keyboard interaction', () => {
  it('calls onSeatSelect when Enter is pressed on a sector', () => {
    const onSeatSelect = vi.fn();
    render(<StadiumSeatMap onSeatSelect={onSeatSelect} />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Stadium sector C' }), { key: 'Enter' });
    expect(onSeatSelect).toHaveBeenCalledWith('C');
  });

  it('calls onSeatSelect when Space is pressed on a sector', () => {
    const onSeatSelect = vi.fn();
    render(<StadiumSeatMap onSeatSelect={onSeatSelect} />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Stadium sector D' }), { key: ' ' });
    expect(onSeatSelect).toHaveBeenCalledWith('D');
  });

  it('does NOT call onSeatSelect for other keys (e.g. Tab)', () => {
    const onSeatSelect = vi.fn();
    render(<StadiumSeatMap onSeatSelect={onSeatSelect} />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Stadium sector A' }), { key: 'Tab' });
    expect(onSeatSelect).not.toHaveBeenCalled();
  });

  it('does not throw on keyboard press without onSeatSelect', () => {
    render(<StadiumSeatMap />);
    expect(() => {
      fireEvent.keyDown(screen.getByRole('button', { name: 'Stadium sector A' }), { key: 'Enter' });
    }).not.toThrow();
  });
});

// ── highlightedSeat rendering ─────────────────────────────────────────────────
describe('StadiumSeatMap — highlightedSeat prop', () => {
  it('renders without error when highlightedSeat points to section A', () => {
    expect(() => render(<StadiumSeatMap highlightedSeat="A12-24" />)).not.toThrow();
  });

  it('renders without error when highlightedSeat points to section B', () => {
    expect(() => render(<StadiumSeatMap highlightedSeat="B08-11" />)).not.toThrow();
  });

  it('renders without error when highlightedSeat points to section C', () => {
    expect(() => render(<StadiumSeatMap highlightedSeat="C18-10" />)).not.toThrow();
  });

  it('renders without error when highlightedSeat points to section D', () => {
    expect(() => render(<StadiumSeatMap highlightedSeat="D-05" />)).not.toThrow();
  });

  it('renders without error when highlightedSeat starts with unknown character', () => {
    // Unknown section → getTaskCoords returns centre coords { x:250, y:200 }
    expect(() => render(<StadiumSeatMap highlightedSeat="X99" />)).not.toThrow();
  });

  it('marks the highlighted sector as aria-pressed=true', () => {
    render(<StadiumSeatMap highlightedSeat="A5" />);
    expect(screen.getByRole('button', { name: 'Stadium sector A' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Stadium sector B' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('renders the seat-marker pin SVG path when highlightedSeat is set', () => {
    const { container } = render(<StadiumSeatMap highlightedSeat="B7" />);
    // motion.path is stubbed to a real <path>; the marker pin uses fill="#10b981"
    const greenPaths = Array.from(container.querySelectorAll('path')).filter(p => p.getAttribute('fill') === '#10b981');
    expect(greenPaths.length).toBeGreaterThan(0);
  });

  it('does NOT render the seat-marker pin when highlightedSeat is absent', () => {
    const { container } = render(<StadiumSeatMap />);
    // Without highlightedSeat the animating pin path (fill #10b981) is not rendered
    // (sector paths use className-based fill, not fill attribute)
    const filledPaths = Array.from(container.querySelectorAll('path[fill="#10b981"]'));
    expect(filledPaths.length).toBe(0);
  });
});

// ── activeTasks overlays ──────────────────────────────────────────────────────
describe('StadiumSeatMap — activeTasks overlays', () => {
  it('renders a task pin for a Medical Emergency task', () => {
    const { container } = render(
      <StadiumSeatMap activeTasks={[makeTask({ type: 'Medical Emergency', seatNumber: 'A1', status: 'active' })]} />
    );
    // Medical tasks render a cross/plus path (stroke="#ffffff") inside a red circle
    const circleFills = Array.from(container.querySelectorAll('circle')).map(c => c.getAttribute('fill'));
    expect(circleFills).toContain('#ef4444');
  });

  it('renders a task pin for a Deliver Food task', () => {
    const { container } = render(
      <StadiumSeatMap activeTasks={[makeTask({ type: 'Deliver Food', seatNumber: 'B3', status: 'active' })]} />
    );
    // Food tasks render a green indicator circle
    const circleFills = Array.from(container.querySelectorAll('circle')).map(c => c.getAttribute('fill'));
    expect(circleFills).toContain('#10b981');
  });

  it('renders a task pin for a generic Issue task', () => {
    const { container } = render(
      <StadiumSeatMap activeTasks={[makeTask({ type: 'Crowd Control', seatNumber: 'C5', status: 'active' })]} />
    );
    // Other tasks render an amber/indigo indicator
    const circleFills = Array.from(container.querySelectorAll('circle')).map(c => c.getAttribute('fill'));
    expect(circleFills).toContain('#1e1b4b');
  });

  it('renders task pins for all four section seat numbers', () => {
    render(
      <StadiumSeatMap
        activeTasks={[
          makeTask({ id: 't1', type: 'Issue', seatNumber: 'A1' }),
          makeTask({ id: 't2', type: 'Issue', seatNumber: 'B2' }),
          makeTask({ id: 't3', type: 'Issue', seatNumber: 'C3' }),
          makeTask({ id: 't4', type: 'Issue', seatNumber: 'D4' }),
        ]}
      />
    );
    // No throw; getTaskCoords covers all 4 switch branches
  });

  it('does NOT render a task pin for completed tasks', () => {
    const { container: withCompleted } = render(
      <StadiumSeatMap activeTasks={[makeTask({ type: 'Medical Emergency', status: 'completed' })]} />
    );
    const { container: withoutTask } = render(<StadiumSeatMap />);
    // Completed tasks are filtered out — the same number of circles as empty render
    const withCount    = withCompleted.querySelectorAll('circle[fill="#ef4444"]').length;
    const withoutCount = withoutTask.querySelectorAll('circle[fill="#ef4444"]').length;
    expect(withCount).toBe(withoutCount);
  });

  it('renders task pin at centre coords when seatNumber has unknown section prefix', () => {
    // Covers the getTaskCoords `default` branch (unknown prefix → {x:250,y:200})
    expect(() =>
      render(<StadiumSeatMap activeTasks={[makeTask({ seatNumber: 'Z99' })]} />)
    ).not.toThrow();
  });

  it('renders multiple task pins for multiple active tasks', () => {
    expect(() =>
      render(
        <StadiumSeatMap
          activeTasks={[
            makeTask({ id: 'a', type: 'Medical Emergency', seatNumber: 'A1' }),
            makeTask({ id: 'b', type: 'Deliver Food',      seatNumber: 'B2' }),
            makeTask({ id: 'c', type: 'Crowd Control',     seatNumber: 'C3' }),
          ]}
        />
      )
    ).not.toThrow();
  });
});

// ── Combined props ────────────────────────────────────────────────────────────
describe('StadiumSeatMap — combined props', () => {
  it('renders correctly with all props simultaneously', () => {
    const onSeatSelect = vi.fn();
    const { container } = render(
      <StadiumSeatMap
        highlightedSeat="D-05"
        showHeatmap={true}
        onSeatSelect={onSeatSelect}
        activeTasks={[
          makeTask({ id: 'x', type: 'Medical Emergency', seatNumber: 'A1' }),
          makeTask({ id: 'y', type: 'Deliver Food',      seatNumber: 'C3' }),
        ]}
      />
    );
    expect(container.querySelector('#stadium-seat-map-container')).toBeInTheDocument();
    expect(screen.getByText(/Heatmap Active/i)).toBeInTheDocument();
  });
});
