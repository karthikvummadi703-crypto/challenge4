import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface FanMedicalTabProps {
  emergencySeat: string;
  onEmergencySeatChange: (v: string) => void;
  emergencySuccess: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export default function FanMedicalTab({ emergencySeat, onEmergencySeatChange, emergencySuccess, onSubmit }: FanMedicalTabProps) {
  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <span className="text-[10px] font-mono text-red-500 uppercase font-bold tracking-widest">Safety Assistance</span>
        <h2 className="text-2xl font-black text-white tracking-wide uppercase">In-Stadium Emergency</h2>
        <p className="text-xs text-slate-500">Contact our stadium response team instantly</p>
      </div>

      <form onSubmit={onSubmit} className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl space-y-5 text-center">
        <div className="h-20 w-20 rounded-full bg-red-500/10 border-2 border-red-500/30 text-red-500 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(239,68,68,0.2)] animate-pulse">
          <ShieldAlert className="h-10 w-10" />
        </div>

        <div className="space-y-1">
          <h3 className="font-sans font-black text-lg text-white uppercase">Critical Beacon Portal</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">Triggering this sends high-priority paramedic dispatch directly to your reported coordinate location.</p>
        </div>

        <div>
          <label htmlFor="emergency-seat" className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-2">Verify Your Coordinate Seat</label>
          <input id="emergency-seat" type="text" required value={emergencySeat}
            onChange={(e) => onEmergencySeatChange(e.target.value)}
            className="max-w-[200px] text-center px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-base font-mono text-red-400 uppercase outline-none focus:border-red-500 transition-all" />
        </div>

        {emergencySuccess && (
          <div role="alert" aria-live="assertive" className="p-3 bg-red-950/20 border border-red-500/30 text-red-400 text-xs rounded-xl font-medium">
            EMERGENCY RESOLUTION ACTIVE. Paramedic team is dispatching. Stay seated.
          </div>
        )}

        <button type="submit"
          className="w-full py-3.5 rounded-2xl bg-red-500 hover:bg-red-400 text-white font-sans font-black text-sm uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_20px_rgba(239,68,68,0.3)]">
          Trigger Emergency Aid
        </button>

        <div className="pt-2">
          <span className="text-[10px] text-slate-600 font-mono uppercase">Average paramedic arrival time: 2.4 minutes</span>
        </div>
      </form>
    </div>
  );
}
