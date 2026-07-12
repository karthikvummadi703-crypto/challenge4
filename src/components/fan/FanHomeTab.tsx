import React from 'react';
import { Coffee, ShieldAlert, AlertTriangle } from 'lucide-react';
import StadiumSeatMap from '../StadiumSeatMap';
import MatchTimer from '../MatchTimer';

interface FanHomeTabProps {
  seatNumber: string;
}

export default function FanHomeTab({ seatNumber }: FanHomeTabProps) {
  return (
    <div className="space-y-6">
      {/* Live match scoreboard */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-indigo-500" />

        <div className="text-center space-y-1 text-slate-500 text-[10px] font-mono uppercase font-bold tracking-widest">
          <span>FIFA World Cup 2026 • Group Stage</span>
        </div>

        <div className="flex items-center justify-center space-x-8 sm:space-x-12 mt-4">
          <div className="flex flex-col items-center space-y-1">
            <div className="h-10 w-14 bg-red-950/20 border border-red-900/30 text-red-500 flex items-center justify-center rounded-lg text-lg font-black tracking-wider">
              POR
            </div>
            <span className="text-xs font-bold text-white uppercase">Portugal</span>
          </div>

          <div className="text-center space-y-1">
            <div className="text-3xl sm:text-4xl font-sans font-black tracking-wider text-white">2 - 1</div>
            <MatchTimer />
          </div>

          <div className="flex flex-col items-center space-y-1">
            <div className="h-10 w-14 bg-blue-950/20 border border-blue-900/30 text-blue-500 flex items-center justify-center rounded-lg text-lg font-black tracking-wider">
              ARG
            </div>
            <span className="text-xs font-bold text-white uppercase">Argentina</span>
          </div>
        </div>

        <div className="text-center text-slate-500 text-[11px] font-mono mt-4 pt-3 border-t border-slate-800/40">
          <span>Estádio do Nexus • Attendance: <strong>48,567</strong></span>
        </div>
      </div>

      {/* Seat map */}
      <div className="space-y-3">
        <h3 className="font-sans font-bold text-sm text-slate-300 uppercase tracking-wider">Your Seat Location Pin</h3>
        <StadiumSeatMap highlightedSeat={seatNumber} />
      </div>

      {/* Tips cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
          <Coffee className="h-5 w-5 text-emerald-400 mb-2" />
          <h4 className="text-xs font-bold text-white uppercase mb-1">In-Seat Delivery</h4>
          <p className="text-[10px] text-slate-500">Order from your device, and our volunteers deliver straight to seat {seatNumber}.</p>
        </div>
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
          <ShieldAlert className="h-5 w-5 text-red-500 mb-2 animate-pulse" />
          <h4 className="text-xs font-bold text-white uppercase mb-1">Medical Care</h4>
          <p className="text-[10px] text-slate-500">Trigger the emergency beacon instantly if medical first-aid is required.</p>
        </div>
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
          <AlertTriangle className="h-5 w-5 text-amber-500 mb-2" />
          <h4 className="text-xs font-bold text-white uppercase mb-1">Issue Reporting</h4>
          <p className="text-[10px] text-slate-500">Report broken chairs, seat occupant errors, or dirty washrooms with 1 click.</p>
        </div>
      </div>
    </div>
  );
}
