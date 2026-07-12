import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Activity } from 'lucide-react';
import Antigravity from './Antigravity';
import BlurText from './BlurText';

interface SplashScreenProps {
  onComplete: () => void;
}

const STEPS = [
  { text: 'CALIBRATING NEXUS INTEL CORE...', duration: 600 },
  { text: 'UPLINKING STADIUM TELEMETRY GATEWAYS...', duration: 500 },
  { text: 'SYNCHRONIZING LIVE MATCH STATS DATABASE...', duration: 500 },
  { text: 'SECURE VOLUNTEER & FAN PROTOCOLS READY.', duration: 400 },
];

const TOTAL_DURATION_MS = STEPS.reduce((s, st) => s + st.duration, 0);

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  // Respect the OS-level "reduce motion" accessibility preference.
  // When active: skip the animated splash and go straight to the app.
  const prefersReducedMotion = useReducedMotion();
  useEffect(() => {
    if (prefersReducedMotion) {
      onComplete();
    }
  }, [prefersReducedMotion, onComplete]);

  useEffect(() => {
    let currentStep = 0;
    let timer: ReturnType<typeof setTimeout>;

    const runStep = () => {
      if (currentStep >= STEPS.length) {
        setProgress(100);
        timer = setTimeout(() => { onComplete(); }, 300);
        return;
      }

      setCurrentStepIndex(currentStep);
      const stepDuration = STEPS[currentStep].duration;
      const startProgress = (currentStep / STEPS.length) * 100;
      const endProgress = ((currentStep + 1) / STEPS.length) * 100;
      const progressStep = (endProgress - startProgress) / 10;

      let stepProgressCount = 0;
      const progressInterval = setInterval(() => {
        stepProgressCount++;
        setProgress(prev => Math.min(endProgress, prev + progressStep));
        if (stepProgressCount >= 10) {
          clearInterval(progressInterval);
          currentStep++;
          timer = setTimeout(runStep, 150);
        }
      }, stepDuration / 10);
    };

    runStep();
    return () => { clearTimeout(timer); };
  }, [onComplete]);

  const currentStepText = STEPS[currentStepIndex]?.text ?? '';
  const progressRounded = Math.round(progress);

  return (
    <div
      className="relative min-h-screen bg-slate-950 flex flex-col items-center justify-center overflow-hidden font-sans"
      role="status"
      aria-label="Nexus AI is loading"
      aria-live="polite"
    >
      {/* Immersive Background Particles — decorative, hidden from AT */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-50" aria-hidden="true">
        <Antigravity
          count={250}
          magnetRadius={12}
          ringRadius={7}
          waveSpeed={0.3}
          waveAmplitude={0.9}
          particleSize={1.5}
          lerpSpeed={0.05}
          autoAnimate={true}
          particleVariance={0.8}
        />
      </div>

      {/* Futuristic Grid Overlay — decorative */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,_transparent_1px),_linear-gradient(90deg,_rgba(255,255,255,0.02)_1px,_transparent_1px)] bg-[size:32px_32px] pointer-events-none z-10"
      />

      {/* Stadium glow effects — decorative */}
      <div aria-hidden="true" className="gpu-blur-layer absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--dynamic-accent)] opacity-10 rounded-full blur-[140px] pointer-events-none transition-all duration-700" />
      <div aria-hidden="true" className="gpu-blur-layer absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-[var(--dynamic-accent)] opacity-5 rounded-full blur-[100px] pointer-events-none transition-all duration-700" />

      <div className="relative z-20 text-center max-w-lg px-6 flex flex-col items-center space-y-8">

        {/* Animated Brand Logo Mark — decorative */}
        <motion.div
          aria-hidden="true"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative"
        >
          <div className="w-20 h-20 bg-[var(--dynamic-accent)] flex items-center justify-center rounded-2xl shadow-[0_0_40px_var(--dynamic-accent-glow)] border border-white/10 transition-all duration-700">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
              className="w-12 h-12 border-2 border-black rounded-lg flex items-center justify-center"
            >
              <div className="w-2.5 h-2.5 bg-black rounded-full" />
            </motion.div>
          </div>
          <motion.div
            aria-hidden="true"
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="absolute -inset-2 border border-[var(--dynamic-accent)] opacity-25 rounded-3xl pointer-events-none transition-all duration-700"
          />
        </motion.div>

        {/* Title branding */}
        <div className="space-y-2 flex flex-col items-center" aria-hidden="true">
          <BlurText
            text="NEXUS AI"
            delay={120}
            animateBy="words"
            direction="top"
            className="text-4xl font-extrabold tracking-tighter text-white uppercase sm:text-5xl"
          />
          <BlurText
            text="STADIUM INTELLIGENCE PLATFORM"
            delay={40}
            animateBy="letters"
            direction="bottom"
            className="text-[10px] sm:text-xs text-[var(--dynamic-accent)] font-mono tracking-[0.3em] uppercase font-bold transition-colors duration-700"
          />
        </div>

        {/* Progress bar — announces state to screen readers */}
        <div className="w-full space-y-3 pt-4">
          <div className="flex items-center justify-between text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">
            <div className="flex items-center space-x-1.5 text-[var(--dynamic-accent)] transition-colors duration-700">
              <Activity className="h-3 w-3 animate-pulse" aria-hidden="true" />
              <span aria-live="polite" aria-atomic="true">{currentStepText}</span>
            </div>
            <span aria-hidden="true">{progressRounded}%</span>
          </div>

          {/* Loading bar */}
          <div
            role="progressbar"
            aria-valuenow={progressRounded}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Loading Nexus AI: ${progressRounded}% complete`}
            aria-valuetext={`${progressRounded}% — ${currentStepText}`}
            className="h-1.5 w-full bg-slate-900 border border-slate-800/80 rounded-full overflow-hidden p-[2px]"
          >
            <motion.div
              className="h-full bg-[var(--dynamic-accent)] rounded-full shadow-[0_0_12px_var(--dynamic-accent-glow)] transition-colors duration-700"
              style={{ width: `${progress}%` }}
              layoutId="splash-progress"
            />
          </div>
        </div>

        {/* Skip action */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          onClick={onComplete}
          aria-label="Skip initialization and go to the main application"
          className="text-[10px] font-mono tracking-widest text-slate-500 hover:text-[var(--dynamic-accent)] font-bold uppercase transition-all duration-300 pt-4 cursor-pointer"
        >
          [ SKIP INITIALIZATION ]
        </motion.button>
      </div>

      {/* Ambient status footer — decorative */}
      <div
        aria-hidden="true"
        className="absolute bottom-6 left-6 right-6 flex justify-between text-[9px] font-mono text-slate-600 uppercase tracking-widest z-20 pointer-events-none"
      >
        <span>STATION CODE: AZTECA-2026</span>
        <span>SECURITY PROTOCOL: LEVEL-5 ACTIVE. Estimated load: {Math.round(TOTAL_DURATION_MS / 1000)}s</span>
      </div>
    </div>
  );
}
