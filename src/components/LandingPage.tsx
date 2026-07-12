import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, UserCheck, Shield, HelpCircle, ArrowRight, Play, FlaskConical, X } from 'lucide-react';
import Antigravity from './Antigravity';
import { DemoRole } from '../context/demoModeContext';
import { useModalA11y } from '../hooks/useModalA11y';

interface LandingPageProps {
  onSelectRole: (role: 'organizer' | 'volunteer' | 'fan') => void;
  onEnterDemo: (role: DemoRole) => void;
  stadiumBg: string;
  ronaldoConcept: string;
}

export default function LandingPage({ onSelectRole, onEnterDemo, stadiumBg, ronaldoConcept }: LandingPageProps) {
  const [showDemoPicker, setShowDemoPicker] = useState(false);
  const demoPickerRef = useModalA11y<HTMLDivElement>(showDemoPicker, () => setShowDemoPicker(false));
  return (
    <div id="landing-page-root" className="relative min-h-screen bg-slate-950 text-white flex flex-col justify-between overflow-hidden">
      
      {/* Absolute Cinematic Stadium Background with overlays */}
      <div className="gpu-blur-layer absolute inset-0">
        <img 
          src={stadiumBg} 
          alt="FIFA Stadium 2026" 
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover opacity-15 scale-105 filter saturate-50 blur-[1px]" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-transparent to-slate-950" />
      </div>

      {/* Interactive Antigravity background particles */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-45">
        <Antigravity
          count={240}
          magnetRadius={10}
          ringRadius={6}
          waveSpeed={0.25}
          waveAmplitude={0.9}
          particleSize={1.4}
          lerpSpeed={0.05}
          color={'#10b981'}
          autoAnimate={true}
          particleVariance={0.8}
        />
      </div>

      {/* Header navbar — backdrop-blur-sm moved to its own absolutely
          positioned layer behind the row content so the blur can't share a
          compositing layer with (and bleed onto) the logo text/badges. */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between border-b border-slate-900/40">
        <div className="gpu-blur-layer absolute inset-0 backdrop-blur-sm" />
        <div className="gpu-blur-foreground flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <span className="font-sans font-black text-black text-lg">N</span>
          </div>
          <div>
            <h1 className="font-sans font-bold text-lg tracking-wider text-white">
              NEXUS <span className="text-emerald-400 font-extrabold">AI</span>
            </h1>
            <p className="text-[9px] font-mono tracking-widest text-slate-500 uppercase">Stadium Intelligence</p>
          </div>
        </div>

        {/* FIFA logo mockup styling */}
        <div className="gpu-blur-foreground flex items-center space-x-3 bg-slate-900/60 border border-slate-800 px-4 py-1.5 rounded-full">
          <span className="text-xs font-bold text-emerald-400">FIFA WORLD CUP 2026</span>
          <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-semibold text-slate-400">OFFICIAL INTELLIGENCE PORTAL</span>
        </div>
      </header>

      {/* Main content grid */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-6 py-10 flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-16">
        
        {/* Left column: Hero description & Player Artwork overlay */}
        <div className="flex-1 space-y-8 text-center lg:text-left">
          <div className="inline-flex items-center space-x-2 bg-emerald-950/40 border border-emerald-800/35 px-3 py-1 rounded-full">
            <span className="text-xs font-mono font-bold tracking-widest text-emerald-400 uppercase">ONE AI. EVERY SERVICE. EVERY FAN.</span>
          </div>

          <div className="space-y-4">
            <h2 className="font-sans text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-none uppercase">
              NEXT-GEN <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600 font-extrabold">
                STADIUM OPERATIONS
              </span>
            </h2>
            <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto lg:mx-0 font-medium leading-relaxed">
              Unlock supreme telemetry orchestration, active task lists, real-time crowd heatmaps, and instant fans delivery services powered by local orchestration webhooks.
            </p>
          </div>

          {/* Core Ronaldo conceptual tagline card — blur layer split from the
              text/image content so foreground stays crisp. */}
          <div className="relative max-w-md mx-auto lg:mx-0 rounded-2xl shadow-lg overflow-hidden">
            <div className="gpu-blur-layer absolute inset-0 bg-slate-900/50 border border-slate-800/60 backdrop-blur-md" />
            <div className="gpu-blur-foreground p-4 flex items-center space-x-4">
              <div className="h-12 w-12 rounded-xl overflow-hidden bg-slate-800 border border-slate-700/60 shrink-0">
                <img 
                  src={ronaldoConcept} 
                  alt="Legendary #7 concept" 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover scale-110 filter saturate-100" 
                />
              </div>
              <div className="text-left">
                <p className="text-xs text-slate-400 italic">"Talent without working hard is nothing."</p>
                <p className="text-[10px] font-bold text-emerald-400 mt-1 uppercase font-mono tracking-wider">— Legendary Jersey No.7 Inspiration</p>
              </div>
            </div>
          </div>

          {/* Quick operations flow badge footer */}
          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto lg:mx-0 pt-2 text-left">
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-900">
              <span className="text-[10px] font-mono text-emerald-400 block mb-0.5">01. ORCHESTRATE</span>
              <span className="text-xs text-slate-400 font-medium">Create Matches & Volunteers</span>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-900">
              <span className="text-[10px] font-mono text-emerald-400 block mb-0.5">02. DISPATCH</span>
              <span className="text-xs text-slate-400 font-medium">Coordinate Live Task Stacks</span>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-900">
              <span className="text-[10px] font-mono text-emerald-400 block mb-0.5">03. ENGAGE</span>
              <span className="text-xs text-slate-400 font-medium">Deliver Fan Care & Food</span>
            </div>
          </div>
        </div>

        {/* Right column: Beautiful Neon Gateway Cards — blur layer split from
            the buttons/text content so foreground stays crisp. */}
        <div className="relative w-full max-w-md rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.08)] overflow-hidden">
          <div className="gpu-blur-layer absolute inset-0 bg-slate-900/60 border border-slate-800 backdrop-blur-lg" />
          <div className="gpu-blur-foreground p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-1">
            <h3 className="font-sans font-bold text-xl text-white">Command Gateways</h3>
            <p className="text-xs text-slate-500">Access your specialized control interfaces below</p>
          </div>

          <div className="space-y-4">
            
            {/* Organizer Login Selector Button */}
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(16,185,129,0.2)" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectRole('organizer')}
              className="w-full text-left p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-emerald-500/20 hover:from-emerald-500/20 hover:to-emerald-500/30 border border-emerald-500/30 hover:border-emerald-500/50 transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center space-x-4">
                <div className="h-11 w-11 rounded-xl bg-emerald-400 text-black flex items-center justify-center shadow-lg">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <span className="font-sans font-bold text-sm text-white block">ORGANIZER LOGIN</span>
                  <span className="text-[11px] text-emerald-400 font-medium">Setup match logistics & deploy volunteers</span>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-emerald-400 group-hover:translate-x-1 transition-transform" />
            </motion.button>

            {/* Volunteer Login Selector Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectRole('volunteer')}
              className="w-full text-left p-4 rounded-2xl bg-slate-950/60 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center space-x-4">
                <div className="h-11 w-11 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <span className="font-sans font-bold text-sm text-white block">VOLUNTEER LOGIN</span>
                  <span className="text-[11px] text-slate-500">View Live Task Stack & interactive seat mapping</span>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </motion.button>

            {/* Fan Login Selector Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectRole('fan')}
              className="w-full text-left p-4 rounded-2xl bg-slate-950/60 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center space-x-4">
                <div className="h-11 w-11 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <span className="font-sans font-bold text-sm text-white block">FAN PORTAL</span>
                  <span className="text-[11px] text-slate-500">Order food, request aid, & report seat issues</span>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </motion.button>

          </div>

          <div className="pt-2 text-center border-t border-slate-800/60 mt-2">
            <button
              onClick={() => setShowDemoPicker(true)}
              className="w-full mt-4 flex items-center justify-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-500/60 bg-amber-500/5 hover:bg-amber-500/10 rounded-xl py-3 transition-colors cursor-pointer"
            >
              <Play className="h-3.5 w-3.5" />
              Try Demo Mode
            </button>
            <span className="text-[10px] text-slate-600 font-mono block uppercase mt-3">FIFA WORLD CUP 2026 STADIUM INTELLIGENCE CONTEXT</span>
          </div>
          </div>
        </div>

      </main>

      {/* Demo Mode role picker — no Firebase Auth, no real Firestore writes */}
      {showDemoPicker && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          onClick={() => setShowDemoPicker(false)}
        >
          <div className="gpu-blur-layer absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <motion.div
            ref={demoPickerRef}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-picker-title"
            tabIndex={-1}
            className="gpu-blur-foreground w-full max-w-md bg-slate-900 border border-amber-500/30 rounded-3xl p-6 space-y-5 shadow-[0_0_60px_rgba(245,158,11,0.15)]"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-amber-400" />
                <h3 id="demo-picker-title" className="font-sans font-bold text-lg text-white">Try Demo Mode</h3>
              </div>
              <button
                onClick={() => setShowDemoPicker(false)}
                aria-label="Close demo mode picker"
                className="text-slate-500 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Explore any dashboard instantly with realistic sample data. No sign-in required,
              and nothing you do here touches the real production data.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => { setShowDemoPicker(false); onEnterDemo('organizer'); }}
                className="w-full text-left p-3 rounded-xl bg-slate-950/60 hover:bg-slate-950 border border-slate-800 hover:border-amber-500/40 transition-all flex items-center gap-3 cursor-pointer"
              >
                <Shield className="h-4 w-4 text-amber-400 shrink-0" />
                <span className="text-sm font-semibold text-white">Organizer Dashboard</span>
              </button>
              <button
                onClick={() => { setShowDemoPicker(false); onEnterDemo('volunteer'); }}
                className="w-full text-left p-3 rounded-xl bg-slate-950/60 hover:bg-slate-950 border border-slate-800 hover:border-amber-500/40 transition-all flex items-center gap-3 cursor-pointer"
              >
                <UserCheck className="h-4 w-4 text-amber-400 shrink-0" />
                <span className="text-sm font-semibold text-white">Volunteer Dashboard</span>
              </button>
              <button
                onClick={() => { setShowDemoPicker(false); onEnterDemo('fan'); }}
                className="w-full text-left p-3 rounded-xl bg-slate-950/60 hover:bg-slate-950 border border-slate-800 hover:border-amber-500/40 transition-all flex items-center gap-3 cursor-pointer"
              >
                <Users className="h-4 w-4 text-amber-400 shrink-0" />
                <span className="text-sm font-semibold text-white">Fan Portal</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Footer credits */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between border-t border-slate-900/40 text-[10px] text-slate-500 font-medium">
        <span>© 2026 NEXUS AI. All rights reserved. FIFA 2026 stadium proof of concept.</span>
        <div className="flex space-x-4 mt-2 sm:mt-0 font-mono">
          <a href="#landing-page-root" aria-label="Compliance documentation" className="hover:text-emerald-400 transition-colors">COMPLIANCE</a>
          <span aria-hidden="true">•</span>
          <a href="#landing-page-root" aria-label="Intelligence SLA documentation" className="hover:text-emerald-400 transition-colors">INTELLIGENCE SLA</a>
          <span aria-hidden="true">•</span>
          <a href="#landing-page-root" aria-label="n8n flow schema documentation" className="hover:text-emerald-400 transition-colors">n8n FLOW SCHEMA</a>
        </div>
      </footer>

    </div>
  );
}
