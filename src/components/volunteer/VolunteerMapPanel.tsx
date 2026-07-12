/**
 * Volunteer dashboard map panel.
 *
 * Renders the stadium seat map (`StadiumSeatMap`) alongside a navigation
 * guide and, when `highlightedSeat` is set, a destination badge showing
 * the target seat. Active tasks are passed through to the seat map so task
 * pins are rendered on the map. Purely presentational.
 */
import React from 'react';
import { Navigation } from 'lucide-react';
import { Task } from '../../types';
import StadiumSeatMap from '../StadiumSeatMap';

interface VolunteerMapPanelProps {
  highlightedSeat: string | undefined;
  activeTasks: Task[];
}

export default function VolunteerMapPanel({ highlightedSeat, activeTasks }: VolunteerMapPanelProps) {
  return (
    <div className="flex flex-col justify-between space-y-6">
      <div className="flex-1 flex flex-col justify-start">
        <h3 className="font-sans font-bold text-sm text-slate-300 uppercase tracking-wider mb-2">High-Precision Location</h3>
        <div className="flex-1 min-h-[350px]">
          <StadiumSeatMap highlightedSeat={highlightedSeat} activeTasks={activeTasks} />
        </div>
      </div>

      {/* Navigation guide */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Navigation className="h-5 w-5 text-emerald-400" />
          <div>
            <h4 className="text-xs font-bold text-white uppercase">Operational Concours Navigation</h4>
            <p className="text-[10px] text-slate-500">Auto-routes through secure emergency service tunnels</p>
          </div>
        </div>
        {highlightedSeat && (
          <span className="text-xs font-mono font-bold bg-slate-950 px-2.5 py-1 border border-slate-850 text-emerald-400 rounded-lg">
            TO: {highlightedSeat}
          </span>
        )}
      </div>
    </div>
  );
}
