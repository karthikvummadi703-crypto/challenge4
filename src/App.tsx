/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LandingPage from './components/LandingPage';
import WebhookSettingsModal from './components/WebhookSettingsModal';

// Lazy-load heavy role dashboards — each user only ever visits one, so we
// split them into separate chunks that are downloaded on demand.
const OrganizerDashboard = lazy(() => import('./components/OrganizerDashboard'));
const VolunteerDashboard  = lazy(() => import('./components/VolunteerDashboard'));
const FanDashboard        = lazy(() => import('./components/FanDashboard'));

/** Minimal centered spinner shown while the role-specific chunk is loading. */
function DashboardSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="h-10 w-10 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
    </div>
  );
}
import SplashScreen from './components/SplashScreen';
import DemoBadge from './components/DemoBadge';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './context/authContext';
import { DemoModeProvider, useDemoMode, DemoRole } from './context/demoModeContext';

function AppContent() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentRole, setCurrentRole] = useState<'landing' | 'organizer' | 'volunteer' | 'fan'>('landing');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { isDemoMode, demoRole, enterDemoMode, exitDemoMode } = useDemoMode();

  const stadiumBg     = '/src/assets/images/stadium_background_1783681883835.jpg';
  const ronaldoConcept = '/src/assets/images/player_ronaldo_concept_1783681901181.jpg';

  const handleRoleSelection = (role: 'organizer' | 'volunteer' | 'fan') => {
    setCurrentRole(role);
  };

  useEffect(() => {
    if (isDemoMode && demoRole && currentRole === 'landing') {
      setCurrentRole(demoRole === 'organizer' ? 'organizer' : demoRole);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemoMode, demoRole]);

  const handleEnterDemo = (role: DemoRole) => {
    const started = enterDemoMode(role);
    if (started) setCurrentRole(role);
  };

  const handleLogout = () => {
    if (isDemoMode) exitDemoMode();
    setCurrentRole('landing');
  };

  return (
    <div
      id="app-root-container"
      className="min-h-screen text-white font-sans overflow-x-hidden selection:bg-emerald-500 selection:text-black relative"
    >
      {isDemoMode && <DemoBadge onExit={handleLogout} />}

      {/* Global Stadium Background — decorative, hidden from assistive technology.
          `.gpu-blur-layer` gives this its own stacking context + paint
          containment so it can never be squashed together with the
          foreground content layer — on some Chrome/Android GPU drivers, a
          full-viewport `filter: blur()` sharing a layer with sharp text can
          visibly "bleed" blur onto that text (a real compositor bug, not a
          CSS mistake). Note: this intentionally does NOT force a
          `translateZ(0)`-style permanent GPU compositing layer — doing so
          on rounded/overflow-hidden cards elsewhere caused a *different*
          blur artifact (see .gpu-blur-layer in index.css). */}
      <div
        aria-hidden="true"
        className="gpu-blur-layer fixed inset-0 pointer-events-none bg-cover bg-center bg-no-repeat transition-all duration-1000"
        style={{
          backgroundImage: `linear-gradient(rgba(2, 4, 8, 0.90), rgba(2, 4, 8, 0.94)), url(${stadiumBg})`,
        }}
      />

      {/* Global Stadium Glow Effects — decorative. Same GPU-layer isolation as
          above; these are the heaviest blur radii (100-120px) in the app and
          the most likely source of any cross-page blur bleed. */}
      <div
        aria-hidden="true"
        className="gpu-blur-layer fixed inset-0 pointer-events-none overflow-hidden"
      >
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[var(--dynamic-accent)] opacity-10 rounded-full blur-[120px] transition-all duration-700" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[var(--dynamic-accent)] opacity-10 rounded-full blur-[120px] transition-all duration-700" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-[var(--dynamic-accent)] opacity-5 rounded-[100%] blur-[100px] transition-all duration-700" />
      </div>

      <AnimatePresence mode="wait">
        {showSplash ? (
          <motion.div
            key="splash-screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-50"
          >
            <SplashScreen onComplete={() => setShowSplash(false)} />
          </motion.div>
        ) : (
          /* Route Animation Wrapper — id targets the skip-link in index.html */
          <motion.div
            id="main-content"
            key={currentRole}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="min-h-screen relative z-10"
            tabIndex={-1}
          >
            {currentRole === 'landing' && (
              <LandingPage
                onSelectRole={handleRoleSelection}
                onEnterDemo={handleEnterDemo}
                stadiumBg={stadiumBg}
                ronaldoConcept={ronaldoConcept}
              />
            )}

            <Suspense fallback={<DashboardSkeleton />}>
              {currentRole === 'organizer' && (
                <OrganizerDashboard
                  onLogout={handleLogout}
                  stadiumBg={stadiumBg}
                  ronaldoConcept={ronaldoConcept}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                />
              )}

              {currentRole === 'volunteer' && (
                <VolunteerDashboard onLogout={handleLogout} />
              )}

              {currentRole === 'fan' && (
                <FanDashboard onLogout={handleLogout} stadiumBg={stadiumBg} />
              )}
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Webhook Settings Modal */}
      <WebhookSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <DemoModeProvider>
          <AppContent />
        </DemoModeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
