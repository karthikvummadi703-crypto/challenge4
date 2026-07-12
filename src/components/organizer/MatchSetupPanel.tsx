import React from 'react';
import { PlusCircle } from 'lucide-react';
import { Match } from '../../types';

interface MatchSetupPanelProps {
  stadiumName: string;
  setStadiumName: (v: string) => void;
  matchName: string;
  setMatchName: (v: string) => void;
  matchDate: string;
  setMatchDate: (v: string) => void;
  matchTime: string;
  setMatchTime: (v: string) => void;
  ticketPrice: string;
  setTicketPrice: (v: string) => void;
  matchSaveSuccess: boolean;
  matches: Match[];
  onSubmit: (e: React.FormEvent) => void;
}

export default function MatchSetupPanel({
  stadiumName, setStadiumName, matchName, setMatchName,
  matchDate, setMatchDate, matchTime, setMatchTime,
  ticketPrice, setTicketPrice, matchSaveSuccess, matches, onSubmit,
}: MatchSetupPanelProps) {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold tracking-widest">Orchestration Setup</span>
        <h2 className="text-2xl font-black text-white tracking-wide uppercase">Match Setup Panel</h2>
        <p className="text-xs text-slate-500">Configure matches, ticket ranges, and deploy virtual nodes</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Form */}
        <form onSubmit={onSubmit} className="md:col-span-3 bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h3 className="font-sans font-bold text-sm text-white uppercase border-b border-slate-800 pb-2">Event Properties</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label htmlFor="match-stadium" className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-2">Stadium Name</label>
              <input id="match-stadium" type="text" required value={stadiumName} onChange={(e) => setStadiumName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-emerald-500 outline-none transition-all" />
            </div>

            <div className="col-span-2">
              <label htmlFor="match-name" className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-2">Match Name (Group Stage / Finals)</label>
              <input id="match-name" type="text" required placeholder="e.g. Portugal vs Argentina" value={matchName} onChange={(e) => setMatchName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-emerald-500 outline-none transition-all" />
            </div>

            <div>
              <label htmlFor="match-date" className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-2">Match Date</label>
              <input id="match-date" type="text" required placeholder="DD/MM/YYYY" value={matchDate} onChange={(e) => setMatchDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-emerald-500 outline-none transition-all" />
            </div>

            <div>
              <label htmlFor="match-time" className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-2">Match Time</label>
              <input id="match-time" type="text" required placeholder="e.g. 07:30 PM" value={matchTime} onChange={(e) => setMatchTime(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-emerald-500 outline-none transition-all" />
            </div>

            <div>
              <label htmlFor="match-price" className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-2">Ticket Price (USD)</label>
              <input id="match-price" type="number" required value={ticketPrice} onChange={(e) => setTicketPrice(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-emerald-500 outline-none transition-all" />
            </div>
          </div>

          {matchSaveSuccess && (
            <p role="status" aria-live="polite" className="text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-500/20 p-3 rounded-xl text-center">
              Match logistics updated &amp; synced with Nexus node.
            </p>
          )}

          <button type="submit"
            className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-sans font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-md">
            <PlusCircle className="h-4 w-4" />
            <span>Save Match Configurations</span>
          </button>
        </form>

        {/* Live match board */}
        <div className="md:col-span-2 space-y-4">
          <h3 className="font-sans font-bold text-sm text-slate-300 uppercase">Live Match Board</h3>

          {matches.length === 0 ? (
            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl text-center text-slate-500 text-xs">
              No matches set up yet. Submit the form to create matches.
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map((m) => (
                <div key={m.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 h-1 w-full bg-emerald-500" />
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-500 uppercase">{m.stadiumName}</span>
                    <span className={`px-2 py-0.5 rounded-full ${m.published ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'}`}>
                      {m.published ? 'Live' : 'Draft'}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-white">{m.matchName}</h4>
                    <p className="text-xs text-slate-400">{m.matchDate} @ {m.matchTime}</p>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-800/60 pt-2 text-xs">
                    <span className="text-slate-500">Ticket pricing:</span>
                    <strong className="text-emerald-400">${m.ticketPrice}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
