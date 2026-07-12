/**
 * Volunteer login screen.
 *
 * Shows email/password fields and, when demo accounts are provided, a row of
 * quick-login buttons.  Displays a login error alert and a "Signing In…"
 * disabled state while submitting.  Purely presentational — all state is
 * lifted to `VolunteerDashboard`.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { UserCheck, Loader2 } from 'lucide-react';

interface DemoAccount {
  id: string;
  name: string;
  volunteerId: string;
  email: string;
}

interface VolunteerLoginProps {
  email: string; setEmail: (v: string) => void;
  password: string; setPassword: (v: string) => void;
  loginError: string;
  isLoggingIn: boolean;
  onSubmit: (e: React.FormEvent) => void;
  demoAccounts: DemoAccount[];
  onQuickLogin: (acc: DemoAccount) => void;
}

export default function VolunteerLogin({
  email, setEmail, password, setPassword,
  loginError, isLoggingIn, onSubmit,
  demoAccounts, onQuickLogin,
}: VolunteerLoginProps) {
  return (
    <div id="volunteer-login-container" className="relative min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-950/70 to-emerald-950/20" />
      </div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(16,185,129,0.06)] space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-xl bg-emerald-500 text-black flex items-center justify-center mx-auto shadow-md">
            <UserCheck className="h-6 w-6" />
          </div>
          <h2 className="font-sans font-black text-xl text-white uppercase tracking-wider">Volunteer Gateway</h2>
          <p className="text-xs text-slate-500">Sign in using your pre-assigned security code credentials</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="vol-email" className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1.5">Email Address</label>
              <input id="vol-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="volunteer@nexusai.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-xs text-white outline-none transition-all" />
            </div>
            <div>
              <label htmlFor="vol-password" className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1.5">Password</label>
              <input id="vol-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-xs text-white outline-none transition-all" />
            </div>
          </div>

          {loginError && (
            <p role="alert" className="text-xs text-red-500 font-semibold bg-red-950/30 border border-red-500/20 rounded-xl p-3 text-center">{loginError}</p>
          )}

          <button type="submit" disabled={isLoggingIn}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-800 text-black font-sans font-black text-xs uppercase tracking-widest shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2">
            {isLoggingIn ? (
              <><Loader2 className="h-4 w-4 animate-spin" /><span>Signing In...</span></>
            ) : (
              <span>Log In to Device</span>
            )}
          </button>
        </form>

        {/* Demo account picker */}
        <div className="pt-5 border-t border-slate-800/60">
          <div className="flex items-center justify-between mb-3 text-xs">
            <span className="text-slate-500 font-semibold uppercase tracking-wider">Demo Accounts (1-Click Login)</span>
            <span className="text-[10px] text-[var(--dynamic-accent)] font-mono font-bold flex items-center space-x-1 animate-pulse transition-colors duration-700">
              <span>Quick Select Account</span>
            </span>
          </div>

          {demoAccounts.length === 0 ? (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-center text-xs text-slate-500 space-y-1">
              <p>No volunteer profiles registered yet.</p>
              <p className="text-[10px] text-emerald-500">Go to "Organizer Dashboard" → "Volunteers" to register new volunteers dynamically.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {demoAccounts.map((acc) => (
                <button key={acc.id} onClick={() => onQuickLogin(acc)}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-850 hover:border-emerald-500 text-left transition-all group flex flex-col space-y-1 text-xs cursor-pointer hover:bg-emerald-500/5">
                  <span className="font-bold text-white group-hover:text-emerald-400 truncate">{acc.name}</span>
                  <span className="font-mono text-[9px] text-slate-500 font-bold uppercase tracking-wider">{acc.volunteerId}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
