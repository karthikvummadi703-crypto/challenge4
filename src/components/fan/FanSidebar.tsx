/**
 * Fan dashboard sidebar navigation.
 *
 * Renders the user avatar initial, the three main tab buttons (Home, Food,
 * Medical, Issue), and a logout button.  Marks the active tab with
 * `aria-current="page"`. Purely presentational.
 */
import React from 'react';
import { Compass, Coffee, ShieldAlert, AlertTriangle, LogOut } from 'lucide-react';
import type { LucideProps } from 'lucide-react';

type FanTab = 'dashboard' | 'food' | 'medical' | 'issue';

interface FanSidebarProps {
  activeTab: FanTab;
  onTabChange: (tab: FanTab) => void;
  onLogout: () => void;
  userName: string;
  seatNumber: string;
}

const NAV_ITEMS: { tab: FanTab; label: string; Icon: React.FC<LucideProps> }[] = [
  { tab: 'dashboard', label: 'Dashboard',     Icon: Compass },
  { tab: 'food',      label: 'Food Ordering', Icon: Coffee },
  { tab: 'medical',   label: 'Medical Help',  Icon: ShieldAlert },
  { tab: 'issue',     label: 'Report Issue',  Icon: AlertTriangle },
];

export default function FanSidebar({ activeTab, onTabChange, onLogout, userName, seatNumber }: FanSidebarProps) {
  return (
    <aside className="w-full lg:w-64 bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-800/80 flex flex-col justify-between shrink-0 z-10">
      <div>
        {/* Fan identity header */}
        <div className="p-6 border-b border-slate-800/40 flex items-center space-x-3">
          <div className="h-9 w-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm" aria-hidden="true">
            {userName?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <h2 className="font-sans font-bold text-sm tracking-wider truncate max-w-[140px]">{userName}</h2>
            <span className="text-[10px] font-mono text-emerald-400 font-bold block uppercase tracking-wider">SEAT: {seatNumber}</span>
          </div>
        </div>

        <nav className="p-4 space-y-1" aria-label="Fan dashboard navigation">
          {NAV_ITEMS.map(({ tab, label, Icon }) => (
            <button key={tab} onClick={() => onTabChange(tab)}
              aria-current={activeTab === tab ? 'page' : undefined}
              className={`w-full text-left px-4 py-3 rounded-xl flex items-center space-x-3 text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer ${
                activeTab === tab
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}>
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-800/40">
        <button onClick={onLogout}
          className="w-full px-4 py-2.5 rounded-xl hover:bg-red-950/20 text-red-400 text-xs font-semibold tracking-wider uppercase flex items-center space-x-3 border border-transparent hover:border-red-900/30 transition-colors cursor-pointer">
          <LogOut className="h-4 w-4" />
          <span>Leave Fan Pass</span>
        </button>
      </div>
    </aside>
  );
}
