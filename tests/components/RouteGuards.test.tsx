// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// ── Mock authContext so guards work without a real Firebase session ────────────
const mockUseAuth = vi.fn();
vi.mock('../../src/context/authContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Import after mocks.
const {
  RequireAuth,
  RequireAdmin,
  RequireVolunteer,
  RequireFan,
} = await import('../../src/components/RouteGuards');

const Protected = () => <div>Protected content</div>;

// ─────────────────────────────────────────────────────────────────────────────
describe('RequireAuth', () => {
  it('shows a loading indicator while auth state is being determined', () => {
    mockUseAuth.mockReturnValue({ user: null, role: null, loading: true });
    render(<RequireAuth><Protected /></RequireAuth>);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/restoring login session/i)).toBeInTheDocument();
  });

  it('renders children when a user is authenticated', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, role: 'fan', loading: false });
    render(<RequireAuth><Protected /></RequireAuth>);
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  it('renders the access-denied screen when no user is present', () => {
    mockUseAuth.mockReturnValue({ user: null, role: null, loading: false });
    render(<RequireAuth><Protected /></RequireAuth>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/authentication required/i)).toBeInTheDocument();
  });

  it('renders a custom fallback when provided and no user is present', () => {
    mockUseAuth.mockReturnValue({ user: null, role: null, loading: false });
    render(
      <RequireAuth fallback={<p>Please log in</p>}>
        <Protected />
      </RequireAuth>
    );
    expect(screen.getByText('Please log in')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('loading state has aria-busy="true"', () => {
    mockUseAuth.mockReturnValue({ user: null, role: null, loading: true });
    render(<RequireAuth><Protected /></RequireAuth>);
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('RequireAdmin', () => {
  it('shows a loading indicator while verifying admin access', () => {
    mockUseAuth.mockReturnValue({ user: null, role: null, loading: true });
    render(<RequireAdmin><Protected /></RequireAdmin>);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/verifying admin access/i)).toBeInTheDocument();
  });

  it('renders children when the user has the admin role', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'a1' }, role: 'admin', loading: false });
    render(<RequireAdmin><Protected /></RequireAdmin>);
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  it('renders access-denied for a volunteer user', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'v1' }, role: 'volunteer', loading: false });
    render(<RequireAdmin><Protected /></RequireAdmin>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/access denied.*admin/i)).toBeInTheDocument();
  });

  it('renders access-denied for a fan user', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'f1' }, role: 'fan', loading: false });
    render(<RequireAdmin><Protected /></RequireAdmin>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders access-denied when role is null', () => {
    mockUseAuth.mockReturnValue({ user: null, role: null, loading: false });
    render(<RequireAdmin><Protected /></RequireAdmin>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders a custom fallback for non-admin', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'v1' }, role: 'volunteer', loading: false });
    render(
      <RequireAdmin fallback={<p>Admins only</p>}>
        <Protected />
      </RequireAdmin>
    );
    expect(screen.getByText('Admins only')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('RequireVolunteer', () => {
  it('renders children when the user has the volunteer role', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'v1' }, role: 'volunteer', loading: false });
    render(<RequireVolunteer><Protected /></RequireVolunteer>);
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  it('shows loading state with aria-busy', () => {
    mockUseAuth.mockReturnValue({ user: null, role: null, loading: true });
    render(<RequireVolunteer><Protected /></RequireVolunteer>);
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
  });

  it('renders access-denied for an admin user', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'a1' }, role: 'admin', loading: false });
    render(<RequireVolunteer><Protected /></RequireVolunteer>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/volunteer only/i)).toBeInTheDocument();
  });

  it('renders access-denied for a fan user', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'f1' }, role: 'fan', loading: false });
    render(<RequireVolunteer><Protected /></RequireVolunteer>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders a custom fallback for non-volunteer', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'f1' }, role: 'fan', loading: false });
    render(
      <RequireVolunteer fallback={<p>Volunteers only</p>}>
        <Protected />
      </RequireVolunteer>
    );
    expect(screen.getByText('Volunteers only')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('RequireFan', () => {
  it('renders children when the user has the fan role', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'f1' }, role: 'fan', loading: false });
    render(<RequireFan><Protected /></RequireFan>);
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseAuth.mockReturnValue({ user: null, role: null, loading: true });
    render(<RequireFan><Protected /></RequireFan>);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/verifying fan access/i)).toBeInTheDocument();
  });

  it('renders access-denied for a volunteer user', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'v1' }, role: 'volunteer', loading: false });
    render(<RequireFan><Protected /></RequireFan>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/fan only/i)).toBeInTheDocument();
  });

  it('renders a custom fallback for non-fan', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'v1' }, role: 'volunteer', loading: false });
    render(
      <RequireFan fallback={<p>Fans only</p>}>
        <Protected />
      </RequireFan>
    );
    expect(screen.getByText('Fans only')).toBeInTheDocument();
  });
});
