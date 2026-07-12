import React from 'react';
import { motion } from 'framer-motion';
import { FlaskConical, RotateCcw, LogOut } from 'lucide-react';
import { useDemoMode } from '../context/demoModeContext';

/**
 * Persistent banner shown on every dashboard while Demo Mode is active.
 * Purely additive — does not alter the existing dashboard layout/markup.
 */
export default function DemoBadge({ onExit }: { onExit: () => void }) {
  const { isDemoMode, resetDemoData } = useDemoMode();
  const [justReset, setJustReset] = React.useState(false);

  if (!isDemoMode) return null;

  const handleReset = () => {
    resetDemoData();
    setJustReset(true);
    setTimeout(() => setJustReset(false), 1500);
  };

  return (
    <motion.div
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between gap-3 bg-amber-500 text-black px-4 py-1.5 text-xs font-mono font-bold tracking-wider shadow-[0_2px_10px_rgba(0,0,0,0.35)]"
    >
      <div className="flex items-center gap-2 uppercase">
        <FlaskConical className="h-3.5 w-3.5" />
        <span>Demo Mode — sample data only, nothing here is saved to production</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleReset}
          aria-label={justReset ? 'Demo data has been reset' : 'Reset demo data to initial sample values'}
          className="flex items-center gap-1 bg-black/10 hover:bg-black/20 px-2 py-1 rounded-md transition-colors uppercase"
        >
          <RotateCcw className="h-3 w-3" aria-hidden="true" />
          {justReset ? 'Reset!' : 'Reset Demo Data'}
        </button>
        <button
          onClick={onExit}
          aria-label="Exit demo mode and return to the login screen"
          className="flex items-center gap-1 bg-black/10 hover:bg-black/20 px-2 py-1 rounded-md transition-colors uppercase"
        >
          <LogOut className="h-3 w-3" aria-hidden="true" />
          Exit Demo Mode
        </button>
      </div>
    </motion.div>
  );
}
