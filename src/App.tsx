/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LandingPage from './components/LandingPage';
import OrganizerDashboard from './components/OrganizerDashboard';
import VolunteerDashboard from './components/VolunteerDashboard';
import FanDashboard from './components/FanDashboard';
import WebhookSettingsModal from './components/WebhookSettingsModal';
import SplashScreen from './components/SplashScreen';
import DemoBadge from './components/DemoBadge';
import { AuthProvider } from './context/authContext';
import { DemoModeProvider, useDemoMode, DemoRole } from './context/demoModeContext';

function AppContent() {
  // Initial splash screen state
  const [showSplash, setShowSplash] = useState(true);

  // Current Navigation State
  const [currentRole, setCurrentRole] = useState<'landing' | 'organizer' | 'volunteer' | 'fan'>('landing');

  // Webhook Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { isDemoMode, demoRole, enterDemoMode, exitDemoMode } = useDemoMode();

  // Generated images reference URLs
  const stadiumBg = '/src/assets/images/stadium_background_1783681883835.jpg';
  const ronaldoConcept = '/src/assets/images/player_ronaldo_concept_1783681901181.jpg';

  const handleRoleSelection = (role: 'organizer' | 'volunteer' | 'fan') => {
    setCurrentRole(role);
  };

  // Stay on whatever role Demo Mode was restored into (e.g. after a same-tab refresh).
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
    <div id="app-root-container" className="min-h-screen text-white font-sans overflow-x-hidden selection:bg-emerald-500 selection:text-black relative">
        {isDemoMode && <DemoBadge onExit={handleLogout} />}
        
        {/* Global Stadium Background Image with dark elegant overlay */}
        <div 
          className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat transition-all duration-1000"
          style={{ 
            backgroundImage: `linear-gradient(rgba(2, 4, 8, 0.90), rgba(2, 4, 8, 0.94)), url(${stadiumBg})`,
          }}
        />

        {/* Global Stadium Glow Effects */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-[var(--dynamic-accent)] opacity-10 rounded-full blur-[120px] transition-all duration-700"></div>
          <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[var(--dynamic-accent)] opacity-10 rounded-full blur-[120px] transition-all duration-700"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-[var(--dynamic-accent)] opacity-5 rounded-[100%] blur-[100px] transition-all duration-700"></div>
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
            /* Route Animation Wrapper */
            <motion.div
              key={currentRole}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="min-h-screen relative z-10"
            >
              {currentRole === 'landing' && (
                <LandingPage 
                  onSelectRole={handleRoleSelection} 
                  onEnterDemo={handleEnterDemo}
                  stadiumBg={stadiumBg}
                  ronaldoConcept={ronaldoConcept}
                />
              )}

              {currentRole === 'organizer' && (
                <OrganizerDashboard 
                  onLogout={handleLogout} 
                  stadiumBg={stadiumBg}
                  ronaldoConcept={ronaldoConcept}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                />
              )}

              {currentRole === 'volunteer' && (
                <VolunteerDashboard 
                  onLogout={handleLogout} 
                />
              )}

              {currentRole === 'fan' && (
                <FanDashboard 
                  onLogout={handleLogout} 
                  stadiumBg={stadiumBg}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Settings Modal for custom n8n configurations */}
        <WebhookSettingsModal 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
        />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DemoModeProvider>
        <AppContent />
      </DemoModeProvider>
    </AuthProvider>
  );
}
