import React, { ReactNode } from 'react';
import { useAuth } from '../context/authContext';
import { ShieldAlert, Loader2 } from 'lucide-react';

interface GuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const RequireAuth: React.FC<GuardProps> = ({ children, fallback }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Restoring login session"
        className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4"
      >
        <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" aria-hidden="true" />
        <p className="text-slate-400 font-mono text-sm uppercase tracking-widest">Restoring login session...</p>
      </div>
    );
  }

  if (!user) {
    if (fallback) return <>{fallback}</>;
    return (
      <div role="alert" className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="h-14 w-14 rounded-full bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center mx-auto shadow-lg" aria-hidden="true">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold uppercase tracking-wider text-white">Authentication Required</h2>
        <p className="text-xs text-slate-500 max-w-sm">Please sign in to your account to view this page.</p>
      </div>
    );
  }

  return <>{children}</>;
};

export const RequireAdmin: React.FC<GuardProps> = ({ children, fallback }) => {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Verifying Admin access"
        className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4"
      >
        <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" aria-hidden="true" />
        <p className="text-slate-400 font-mono text-sm uppercase tracking-widest">Verifying Admin access...</p>
      </div>
    );
  }

  if (role !== 'admin') {
    if (fallback) return <>{fallback}</>;
    return (
      <div role="alert" className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="h-14 w-14 rounded-full bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center mx-auto shadow-lg" aria-hidden="true">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold uppercase tracking-wider text-white">Access Denied (Admin Only)</h2>
        <p className="text-xs text-slate-500 max-w-sm">You do not have the necessary permissions to access the Organizer Dashboard.</p>
      </div>
    );
  }

  return <>{children}</>;
};

export const RequireVolunteer: React.FC<GuardProps> = ({ children, fallback }) => {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Verifying Volunteer access"
        className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4"
      >
        <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" aria-hidden="true" />
        <p className="text-slate-400 font-mono text-sm uppercase tracking-widest">Verifying Volunteer access...</p>
      </div>
    );
  }

  if (role !== 'volunteer') {
    if (fallback) return <>{fallback}</>;
    return (
      <div role="alert" className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="h-14 w-14 rounded-full bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center mx-auto shadow-lg" aria-hidden="true">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold uppercase tracking-wider text-white">Access Denied (Volunteer Only)</h2>
        <p className="text-xs text-slate-500 max-w-sm">You do not have the necessary permissions to access the Volunteer Dashboard.</p>
      </div>
    );
  }

  return <>{children}</>;
};

export const RequireFan: React.FC<GuardProps> = ({ children, fallback }) => {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Verifying Fan access"
        className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4"
      >
        <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" aria-hidden="true" />
        <p className="text-slate-400 font-mono text-sm uppercase tracking-widest">Verifying Fan access...</p>
      </div>
    );
  }

  if (role !== 'fan') {
    if (fallback) return <>{fallback}</>;
    return (
      <div role="alert" className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="h-14 w-14 rounded-full bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center mx-auto shadow-lg" aria-hidden="true">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold uppercase tracking-wider text-white">Access Denied (Fan Only)</h2>
        <p className="text-xs text-slate-500 max-w-sm">You do not have the necessary permissions to access the Fan Portal.</p>
      </div>
    );
  }

  return <>{children}</>;
};
