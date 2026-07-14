/**
 * Fan authentication screen — handles both login and registration flows.
 *
 * Purely presentational: all state is lifted to `FanDashboard` and threaded
 * in via props.  Registration mode shows extra fields (name, phone, country,
 * preferred language, favourite team) plus an auto-generated seat number with
 * a regenerate button.  Wraps the form card in a `framer-motion` animation.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Users, Loader2, RefreshCw } from 'lucide-react';

interface FanAuthProps {
  stadiumBg: string;
  isRegistering: boolean;
  onToggleMode: () => void;
  name: string; setName: (v: string) => void;
  email: string; setEmail: (v: string) => void;
  password: string; setPassword: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  country: string; setCountry: (v: string) => void;
  preferredLanguage: string; setPreferredLanguage: (v: string) => void;
  favoriteTeam: string; setFavoriteTeam: (v: string) => void;
  seatNumber: string;
  isGeneratingSeat: boolean;
  onRegenerateSeat: () => void;
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
}

export default function FanAuth({
  stadiumBg, isRegistering, onToggleMode,
  name, setName, email, setEmail, password, setPassword,
  phone, setPhone, country, setCountry,
  preferredLanguage, setPreferredLanguage,
  favoriteTeam, setFavoriteTeam,
  seatNumber, isGeneratingSeat, onRegenerateSeat,
  isSubmitting, error, onSubmit,
}: FanAuthProps) {
  return (
    <div id="fan-auth-container" className="relative min-h-screen bg-slate-950 flex items-center justify-center p-6 overflow-hidden">
      <div className="gpu-blur-layer absolute inset-0">
        <img src={stadiumBg} alt="" aria-hidden="true" className="w-full h-full object-cover opacity-15 filter saturate-50 blur-[2px]" />
        <div className="absolute inset-0 bg-slate-950/80" />
      </div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="gpu-blur-foreground relative z-10 w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(16,185,129,0.06)]"
      >
        <div className="text-center space-y-2 mb-6">
          <div className="h-12 w-12 rounded-xl bg-emerald-500 text-black flex items-center justify-center mx-auto shadow-md">
            <Users className="h-6 w-6" />
          </div>
          <h2 className="font-sans font-black text-xl text-white uppercase tracking-wider">
            {isRegistering ? 'Register Fan Pass' : 'Fan Pass Portal'}
          </h2>
          <p className="text-xs text-slate-500">Access exclusive in-stadium food delivery &amp; assistance</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-950/30 border border-red-500/20 rounded-xl text-xs text-red-400 font-semibold text-center">
              {error}
            </div>
          )}

          {isRegistering && (
            <div>
              <label htmlFor="fan-name" className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1.5">Full Name</label>
              <input id="fan-name" type="text" required value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Cristiano Ronaldo"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-xs text-white outline-none" />
            </div>
          )}

          <div>
            <label htmlFor="fan-email" className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1.5">Email Address</label>
            <input id="fan-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="fan@worldcup.com"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-xs text-white outline-none" />
          </div>

          <div>
            <label htmlFor="fan-password" className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1.5">Password</label>
            <input id="fan-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-xs text-white outline-none" />
          </div>

          {isRegistering && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="fan-phone" className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1.5">Phone</label>
                <input id="fan-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555 000 1234"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-xs text-white outline-none" />
              </div>
              <div>
                <label htmlFor="fan-country" className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1.5">Country</label>
                <input id="fan-country" type="text" value={country} onChange={(e) => setCountry(e.target.value)}
                  placeholder="United States"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-xs text-white outline-none" />
              </div>
              <div>
                <label htmlFor="fan-language" className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1.5">Language</label>
                <select id="fan-language" value={preferredLanguage} onChange={(e) => setPreferredLanguage(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-xs text-white outline-none">
                  <option>English</option>
                  <option>Spanish</option>
                  <option>Portuguese</option>
                  <option>French</option>
                  <option>Arabic</option>
                </select>
              </div>
              <div>
                <label htmlFor="fan-team" className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1.5">Favorite Team</label>
                <input id="fan-team" type="text" value={favoriteTeam} onChange={(e) => setFavoriteTeam(e.target.value)}
                  placeholder="Argentina"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-xs text-white outline-none" />
              </div>
            </div>
          )}

          {isRegistering && (
            <div>
              <label htmlFor="fan-seat" className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1.5">Your Seat Location</label>
              <div className="relative flex items-center">
                <input id="fan-seat" type="text" readOnly required value={seatNumber}
                  placeholder="Generating unique seat..."
                  className="w-full px-3.5 py-2 pr-10 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono uppercase outline-none select-none" />
                <button type="button" disabled={isGeneratingSeat} onClick={onRegenerateSeat}
                  aria-label="Generate new seat number"
                  className="absolute right-2 p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-emerald-400 hover:text-emerald-300 disabled:opacity-50 cursor-pointer flex items-center justify-center transition-all">
                  <RefreshCw className={`h-3.5 w-3.5 ${isGeneratingSeat ? 'animate-spin' : ''}`} aria-hidden="true" />
                </button>
              </div>
              <span className="text-[9px] text-slate-500 mt-1 block">Your unique stadium seat number is automatically validated as available.</span>
            </div>
          )}

          <button type="submit" disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-800 disabled:text-slate-400 text-black font-sans font-black text-xs uppercase tracking-widest shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2">
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /><span>Processing...</span></>
            ) : (
              <span>{isRegistering ? 'Register and Enter' : 'Enter Fan Pass'}</span>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-800/60 text-center">
          <button onClick={onToggleMode} className="text-xs text-emerald-400 hover:underline cursor-pointer">
            {isRegistering ? 'Already registered? Login instead' : 'New to stadium? Create Fan Pass'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
