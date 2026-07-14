/**
 * Organizer (admin) login form.
 *
 * Rendered by `OrganizerDashboard` when no admin session is active.
 * Purely presentational: email/password state and submit handler are
 * threaded in as props.  Shows an error alert when `loginError` is set
 * and disables the button with a "Logging in..." label while `isLoggingIn`.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Key, Loader2 } from 'lucide-react';

interface OrganizerLoginProps {
  stadiumBg: string;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  loginError: string;
  isLoggingIn: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export default function OrganizerLogin({
  stadiumBg, email, setEmail, password, setPassword,
  loginError, isLoggingIn, onSubmit,
}: OrganizerLoginProps) {
  return (
    <div id="organizer-login-container" className="relative min-h-screen bg-slate-950 flex items-center justify-center p-6 overflow-hidden">

      {/* Stadium backdrop */}
      <div className="gpu-blur-layer absolute inset-0">
        <img src={stadiumBg} alt="" aria-hidden="true" className="w-full h-full object-cover opacity-15 saturate-50 filter blur-[1px]" />
        <div className="absolute inset-0 bg-slate-950/80" />
      </div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="gpu-blur-foreground w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-[0_0_50px_rgba(16,185,129,0.1)]"
      >
        <div className="text-center space-y-3 mb-8">
          <div className="h-14 w-14 rounded-2xl bg-emerald-500 text-black flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <Shield className="h-7 w-7" />
          </div>
          <div>
            <h2 className="font-sans font-black text-2xl text-white tracking-wide uppercase">Organizer Login</h2>
            <p className="text-xs text-slate-400">Sign in to orchestrate matches &amp; task dispatch</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label htmlFor="org-email" className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-2">Email Address</label>
            <input
              id="org-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-sm text-white focus:ring-1 focus:ring-emerald-500/30 outline-none transition-all"
              placeholder="admin@nexusai.com"
            />
          </div>

          <div>
            <label htmlFor="org-password" className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-2">Security Key</label>
            <input
              id="org-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-sm text-white focus:ring-1 focus:ring-emerald-500/30 outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          {loginError && (
            <p role="alert" className="text-xs text-red-500 font-semibold bg-red-950/30 border border-red-500/20 rounded-xl p-3 text-center">{loginError}</p>
          )}

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-850 text-black font-sans font-black text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Logging in...</span>
              </>
            ) : (
              <>
                <Key className="h-4 w-4" />
                <span>Login to Command Center</span>
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
