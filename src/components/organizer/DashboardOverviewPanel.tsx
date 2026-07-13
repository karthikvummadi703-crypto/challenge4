import React, { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { Users, Coffee, AlertTriangle, Activity, Send, Sparkles } from 'lucide-react';
import { Volunteer, StadiumAlert } from '../../types';

const StadiumSeatMap = lazy(() => import('../StadiumSeatMap'));

interface DashboardStats {
  activeVolunteers: number;
  totalOrders: number;
  openIssues: number;
  activeEmergencies: number;
  attendance: number;
  recentAlerts: StadiumAlert[];
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  source?: string;
}

interface DashboardOverviewPanelProps {
  isPublished: boolean;
  stats: DashboardStats;
  volunteersList: Volunteer[];
  /** Controlled: messages lifted to parent so tab-switches do not clear history */
  messages: ChatMessage[];
  onSendCommand: (text: string) => Promise<ChatMessage>;
  onMessagesChange: (updater: (prev: ChatMessage[]) => ChatMessage[]) => void;
  ronaldoConcept: string;
}

const AI_CHIPS = [
  "Summarize today's incidents",
  "How many food orders are pending?",
  "Which gate is most congested?",
  "Show available volunteers",
];

export default function DashboardOverviewPanel({
  isPublished, stats, volunteersList, messages, onSendCommand, onMessagesChange, ronaldoConcept,
}: DashboardOverviewPanelProps) {
  const [inputText, setInputText] = useState('');
  const [isSendingMsg, setIsSendingMsg] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isSendingMsg) return;
    const userMsg: ChatMessage = { id: `user-${Date.now()}`, sender: 'user', text };
    onMessagesChange(prev => [...prev, userMsg]);
    setInputText('');
    setIsSendingMsg(true);
    try {
      const aiMsg = await onSendCommand(text);
      onMessagesChange(prev => [...prev, aiMsg]);
    } finally {
      setIsSendingMsg(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputText);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold tracking-widest">Real-time Overview</span>
          <h2 className="text-2xl font-black text-white tracking-wide uppercase">Stadium Command Intelligence</h2>
        </div>
        <div className="flex items-center space-x-3 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-xs">
          <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${isPublished ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <span className="font-semibold text-slate-300">Event Status: <strong className="text-white uppercase">{isPublished ? 'LIVE ON AIR' : 'PENDING SETUP'}</strong></span>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex items-center space-x-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Volunteers</span>
            <span className="text-xl font-bold text-white">{volunteersList.filter(v => v.status === 'active').length || stats.activeVolunteers}</span>
            <span className="text-[9px] text-emerald-400 font-mono block">Synchronized</span>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex items-center space-x-4">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <Coffee className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Food Orders</span>
            <span className="text-xl font-bold text-white">{stats.totalOrders}</span>
            <span className="text-[9px] text-slate-400 font-mono block">Delivery Active</span>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex items-center space-x-4">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Issues Reported</span>
            <span className="text-xl font-bold text-white">{stats.openIssues}</span>
            <span className="text-[9px] text-amber-400 font-mono block">Active Dispatch</span>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex items-center space-x-4">
          <div className="h-10 w-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shrink-0">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Medical Cases</span>
            <span className="text-xl font-bold text-red-400">{stats.activeEmergencies}</span>
            <span className="text-[9px] text-red-400 font-mono block">Critical Priority</span>
          </div>
        </div>
      </div>

      {/* Lower content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Heatmap + Alerts */}
        <div className="xl:col-span-2 space-y-6">
          <div>
            <h3 className="font-sans font-bold text-sm text-slate-300 uppercase tracking-wider mb-2">Stadium Occupancy Heatmap</h3>
            <Suspense fallback={<div className="h-64 rounded-xl bg-slate-900/40 border border-slate-800 animate-pulse" aria-label="Loading stadium map" />}>
              <StadiumSeatMap showHeatmap={true} />
            </Suspense>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
              <h3 className="font-sans font-bold text-sm text-white uppercase tracking-wider">Active Telemetry Alerts</h3>
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-semibold">Real-Time Dispatch</span>
            </div>
            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {stats.recentAlerts.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">All clear. No active alerts on stadium network.</p>
              ) : (
                stats.recentAlerts.map((alert: StadiumAlert) => (
                  <div key={alert.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${alert.type === 'Emergency' ? 'bg-red-500 animate-ping' : 'bg-amber-500'}`} />
                      <p className="text-xs text-slate-200 font-semibold">{alert.message}</p>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">
                      {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: AI Chat */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl flex flex-col h-[560px] overflow-hidden shadow-2xl relative">
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-sans font-extrabold text-xs text-white uppercase tracking-wider">Nexus AI Assistant</span>
            </div>
            <Sparkles className="h-4 w-4 text-emerald-400" />
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3.5 rounded-2xl ${msg.sender === 'user' ? 'bg-emerald-500 text-black font-semibold' : 'bg-slate-950 text-slate-200 border border-slate-850'}`}>
                  {msg.text}
                  {msg.source && (
                    <div className="text-[8px] opacity-60 mt-1 font-mono text-emerald-400 font-bold uppercase">
                      Engine: {msg.source}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isSendingMsg && (
              <div className="flex justify-start">
                <div className="bg-slate-950 text-slate-500 px-3 py-2 rounded-xl animate-pulse font-mono text-[10px]">
                  Querying Nexus Telemetry...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-3 bg-slate-950/40 border-t border-slate-800/50 flex flex-col space-y-1.5">
            <span className="text-[9px] text-slate-500 font-mono uppercase font-bold">Query Telemetry:</span>
            <div className="flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto">
              {AI_CHIPS.map((chipText, index) => (
                <button
                  key={index}
                  onClick={() => sendMessage(chipText)}
                  className="text-[10px] font-semibold bg-slate-950 hover:bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 hover:border-emerald-500/30 px-2.5 py-1 rounded-full transition-all text-left truncate max-w-full cursor-pointer"
                >
                  {chipText}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-3 bg-slate-950 border-t border-slate-850 flex items-center space-x-2">
            <label htmlFor="org-ai-input" className="sr-only">Ask command assistant</label>
            <input
              id="org-ai-input"
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask command assistant anything..."
              className="flex-1 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none transition-all placeholder:text-slate-600"
            />
            <button
              type="submit"
              aria-label="Send command"
              className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black transition-all cursor-pointer shadow-md"
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </form>

          <div className="absolute bottom-20 right-4 h-24 w-24 opacity-[0.03] pointer-events-none select-none">
            <img src={ronaldoConcept} alt="ronaldo" className="w-full h-full object-cover rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
