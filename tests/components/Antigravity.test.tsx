// @vitest-environment jsdom
/**
 * Smoke tests for the Antigravity 3-D particle field component.
 *
 * The component uses @react-three/fiber and THREE.js.  We stub both so the
 * component can render in jsdom without a real WebGL context.  The Canvas
 * mock renders its children, giving us coverage of AntigravityInner's
 * useMemo and hook calls.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// ── @react-three/fiber stubs ──────────────────────────────────────────────────
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children, ...rest }: { children?: React.ReactNode; [k: string]: unknown }) => (
    <div data-testid="r3f-canvas" {...(rest as React.HTMLAttributes<HTMLDivElement>)}>
      {children}
    </div>
  ),
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({
    viewport: { width: 100, height: 80 },
    camera: {},
    gl: { domElement: document.createElement('canvas') },
    pointer: { x: 0, y: 0 },
    clock: { getElapsedTime: vi.fn(() => 0) },
  })),
}));

// ── three stubs ───────────────────────────────────────────────────────────────
vi.mock('three', () => {
  const Object3D = vi.fn().mockImplementation(function (this: Record<string, unknown>) {
    this.position      = { set: vi.fn() };
    this.rotation      = { set: vi.fn() };
    this.scale         = { set: vi.fn() };
    this.updateMatrix  = vi.fn();
    this.matrixAutoUpdate = true;
    this.matrix        = { elements: new Float32Array(16) };
  });
  const InstancedMesh = vi.fn().mockImplementation(function (this: Record<string, unknown>) {
    this.instanceMatrix = { needsUpdate: false };
    this.setMatrixAt    = vi.fn();
    this.count          = 0;
  });
  const Color = vi.fn().mockImplementation(function (this: Record<string, unknown>) {
    this.r = 1; this.g = 1; this.b = 1;
    this.set = vi.fn().mockReturnThis();
    this.setStyle = vi.fn().mockReturnThis();
  });
  const Vector3 = vi.fn().mockImplementation(function (this: Record<string, unknown>) {
    this.x = 0; this.y = 0; this.z = 0;
    this.set = vi.fn().mockReturnThis();
    this.copy = vi.fn().mockReturnThis();
    this.lerp = vi.fn().mockReturnThis();
    this.clone = vi.fn().mockReturnThis();
    this.length = vi.fn(() => 0);
    this.normalize = vi.fn().mockReturnThis();
    this.multiplyScalar = vi.fn().mockReturnThis();
    this.subVectors = vi.fn().mockReturnThis();
  });
  const MeshBasicMaterial = vi.fn().mockImplementation(function () { return {}; });
  const SphereGeometry    = vi.fn().mockImplementation(function () { return {}; });
  const AdditiveBlending  = 2;
  const FrontSide         = 0;

  return {
    Object3D, InstancedMesh, Color, Vector3,
    MeshBasicMaterial, SphereGeometry,
    AdditiveBlending, FrontSide,
  };
});

const { default: Antigravity } = await import('../../src/components/Antigravity');

describe('Antigravity', () => {
  it('renders an r3f Canvas wrapper without throwing', () => {
    render(<Antigravity />);
    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
  });

  it('renders with default props without error', () => {
    expect(() => render(<Antigravity />)).not.toThrow();
  });

  it('renders with explicit low particle count', () => {
    expect(() => render(<Antigravity count={10} />)).not.toThrow();
  });

  it('renders with autoAnimate=true without throwing', () => {
    expect(() => render(<Antigravity autoAnimate={true} count={5} />)).not.toThrow();
  });

  it('renders with custom color and size props', () => {
    expect(() =>
      render(<Antigravity color="#10b981" particleSize={2} magnetRadius={8} ringRadius={5} />)
    ).not.toThrow();
  });

  it('renders with all optional props specified', () => {
    expect(() =>
      render(
        <Antigravity
          count={20}
          magnetRadius={6}
          ringRadius={4}
          waveSpeed={0.2}
          waveAmplitude={0.5}
          particleSize={1.5}
          lerpSpeed={0.05}
          color="#ffffff"
          autoAnimate={false}
          particleVariance={0.8}
          rotationSpeed={0.01}
          depthFactor={1.2}
          pulseSpeed={2}
          particleShape="sphere"
          fieldStrength={8}
        />
      )
    ).not.toThrow();
  });
});
