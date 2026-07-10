import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, ShieldAlert, Coffee, AlertTriangle } from 'lucide-react';

interface SeatMapProps {
  highlightedSeat?: string;
  activeTasks?: { id: string; type: string; seatNumber: string; priority: string; status: string }[];
  showHeatmap?: boolean;
  onSeatSelect?: (seatId: string) => void;
}

export default function StadiumSeatMap({
  highlightedSeat,
  activeTasks = [],
  showHeatmap = false,
  onSeatSelect
}: SeatMapProps) {
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);

  // Parse seat to highlight
  // Format typically "A12-24" or "C18-10" or "D-05"
  const getSectionFromSeat = (seat?: string) => {
    if (!seat) return null;
    const clean = seat.toUpperCase();
    if (clean.startsWith('A')) return 'A';
    if (clean.startsWith('B')) return 'B';
    if (clean.startsWith('C')) return 'C';
    if (clean.startsWith('D')) return 'D';
    return null;
  };

  const highlightedSection = getSectionFromSeat(highlightedSeat);

  // Stadium sectors data
  const sectors = [
    { id: 'A', name: 'Sector A (North)', color: 'from-emerald-600/80 to-teal-500/80', text: 'text-emerald-400', heatmapIntensity: 'fill-emerald-400/30', d: 'M 100 80 Q 250 10 400 80 L 370 120 Q 250 65 130 120 Z' },
    { id: 'B', name: 'Sector B (East)', color: 'from-blue-600/80 to-indigo-500/80', text: 'text-blue-400', heatmapIntensity: 'fill-orange-500/40', d: 'M 400 80 Q 490 200 400 320 L 370 280 Q 435 200 370 120 Z' },
    { id: 'C', name: 'Sector C (South)', color: 'from-purple-600/80 to-pink-500/80', text: 'text-purple-400', heatmapIntensity: 'fill-rose-600/60', d: 'M 400 320 Q 250 390 100 320 L 130 280 Q 250 335 370 280 Z' },
    { id: 'D', name: 'Sector D (West)', color: 'from-amber-600/80 to-orange-500/80', text: 'text-amber-400', heatmapIntensity: 'fill-yellow-500/50', d: 'M 100 320 Q 10 200 100 80 L 130 120 Q 65 200 130 280 Z' }
  ];

  // Map tasks to positions on the stadium map for visual indicators
  const getTaskCoords = (seat: string) => {
    const section = getSectionFromSeat(seat);
    switch (section) {
      case 'A': return { x: 250, y: 70 };
      case 'B': return { x: 410, y: 200 };
      case 'C': return { x: 250, y: 330 };
      case 'D': return { x: 90, y: 200 };
      default: return { x: 250, y: 200 };
    }
  };

  return (
    <div id="stadium-seat-map-container" className="relative w-full aspect-[5/4] bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between overflow-hidden shadow-2xl backdrop-blur-md">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-radial from-emerald-950/10 via-transparent to-transparent pointer-events-none" />

      {/* Title Bar */}
      <div className="flex items-center justify-between z-10">
        <div>
          <span className="text-xs font-semibold tracking-widest text-emerald-400 uppercase">Estádio do Nexus</span>
          <h4 className="text-sm font-medium text-white">Live Seating & Telemetry</h4>
        </div>
        {showHeatmap && (
          <div className="flex items-center space-x-1.5 bg-rose-950/40 border border-rose-800/30 px-2.5 py-1 rounded-full">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
            <span className="text-[10px] font-mono text-rose-400 font-semibold uppercase">Heatmap Active</span>
          </div>
        )}
      </div>

      {/* SVG Canvas */}
      <div className="relative flex-1 flex items-center justify-center my-2">
        <svg viewBox="0 0 500 400" className="w-full max-w-[420px] h-auto drop-shadow-[0_0_15px_rgba(16,185,129,0.15)]">
          {/* Outer Boundary Track */}
          <ellipse cx="250" cy="200" rx="220" ry="170" fill="none" stroke="#1e293b" strokeWidth="4" strokeDasharray="6 4" />
          
          {/* Mid Boundary Track */}
          <ellipse cx="250" cy="200" rx="180" ry="130" fill="none" stroke="#334155" strokeWidth="1" />

          {/* Interactive Sectors */}
          {sectors.map((sec) => {
            const isHovered = hoveredSection === sec.id;
            const isHighlighted = highlightedSection === sec.id;
            
            // Determine filling color
            let fillClass = "fill-slate-900/80 stroke-slate-700/60 stroke-2";
            
            if (showHeatmap) {
              if (sec.id === 'C') fillClass = "fill-rose-700/80 stroke-rose-500/80 stroke-2";
              else if (sec.id === 'D') fillClass = "fill-amber-600/80 stroke-amber-500/80 stroke-2";
              else if (sec.id === 'B') fillClass = "fill-emerald-700/60 stroke-emerald-500/60 stroke-2";
              else fillClass = "fill-emerald-800/40 stroke-emerald-600/40 stroke-2";
            } else if (isHighlighted) {
              fillClass = `fill-emerald-500/20 stroke-emerald-400 stroke-[3px] shadow-[0_0_15px_rgba(16,185,129,0.3)]`;
            } else if (isHovered) {
              fillClass = "fill-slate-800/90 stroke-slate-500 stroke-2";
            }

            return (
              <g 
                key={sec.id}
                className="cursor-pointer transition-all duration-300"
                onMouseEnter={() => setHoveredSection(sec.id)}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => onSeatSelect?.(sec.id)}
              >
                <path 
                  d={sec.d} 
                  className={`${fillClass} transition-all duration-300`} 
                />
                
                {/* Sector text labels */}
                {!showHeatmap && (
                  <text 
                    x={sec.id === 'A' ? 250 : sec.id === 'B' ? 390 : sec.id === 'C' ? 250 : 110} 
                    y={sec.id === 'A' ? 65 : sec.id === 'B' ? 205 : sec.id === 'C' ? 345 : 205} 
                    textAnchor="middle" 
                    className={`font-sans text-[11px] font-bold tracking-wider fill-slate-400 select-none ${isHighlighted ? 'fill-emerald-400 font-extrabold' : ''}`}
                  >
                    {sec.id}
                  </text>
                )}
              </g>
            );
          })}

          {/* Central Pitch (Football Field) */}
          <g transform="translate(170, 150)">
            {/* Turf */}
            <rect width="160" height="100" rx="6" fill="#042a1b" stroke="#10b981" strokeWidth="2.5" className="opacity-90 shadow-inner" />
            {/* Outer Boundary line */}
            <rect x="5" y="5" width="150" height="90" fill="none" stroke="#10b981" strokeWidth="1.2" className="opacity-60" />
            {/* Center Circle */}
            <circle cx="80" cy="50" r="22" fill="none" stroke="#10b981" strokeWidth="1.2" className="opacity-60" />
            <circle cx="80" cy="50" r="2" fill="#10b981" />
            {/* Center Line */}
            <line x1="80" y1="5" x2="80" y2="95" stroke="#10b981" strokeWidth="1.2" className="opacity-60" />
            {/* Goal Areas */}
            <rect x="5" y="25" width="18" height="50" fill="none" stroke="#10b981" strokeWidth="1.2" className="opacity-60" />
            <rect x="137" y="25" width="18" height="50" fill="none" stroke="#10b981" strokeWidth="1.2" className="opacity-60" />
            {/* Penalty spots */}
            <circle cx="23" cy="50" r="1.2" fill="#10b981" />
            <circle cx="137" cy="50" r="1.2" fill="#10b981" />
          </g>

          {/* Dynamic Map Pins for Active Live Tasks / Events */}
          {activeTasks.filter(t => t.status !== 'completed').map((task) => {
            const coords = getTaskCoords(task.seatNumber);
            const isMedical = task.type === 'Medical Emergency';
            const isFood = task.type === 'Deliver Food';
            const pinColor = isMedical ? 'text-red-500 fill-red-500' : isFood ? 'text-emerald-400 fill-emerald-400' : 'text-amber-500 fill-amber-500';
            const bgGlow = isMedical ? 'rgba(239, 68, 68, 0.4)' : isFood ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)';

            return (
              <g key={task.id} className="cursor-pointer">
                {/* Ripple Pulsing Circle */}
                <circle 
                  cx={coords.x} 
                  cy={coords.y} 
                  r="14" 
                  fill="none" 
                  stroke={isMedical ? '#ef4444' : isFood ? '#10b981' : '#f59e0b'} 
                  strokeWidth="1.5"
                  className="animate-ping origin-center"
                  style={{ transformOrigin: `${coords.x}px ${coords.y}px`, animationDuration: '2s' }}
                />
                
                {/* Core Anchor Dot */}
                <circle cx={coords.x} cy={coords.y} r="8" fill={isMedical ? '#ef4444' : isFood ? '#042a1b' : '#1e1b4b'} className="stroke-slate-900 stroke-2" />
                
                {/* Vector Mini Icon Overlay */}
                <g transform={`translate(${coords.x - 5}, ${coords.y - 5})`}>
                  {isMedical ? (
                    <path d="M5 1v8M1 5h8" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                  ) : isFood ? (
                    <circle cx="5" cy="5" r="3" fill="#10b981" />
                  ) : (
                    <path d="M5 1v5M5 8v1" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
                  )}
                </g>
              </g>
            );
          })}

          {/* Highlighted Selected Seat Marker Pin */}
          {highlightedSeat && (
            <g>
              {(() => {
                const coords = getTaskCoords(highlightedSeat);
                return (
                  <>
                    <g transform={`translate(${coords.x - 12}, ${coords.y - 28})`}>
                      <motion.path 
                        initial={{ y: -10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ repeat: Infinity, repeatType: "reverse", duration: 0.8 }}
                        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                        fill="#10b981"
                        className="drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                      />
                    </g>
                    {/* Pulsing Base Ring */}
                    <ellipse cx={coords.x} cy={coords.y + 2} rx="6" ry="3" fill="none" stroke="#10b981" strokeWidth="1.5" className="animate-pulse" />
                  </>
                );
              })()}
            </g>
          )}
        </svg>
      </div>

      {/* Map Legend */}
      <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-slate-800/40 z-10">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-400" />
          <span className="text-[10px] text-slate-400">Your Location</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500 animate-pulse" />
          <span className="text-[10px] text-slate-400">Medical Responders</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500" />
          <span className="text-[10px] text-slate-400">Issue Reports</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-teal-500/20 border border-teal-500" />
          <span className="text-[10px] text-slate-400">Food Logistics</span>
        </div>
      </div>
    </div>
  );
}
