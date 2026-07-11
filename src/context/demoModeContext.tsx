import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './authContext';
import { setDemoModeActive } from '../services/dataSource';
import { initDemoStore, resetDemoStore } from '../services/demoStore';

export type DemoRole = 'organizer' | 'volunteer' | 'fan';

interface DemoProfile {
  uid: string;
  fullName: string;
  email: string;
  volunteerId?: string;
  assignedGate?: string;
  seatNumber?: string;
}

const DEMO_PROFILES: Record<DemoRole, DemoProfile> = {
  organizer: { uid: 'demo-admin-1', fullName: 'Demo Organizer', email: 'organizer@demo.nexusai.com' },
  volunteer: { uid: 'demo-vol-1', fullName: 'Marco Silva', email: 'marco.silva@demo.nexusai.com', volunteerId: 'VOL-DEMO1', assignedGate: 'Gate A' },
  fan: { uid: 'demo-fan-1', fullName: 'Jordan Alvarez', email: 'jordan.alvarez@demo.nexusai.com', seatNumber: 'A-118' },
};

const SESSION_KEY_ACTIVE = 'nexus-demo-active';
const SESSION_KEY_ROLE = 'nexus-demo-role';

interface DemoModeContextType {
  isDemoMode: boolean;
  demoRole: DemoRole | null;
  demoProfile: DemoProfile | null;
  /** Returns false (and does nothing) if the judge cancels the "sign out first" warning. */
  enterDemoMode: (role: DemoRole) => boolean;
  exitDemoMode: () => void;
  resetDemoData: () => void;
}

const DemoModeContext = createContext<DemoModeContextType | undefined>(undefined);

export const DemoModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, logoutUser } = useAuth();
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoRole, setDemoRole] = useState<DemoRole | null>(null);

  // Restore Demo Mode across a same-tab refresh (sessionStorage only — never persists
  // beyond the browser tab, per the "no leakage into a real session" requirement).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const active = window.sessionStorage.getItem(SESSION_KEY_ACTIVE) === 'true';
    const role = window.sessionStorage.getItem(SESSION_KEY_ROLE) as DemoRole | null;
    if (active && role) {
      initDemoStore();
      setDemoModeActive(true);
      setIsDemoMode(true);
      setDemoRole(role);
    }
  }, []);

  const enterDemoMode = useCallback((role: DemoRole): boolean => {
    // A real authenticated session must never coexist with Demo Mode — log the
    // real user out first, with an explicit warning, rather than silently mixing
    // real and mock data paths.
    if (user) {
      const proceed = window.confirm(
        'You are currently signed in. Entering Demo Mode will sign you out of your real account first. Continue?'
      );
      if (!proceed) return false;
      logoutUser().catch(() => { /* best-effort — proceed into Demo Mode regardless */ });
    }

    initDemoStore();
    setDemoModeActive(true);
    setIsDemoMode(true);
    setDemoRole(role);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(SESSION_KEY_ACTIVE, 'true');
      window.sessionStorage.setItem(SESSION_KEY_ROLE, role);
    }
    return true;
  }, [user, logoutUser]);

  const exitDemoMode = useCallback(() => {
    setDemoModeActive(false);
    setIsDemoMode(false);
    setDemoRole(null);
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(SESSION_KEY_ACTIVE);
      window.sessionStorage.removeItem(SESSION_KEY_ROLE);
    }
  }, []);

  const resetDemoData = useCallback(() => {
    resetDemoStore();
  }, []);

  return (
    <DemoModeContext.Provider
      value={{
        isDemoMode,
        demoRole,
        demoProfile: demoRole ? DEMO_PROFILES[demoRole] : null,
        enterDemoMode,
        exitDemoMode,
        resetDemoData,
      }}
    >
      {children}
    </DemoModeContext.Provider>
  );
};

export const useDemoMode = () => {
  const context = useContext(DemoModeContext);
  if (context === undefined) {
    throw new Error('useDemoMode must be used within a DemoModeProvider');
  }
  return context;
};
