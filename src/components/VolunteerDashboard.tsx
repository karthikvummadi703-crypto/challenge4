import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserCheck, ClipboardList, CheckCircle, Navigation, MessageSquare, 
  Map, ShieldAlert, Sparkles, Coffee, LogOut, Send, RefreshCw, Star 
} from 'lucide-react';
import { Volunteer, Task } from '../types';
import StadiumSeatMap from './StadiumSeatMap';

interface VolunteerDashboardProps {
  onLogout: () => void;
}

export default function VolunteerDashboard({ onLogout }: VolunteerDashboardProps) {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [name, setName] = useState('');
  const [volunteerId, setVolunteerId] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Available demo accounts loaded from database
  const [demoAccounts, setDemoAccounts] = useState<Volunteer[]>([]);
  const [currentVolunteer, setCurrentVolunteer] = useState<Volunteer | null>(null);

  // Active Tasks State
  const [tasks, setTasks] = useState<Task[]>([]);
  
  // Highlighting seat destination on map
  const [highlightedSeat, setHighlightedSeat] = useState<string | undefined>(undefined);

  // Floating AI chat state
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiChatLogs, setAiChatLogs] = useState<Array<{ sender: 'vol' | 'ai'; text: string }>>([
    { sender: 'ai', text: "Hello! I am Nexus AI. I'll route you through the optimal tunnels for your current tasks." }
  ]);

  // Pre-load demo accounts and randomize login pre-fills on refresh
  useEffect(() => {
    fetch('/api/volunteers')
      .then(res => res.json())
      .then((vols: Volunteer[]) => {
        setDemoAccounts(vols);
        if (vols.length > 0) {
          // Whenever the page refreshes, automatically load another generated volunteer account
          const randomIndex = Math.floor(Math.random() * vols.length);
          const chosen = vols[randomIndex];
          setName(chosen.name);
          setVolunteerId(chosen.volunteerId);
        }
      })
      .catch(err => console.error("Error loading volunteers:", err));
  }, []);

  // Poll tasks once authenticated
  const loadTasks = () => {
    fetch('/api/tasks')
      .then(res => res.json())
      .then((data: Task[]) => {
        setTasks(data);
        
        // Auto-highlight the seat of any task assigned to this volunteer that is 'accepted'
        if (currentVolunteer) {
          const activeTask = data.find(t => t.assignedTo === currentVolunteer.volunteerId && t.status === 'accepted');
          if (activeTask) {
            setHighlightedSeat(activeTask.seatNumber);
          }
        }
      })
      .catch(err => console.error("Error loading tasks:", err));
  };

  useEffect(() => {
    if (isAuthenticated && currentVolunteer) {
      loadTasks();
      const interval = setInterval(loadTasks, 4000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, currentVolunteer]);

  // Login handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !volunteerId) return;

    fetch('/api/volunteer/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, volunteerId })
    })
      .then(res => {
        if (!res.ok) throw new Error("Credentials invalid or match not published yet.");
        return res.json();
      })
      .then(data => {
        setCurrentVolunteer(data.volunteer);
        setIsAuthenticated(true);
        setLoginError('');
      })
      .catch(err => {
        setLoginError(err.message || "Invalid name or unique ID. Check if event is published!");
      });
  };

  // Login with a specific chosen demo account
  const handleQuickLogin = (acc: Volunteer) => {
    setName(acc.name);
    setVolunteerId(acc.volunteerId);
    
    fetch('/api/volunteer/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: acc.name, volunteerId: acc.volunteerId })
    })
      .then(res => {
        if (!res.ok) throw new Error("Match not published or invalid volunteer status.");
        return res.json();
      })
      .then(data => {
        setCurrentVolunteer(data.volunteer);
        setIsAuthenticated(true);
        setLoginError('');
      })
      .catch(err => {
        setLoginError("This volunteer is pending. Organizers must click 'Publish Event' first!");
      });
  };

  // Accept task handler
  const handleAcceptTask = (taskId: string) => {
    if (!currentVolunteer) return;
    
    fetch(`/api/tasks/${taskId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ volunteerId: currentVolunteer.volunteerId })
    })
      .then(res => res.json())
      .then(() => {
        loadTasks();
      })
      .catch(err => console.error(err));
  };

  // Complete task handler
  const handleCompleteTask = (taskId: string) => {
    fetch(`/api/tasks/${taskId}/complete`, {
      method: 'POST'
    })
      .then(res => res.json())
      .then(() => {
        setHighlightedSeat(undefined);
        loadTasks();
      })
      .catch(err => console.error(err));
  };

  // Floating AI Chat Submission
  const handleSendAiText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiText.trim()) return;

    setAiChatLogs(prev => [...prev, { sender: 'vol', text: aiText }]);
    const query = aiText;
    setAiText('');

    // Simulated volunteer route intelligence responses
    setTimeout(() => {
      let reply = "I'm charting a route. Please proceed to the main concourse.";
      if (query.toLowerCase().includes('route') || query.toLowerCase().includes('go') || query.toLowerCase().includes('way')) {
        reply = "Avoid Tunnel C4. High traffic. Use Gate D service stairs for direct access to Level 2.";
      } else if (query.toLowerCase().includes('food') || query.toLowerCase().includes('popcorn') || query.toLowerCase().includes('drink')) {
        reply = "The main food stalls are in Section B. Your delivery ticket is pre-paid. Pickup in Row 3.";
      } else if (query.toLowerCase().includes('medical') || query.toLowerCase().includes('chest') || query.toLowerCase().includes('emergency')) {
        reply = "URGENT: Proceed with emergency kit immediately. Sector C paramedics are informed and on standby.";
      }
      setAiChatLogs(prev => [...prev, { sender: 'ai', text: reply }]);
    }, 600);
  };

  // LOGIN INTERFACE
  if (!isAuthenticated) {
    return (
      <div id="volunteer-login-container" className="relative min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 overflow-hidden">
        
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-950/70 to-emerald-950/20" />
        </div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="relative z-10 w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(16,185,129,0.06)] space-y-6"
        >
          <div className="text-center space-y-2">
            <div className="h-12 w-12 rounded-xl bg-emerald-500 text-black flex items-center justify-center mx-auto shadow-md">
              <UserCheck className="h-6 w-6" />
            </div>
            <h2 className="font-sans font-black text-xl text-white uppercase tracking-wider">Volunteer Gateway</h2>
            <p className="text-xs text-slate-500">Sign in using your pre-assigned security code credentials</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1.5">First Name</label>
                <input 
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-xs text-white outline-none transition-all"
                  placeholder="Karthik"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1.5">Volunteer ID</label>
                <input 
                  type="text"
                  required
                  value={volunteerId}
                  onChange={(e) => setVolunteerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-xs text-white font-mono outline-none transition-all"
                  placeholder="VOL-4821"
                />
              </div>
            </div>

            {loginError && (
              <p className="text-xs text-red-500 font-semibold bg-red-950/30 border border-red-500/20 rounded-xl p-3 text-center">{loginError}</p>
            )}

            <button 
              type="submit"
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-sans font-black text-xs uppercase tracking-widest shadow-md transition-all cursor-pointer"
            >
              Log In to Device
            </button>
          </form>

          {/* Quick Click Demo Selector */}
          <div className="pt-5 border-t border-slate-800/60">
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="text-slate-500 font-semibold uppercase tracking-wider">Demo Accounts (1-Click Login)</span>
              <span className="text-[10px] text-[var(--dynamic-accent)] font-mono font-bold flex items-center space-x-1 animate-pulse transition-colors duration-700">
                <span>Quick Select Account</span>
              </span>
            </div>

            {demoAccounts.length === 0 ? (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-center text-xs text-slate-500 space-y-1">
                <p>No volunteer profiles synced on database.</p>
                <p className="text-[10px] text-amber-500">Please go to "Organizer Dashboard" → "Volunteers" to register profiles & click "Publish Event".</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {demoAccounts.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => handleQuickLogin(acc)}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-850 hover:border-emerald-500 text-left transition-all group flex flex-col space-y-1 text-xs cursor-pointer hover:bg-emerald-500/5"
                  >
                    <span className="font-bold text-white group-hover:text-emerald-400 truncate">{acc.name}</span>
                    <span className="font-mono text-[9px] text-slate-500 font-bold uppercase tracking-wider">{acc.volunteerId}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // LOGGED IN DASHBOARD
  const myAssignedTasks = tasks.filter(t => t.assignedTo === currentVolunteer?.volunteerId && t.status !== 'completed');
  const otherTasks = tasks.filter(t => t.status === 'pending');

  return (
    <div id="volunteer-dashboard-root" className="min-h-screen bg-slate-950 text-white flex flex-col">
      
      {/* Header bar */}
      <header className="bg-slate-900 border-b border-slate-800/80 px-6 py-4 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center space-x-4">
          <div className="h-9 w-9 rounded-xl bg-emerald-500 text-black flex items-center justify-center font-bold text-base shadow-md">
            V
          </div>
          <div>
            <h2 className="font-sans font-bold text-sm tracking-wider">NEXUS <span className="text-emerald-400 font-extrabold">AI</span></h2>
            <div className="flex items-center space-x-1.5 text-[10px] font-mono text-slate-400">
              <span className="font-bold text-white uppercase">{currentVolunteer?.name}</span>
              <span>•</span>
              <span className="text-emerald-400 font-bold">{currentVolunteer?.volunteerId}</span>
            </div>
          </div>
        </div>

        <button 
          onClick={onLogout}
          className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-red-950/20 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-red-400 border border-slate-850 hover:border-red-900/30 transition-all cursor-pointer"
        >
          Logout Device
        </button>
      </header>

      {/* Main split screen layout */}
      <main className="flex-1 p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch relative overflow-y-auto">
        
        {/* Left pane: Task stacks */}
        <div className="space-y-6 flex flex-col justify-start">
          
          {/* Active Assigned Task Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-sans font-bold text-sm text-white uppercase tracking-wider">My Active Task</h3>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono font-bold uppercase">SLA In-Progress</span>
            </div>

            {myAssignedTasks.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl text-center text-xs text-slate-500">
                You do not have any active assignments. Select a task below to dispatch.
              </div>
            ) : (
              <div className="space-y-3">
                {myAssignedTasks.map((task) => (
                  <div key={task.id} className="bg-slate-900 border-2 border-emerald-500 rounded-2xl p-4 space-y-4 relative overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${task.type === 'Medical Emergency' ? 'text-red-400' : 'text-emerald-400'}`}>{task.type}</span>
                        <h4 className="font-bold text-base text-white mt-0.5">{task.details}</h4>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono uppercase font-black ${task.priority === 'High' ? 'bg-red-950 text-red-400 border border-red-500/20' : 'bg-slate-800 text-slate-300'}`}>
                        {task.priority} Priority
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-slate-950 p-3 rounded-xl border border-slate-850 text-xs">
                      <div>
                        <span className="text-slate-500 text-[10px] font-semibold uppercase block">Delivery Seat</span>
                        <strong className="text-white text-sm font-mono">{task.seatNumber}</strong>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 text-[10px] font-semibold uppercase block">Route Assist</span>
                        <button 
                          onClick={() => setHighlightedSeat(task.seatNumber)}
                          className="text-[10px] font-bold text-emerald-400 hover:underline flex items-center justify-end space-x-1 ml-auto cursor-pointer"
                        >
                          <Navigation className="h-3 w-3" />
                          <span>Show on map</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleCompleteTask(task.id)}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-sans font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-md"
                      >
                        Complete Assignment
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Dispatches Task Stack */}
          <div className="space-y-3 flex-1">
            <div className="flex items-center justify-between border-b border-slate-800/40 pb-2">
              <h3 className="font-sans font-bold text-sm text-slate-400 uppercase tracking-wider">Live Task Stack</h3>
              <span className="text-[10px] font-mono text-slate-500 font-bold">{otherTasks.length} pending queues</span>
            </div>

            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {otherTasks.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-600">
                  Stadium operations are fully optimized. No pending alerts in stack.
                </div>
              ) : (
                otherTasks.map((task) => (
                  <div 
                    key={task.id}
                    onClick={() => setHighlightedSeat(task.seatNumber)}
                    className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className={`h-2 w-2 rounded-full ${task.type === 'Medical Emergency' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                        <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider">{task.type}</span>
                      </div>
                      <h4 className="font-bold text-sm text-white group-hover:text-emerald-400 transition-colors">{task.details}</h4>
                      <p className="text-[10px] font-mono text-slate-500">Seat location: <strong className="text-white">{task.seatNumber}</strong></p>
                    </div>

                    <div className="flex flex-col items-end space-y-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-mono uppercase font-bold ${task.priority === 'High' ? 'bg-red-950/40 text-red-400' : 'bg-slate-950 text-slate-400'}`}>
                        {task.priority}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAcceptTask(task.id);
                        }}
                        disabled={myAssignedTasks.length > 0}
                        className="px-4 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 border border-emerald-500/20 text-emerald-400 hover:text-black font-sans font-bold text-[10px] uppercase tracking-wider transition-all disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-emerald-400 cursor-pointer"
                      >
                        Accept
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Right pane: Seat map and Floating assistant */}
        <div className="flex flex-col justify-between space-y-6">
          <div className="flex-1 flex flex-col justify-start">
            <h3 className="font-sans font-bold text-sm text-slate-300 uppercase tracking-wider mb-2">High-Precision Location</h3>
            <div className="flex-1 min-h-[350px]">
              <StadiumSeatMap 
                highlightedSeat={highlightedSeat}
                activeTasks={tasks}
              />
            </div>
          </div>

          {/* Interactive Tunnel guide card */}
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

      </main>

      {/* FLOATING NEXUS AI ASSISTANT PANEL */}
      <div className="fixed bottom-6 right-6 z-40">
        <AnimatePresence>
          {showAIChat && (
            <motion.div
              initial={{ scale: 0.9, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 15, opacity: 0 }}
              className="absolute bottom-16 right-0 w-80 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-96"
            >
              <div className="p-3 bg-slate-950 border-b border-slate-850 flex items-center justify-between">
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">Tunnel Navigator AI</span>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              </div>

              {/* Chat log */}
              <div className="flex-1 p-3.5 overflow-y-auto space-y-3 text-xs font-sans">
                {aiChatLogs.map((log, i) => (
                  <div key={i} className={`flex ${log.sender === 'vol' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-2.5 rounded-xl max-w-[85%] ${log.sender === 'vol' ? 'bg-emerald-500 text-black font-semibold' : 'bg-slate-950 text-slate-200 border border-slate-850'}`}>
                      {log.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Suggestions shortcuts */}
              <div className="p-2 bg-slate-950/60 border-t border-slate-850/50 flex space-x-1 overflow-x-auto whitespace-nowrap">
                {["Tunnel guide", "Medical route", "Section B pickup"].map((item, index) => (
                  <button 
                    key={index}
                    onClick={() => {
                      setAiText(item);
                    }}
                    className="text-[9px] font-semibold bg-slate-950 text-emerald-400 border border-emerald-500/10 hover:border-emerald-500/30 px-2 py-0.5 rounded-full cursor-pointer shrink-0"
                  >
                    {item}
                  </button>
                ))}
              </div>

              {/* Input */}
              <form onSubmit={handleSendAiText} className="p-2 bg-slate-950 border-t border-slate-850 flex items-center space-x-2">
                <input 
                  type="text"
                  required
                  placeholder="Ask route guide..."
                  value={aiText}
                  onChange={(e) => setAiText(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 text-xs px-2.5 py-1.5 rounded-lg text-white focus:outline-none"
                />
                <button type="submit" className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black cursor-pointer">
                  <Send className="h-3 w-3" />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAIChat(!showAIChat)}
          className="h-12 w-12 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center shadow-xl cursor-pointer z-50 border-2 border-slate-950"
        >
          <MessageSquare className="h-5 w-5" />
        </motion.button>
      </div>

    </div>
  );
}
