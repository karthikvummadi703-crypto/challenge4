import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let currentStep = 0;
    let timer: NodeJS.Timeout;

    const runStep = () => {
      if (currentStep >= STEPS.length) {
        setProgress(100);
        timer = setTimeout(() => {
          onComplete();
        }, 300);
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

    return () => {
      clearTimeout(timer);
    };
  }, [onComplete]);

  return (
    <div className="relative min-h-screen bg-slate-950 flex flex-col items-center justify-center overflow-hidden font-sans">
      
      {/* Immersive Background Particles */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-50">
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

      {/* Futuristic Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,_transparent_1px),_linear-gradient(90deg,_rgba(255,255,255,0.02)_1px,_transparent_1px)] bg-[size:32px_32px] pointer-events-none z-10" />
      
      {/* Stadium glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--dynamic-accent)] opacity-10 rounded-full blur-[140px] pointer-events-none z-0 transition-all duration-700" />
      <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-[var(--dynamic-accent)] opacity-5 rounded-full blur-[100px] pointer-events-none z-0 transition-all duration-700" />

      <div className="relative z-20 text-center max-w-lg px-6 flex flex-col items-center space-y-8">
        
        {/* Animated Brand Logo Mark */}
        <motion.div 
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
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="absolute -inset-2 border border-[var(--dynamic-accent)] opacity-25 rounded-3xl pointer-events-none transition-all duration-700"
          />
        </motion.div>

        {/* Title branding with custom BlurText components */}
        <div className="space-y-2 flex flex-col items-center">
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

        {/* Progress and status display */}
        <div className="w-full space-y-3 pt-4">
          <div className="flex items-center justify-between text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">
            <div className="flex items-center space-x-1.5 text-[var(--dynamic-accent)] transition-colors duration-700">
              <Activity className="h-3 w-3 animate-pulse" />
              <span>{STEPS[currentStepIndex]?.text}</span>
            </div>
            <span className="text-white">{Math.round(progress)}%</span>
          </div>

          {/* Loading bar track */}
          <div className="h-1.5 w-full bg-slate-900 border border-slate-800/80 rounded-full overflow-hidden p-[2px]">
            <motion.div 
              className="h-full bg-[var(--dynamic-accent)] rounded-full shadow-[0_0_12px_var(--dynamic-accent-glow)] transition-colors duration-700"
              style={{ width: `${progress}%` }}
              layoutId="splash-progress"
            />
          </div>
        </div>

        {/* Action bypass */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          onClick={onComplete}
          className="text-[10px] font-mono tracking-widest text-slate-500 hover:text-[var(--dynamic-accent)] font-bold uppercase transition-all duration-300 pt-4 cursor-pointer"
        >
          [ SKIP INITIALIZATION ]
        </motion.button>
      </div>

      {/* Ambient status footer */}
      <div className="absolute bottom-6 left-6 right-6 flex justify-between text-[9px] font-mono text-slate-600 uppercase tracking-widest z-20 pointer-events-none">
        <span>STATION CODE: AZTECA-2026</span>
        <span>SECURITY PROTOCOL: LEVEL-5 ACTIVE</span>
      </div>
    </div>
  );
}
