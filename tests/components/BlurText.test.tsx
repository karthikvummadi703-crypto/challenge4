// @vitest-environment jsdom
/**
 * Tests for BlurText — animated word/letter reveal component.
 *
 * Covers: word-split rendering, letter-split rendering, IntersectionObserver
 * wiring, direction variants, custom animation props, and edge cases.
 *
 * IntersectionObserver is not available in jsdom, so we install a class-based
 * mock (not a vi.fn() — vi.fn() is not constructable in some environments).
 * The vi.fn() spies are called *from* the class so we can assert on calls.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

// ── Mock motion/react (motion.span) ──────────────────────────────────────────
vi.mock('motion/react', () => ({
  motion: {
    span: ({
      children,
      className,
      initial: _i,
      animate: _a,
      transition: _t,
      onAnimationComplete,
      ...rest
    }: React.HTMLAttributes<HTMLSpanElement> & {
      children?: React.ReactNode;
      initial?: unknown;
      animate?: unknown;
      transition?: unknown;
      onAnimationComplete?: () => void;
    }) => (
      <span className={className} onTransitionEnd={onAnimationComplete} {...rest}>
        {children}
      </span>
    ),
  },
}));

// ── IntersectionObserver mock ─────────────────────────────────────────────────
// vi.fn() is not reliably constructable in jsdom — use a real class instead,
// and have class methods delegate to vi.fn() spies so we can assert on calls.
type IOCallback = (
  entries: Partial<IntersectionObserverEntry>[],
  observer: Partial<IntersectionObserver>
) => void;

let capturedIOCallback: IOCallback | null = null;
let capturedIOTarget: Element | null = null;
let capturedIOOptions: IntersectionObserverInit | undefined;

const mockObserve    = vi.fn((el: Element) => { capturedIOTarget = el; });
const mockUnobserve  = vi.fn();
const mockDisconnect = vi.fn();
let constructCount   = 0;

class FakeIntersectionObserver {
  constructor(cb: IOCallback, options?: IntersectionObserverInit) {
    constructCount++;
    capturedIOCallback = cb;
    capturedIOOptions  = options;
  }
  observe(el: Element)  { mockObserve(el); }
  unobserve(el: Element) { mockUnobserve(el); }
  disconnect()          { mockDisconnect(); }
}

// Install before any imports that trigger the hook
Object.defineProperty(globalThis, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: FakeIntersectionObserver,
});

beforeEach(() => {
  vi.clearAllMocks();
  capturedIOCallback = null;
  capturedIOTarget   = null;
  capturedIOOptions  = undefined;
  constructCount     = 0;
});

// Dynamic import AFTER mocks are registered
const { default: BlurText } = await import('../../src/components/BlurText');

// ── helper — simulate element scrolling into view ─────────────────────────────
function triggerIntersection(isIntersecting = true) {
  act(() => {
    capturedIOCallback?.(
      [{ isIntersecting, target: capturedIOTarget ?? undefined }],
      {} as IntersectionObserver
    );
  });
}

// ── tests ─────────────────────────────────────────────────────────────────────
describe('BlurText — word rendering (animateBy="words")', () => {
  it('renders each word as a separate span', () => {
    render(<BlurText text="Hello World Test" animateBy="words" />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('World')).toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('renders a single word without error', () => {
    render(<BlurText text="Solo" animateBy="words" />);
    expect(screen.getByText('Solo')).toBeInTheDocument();
  });

  it('renders an empty string without throwing', () => {
    expect(() => render(<BlurText text="" animateBy="words" />)).not.toThrow();
  });
});

describe('BlurText — letter rendering (animateBy="letters")', () => {
  it('renders each character as a separate span', () => {
    render(<BlurText text="Hi" animateBy="letters" />);
    expect(screen.getByText('H')).toBeInTheDocument();
    expect(screen.getByText('i')).toBeInTheDocument();
  });

  it('renders a three-letter word as individual spans', () => {
    render(<BlurText text="ABC" animateBy="letters" />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
  });
});

describe('BlurText — IntersectionObserver wiring', () => {
  it('creates an IntersectionObserver on mount', () => {
    render(<BlurText text="Observe" />);
    expect(constructCount).toBe(1);
    expect(mockObserve).toHaveBeenCalledTimes(1);
  });

  it('passes threshold and rootMargin to the observer', () => {
    render(<BlurText text="Threshold" threshold={0.5} rootMargin="10px" />);
    expect(capturedIOOptions).toEqual({ threshold: 0.5, rootMargin: '10px' });
  });

  it('calls unobserve after the element comes into view', () => {
    render(<BlurText text="InView" />);
    triggerIntersection(true);
    expect(mockUnobserve).toHaveBeenCalledTimes(1);
  });

  it('does NOT call unobserve if element is not intersecting', () => {
    render(<BlurText text="OutOfView" />);
    triggerIntersection(false);
    expect(mockUnobserve).not.toHaveBeenCalled();
  });

  it('disconnects the observer on unmount', () => {
    const { unmount } = render(<BlurText text="Unmount" />);
    unmount();
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('sets the paragraph element as the observed target', () => {
    const { container } = render(<BlurText text="Target" />);
    const p = container.querySelector('p');
    expect(capturedIOTarget).toBe(p);
  });
});

describe('BlurText — className and direction props', () => {
  it('applies className to the wrapper paragraph', () => {
    const { container } = render(<BlurText text="Styled" className="my-custom-class" />);
    expect(container.querySelector('p.my-custom-class')).not.toBeNull();
  });

  it('renders with direction="top" without error', () => {
    render(<BlurText text="TopDir" direction="top" />);
    expect(screen.getByText('TopDir')).toBeInTheDocument();
  });

  it('renders with direction="bottom" without error', () => {
    render(<BlurText text="BottomDir" direction="bottom" />);
    expect(screen.getByText('BottomDir')).toBeInTheDocument();
  });

  it('re-renders correctly when direction changes', () => {
    const { rerender } = render(<BlurText text="Dir" direction="top" />);
    rerender(<BlurText text="Dir" direction="bottom" />);
    expect(screen.getByText('Dir')).toBeInTheDocument();
  });
});

describe('BlurText — custom animation props', () => {
  it('accepts custom animationFrom without throwing', () => {
    const from = { filter: 'blur(0px)', opacity: 0, y: 0 };
    render(<BlurText text="Custom" animationFrom={from} />);
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });

  it('accepts custom animationTo without throwing', () => {
    const to = [{ filter: 'blur(0px)', opacity: 1, y: 0 }];
    render(<BlurText text="To" animationTo={to} />);
    expect(screen.getByText('To')).toBeInTheDocument();
  });

  it('accepts a custom easing function', () => {
    const easing = (t: number) => t * t;
    render(<BlurText text="Ease" easing={easing} />);
    expect(screen.getByText('Ease')).toBeInTheDocument();
  });

  it('accepts custom stepDuration', () => {
    render(<BlurText text="Step" stepDuration={0.5} />);
    expect(screen.getByText('Step')).toBeInTheDocument();
  });

  it('accepts custom delay prop', () => {
    render(<BlurText text="Delay" delay={50} />);
    expect(screen.getByText('Delay')).toBeInTheDocument();
  });

  it('accepts all custom animation props together', () => {
    render(
      <BlurText
        text="Full"
        animateBy="letters"
        direction="bottom"
        delay={30}
        stepDuration={0.2}
        threshold={0.3}
        rootMargin="5px"
        animationFrom={{ filter: 'blur(4px)', opacity: 0, y: 20 }}
        animationTo={[{ filter: 'blur(0px)', opacity: 1, y: 0 }]}
        easing={(t) => t}
        className="test-class"
      />
    );
    expect(screen.getByText('F')).toBeInTheDocument();
  });
});

describe('BlurText — onAnimationComplete', () => {
  it('accepts onAnimationComplete without throwing', () => {
    const onComplete = vi.fn();
    render(<BlurText text="Done" animateBy="words" onAnimationComplete={onComplete} />);
    expect(screen.getByText('Done')).toBeInTheDocument();
  });
});
