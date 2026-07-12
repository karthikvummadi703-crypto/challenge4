/**
 * Volunteer dashboard header bar.
 *
 * Displays the NEXUS AI brand, the active volunteer's name and ID badge,
 * and a logout button. Purely presentational.
 */
import React from 'react';

interface VolunteerHeaderProps {
  volunteerName: string;
  volunteerId: string;
  onLogout: () => void;
}

export default function VolunteerHeader({ volunteerName, volunteerId, onLogout }: VolunteerHeaderProps) {
  return (
    <header className="bg-slate-900 border-b border-slate-800/80 px-6 py-4 flex items-center justify-between z-10 shrink-0">
      <div className="flex items-center space-x-4">
        <div className="h-9 w-9 rounded-xl bg-emerald-500 text-black flex items-center justify-center font-bold text-base shadow-md">
          V
        </div>
        <div>
          <h2 className="font-sans font-bold text-sm tracking-wider">NEXUS <span className="text-emerald-400 font-extrabold">AI</span></h2>
          <div className="flex items-center space-x-1.5 text-[10px] font-mono text-slate-400">
            <span className="font-bold text-white uppercase">{volunteerName}</span>
            <span>•</span>
            <span className="text-emerald-400 font-bold">{volunteerId}</span>
          </div>
        </div>
      </div>

      <button onClick={onLogout}
        className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-red-950/20 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-red-400 border border-slate-850 hover:border-red-900/30 transition-all cursor-pointer">
        Logout Device
      </button>
    </header>
  );
}
