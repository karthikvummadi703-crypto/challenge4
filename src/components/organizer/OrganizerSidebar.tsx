import React from 'react';
import type { LucideProps } from 'lucide-react';
import { LayoutDashboard, PlusCircle, Users, Settings, LogOut } from 'lucide-react';

type OrganizerTab = 'dashboard' | 'setup' | 'volunteers';

interface OrganizerSidebarProps {
  activeTab: OrganizerTab;
  onTabChange: (tab: OrganizerTab) => void;
  onOpenSettings: () => void;
  onLogout: () => void;
}

export default function OrganizerSidebar({ activeTab, onTabChange, onOpenSettings, onLogout }: OrganizerSidebarProps) {
  return (
    <aside className="w-full lg:w-64 bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-800/80 flex flex-col justify-between shrink-0 z-10">
      <div>
        {/* Brand header */}
        <div className="p-6 border-b border-slate-800/40 flex items-center space-x-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-500 text-black flex items-center justify-center font-bold text-base shadow-md">
            N
          </div>
          <div>
            <h2 className="font-sans font-bold text-sm tracking-wider">NEXUS <span className="text-emerald-400 font-extrabold">AI</span></h2>
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block">ADMIN PANEL</span>
          </div>
        </div>

        {/* Nav links */}
        <nav aria-label="Admin navigation" className="p-4 space-y-1">
          {([
            { tab: 'dashboard', label: 'Dashboard',    Icon: LayoutDashboard },
            { tab: 'setup',     label: 'Match Setup',  Icon: PlusCircle },
            { tab: 'volunteers',label: 'Volunteers',   Icon: Users },
          ] as { tab: OrganizerTab; label: string; Icon: React.FC<LucideProps> }[]).map(({ tab, label, Icon }) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              aria-current={activeTab === tab ? 'page' : undefined}
              className={`w-full text-left px-4 py-3 rounded-xl flex items-center space-x-3 text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer ${
                activeTab === tab
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Sidebar Footer Controls */}
      <div className="p-4 border-t border-slate-800/40 space-y-2">
        <button
          onClick={onOpenSettings}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold tracking-wider uppercase flex items-center space-x-3 transition-colors cursor-pointer"
        >
          <Settings className="h-4 w-4 text-emerald-400" />
          <span>n8n Settings</span>
        </button>

        <button
          onClick={onLogout}
          className="w-full px-4 py-2.5 rounded-xl hover:bg-red-950/20 text-red-400 text-xs font-semibold tracking-wider uppercase flex items-center space-x-3 border border-transparent hover:border-red-900/30 transition-colors cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout Panel</span>
        </button>
      </div>
    </aside>
  );
}
