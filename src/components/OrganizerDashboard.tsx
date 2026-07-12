import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Key, LayoutDashboard, PlusCircle, Users, CheckCircle, 
  Map, MessageSquare, LogOut, Trash2, Send, Activity, Settings, 
  AlertTriangle, Coffee, RefreshCw, Sparkles, HelpCircle, Loader2 
} from 'lucide-react';
import { Match, Volunteer, Task, SystemConfig, StadiumAlert } from '../types';
import StadiumSeatMap from './StadiumSeatMap';
import { useAuth } from '../context/authContext';
import { adminCreateVolunteer, verifyAdminAccess } from '../services/userService';
import { getFriendlyErrorMessage } from '../services/authService';
import { sendAICommand as sendAICommandRequest } from '../services/apiClient';
import { subscribeCollection, addRecord, deleteRecord, publishSystemConfig } from '../services/dataSource';
import { useDemoMode } from '../context/demoModeContext';
import { useModalA11y } from '../hooks/useModalA11y';

interface OrganizerDashboardProps {
  onLogout: () => void;
  stadiumBg: string;
  ronaldoConcept: string;
  onOpenSettings: () => void;
}

export default function OrganizerDashboard({ onLogout, stadiumBg, ronaldoConcept, onOpenSettings }: OrganizerDashboardProps) {
  const { user, role, loginUser, logoutUser, error, setError, loading } = useAuth();
  const { isDemoMode, demoRole } = useDemoMode();
  const isOrganizerDemo = isDemoMode && demoRole === 'organizer';

  // Authentication State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const isAuthenticated = isOrganizerDemo || (!!user && role === 'admin');

  // Dashboard Active Tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'setup' | 'volunteers'>('dashboard');

  // Match Form State
  const [stadiumName, setStadiumName] = useState('Estádio do Nexus');
  const [matchName, setMatchName] = useState('Portugal vs Argentina');
  const [matchDate, setMatchDate] = useState('18/07/2026');
  const [matchTime, setMatchTime] = useState('19:30');
  const [ticketPrice, setTicketPrice] = useState('120');
  const [matchSaveSuccess, setMatchSaveSuccess] = useState(false);

  // Volunteer Form State
  const [newVolunteerName, setNewVolunteerName] = useState('');
  const [newVolunteerEmail, setNewVolunteerEmail] = useState('');
  const [newVolunteerPassword, setNewVolunteerPassword] = useState('password123');
  const [newVolunteerGate, setNewVolunteerGate] = useState('Gate A');
  const [isCreatingVolunteer, setIsCreatingVolunteer] = useState(false);

  // Volunteer State
  const [volunteersList, setVolunteersList] = useState<Volunteer[]>([]);

  // Matches list
  const [matches, setMatches] = useState<Match[]>([]);

  // Publishing State
  const [isPublished, setIsPublished] = useState(false);
  const [showPublishSuccessModal, setShowPublishSuccessModal] = useState(false);
  const publishSuccessModalRef = useModalA11y<HTMLDivElement>(showPublishSuccessModal, () => {
    setShowPublishSuccessModal(false);
    setActiveTab('dashboard');
  });

  // Live Statistics state
  const [stats, setStats] = useState({
    activeVolunteers: 0,
    totalOrders: 0,
    openIssues: 0,
    activeEmergencies: 0,
    attendance: 0,
    recentAlerts: [] as StadiumAlert[]
  });

  // AI Chat State
  const [messages, setMessages] = useState<Array<{ id: string; sender: 'user' | 'ai'; text: string; source?: string }>>([
    { id: '1', sender: 'ai', text: "Welcome to Nexus AI Command Center. I can assist you with real-time operational query reports, incident coordination, heatmaps, and dispatcher automation." }
  ]);
  const [inputText, setInputText] = useState('');
  const [isSendingMsg, setIsSendingMsg] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Secondary Firestore admin guard ────────────────────────────────────────
  // Even after the auth-context loginUser() gate passes, verify on every mount
  // and whenever the authenticated user changes that a Firestore /admins doc
  // actually exists.  This catches any residual race-condition where a non-admin
  // Firebase Auth session survives into the dashboard.
  useEffect(() => {
    if (isOrganizerDemo) return;          // Demo mode bypasses Firestore
    if (!user) return;                     // Not logged in — login form shows

    let cancelled = false;
    verifyAdminAccess(user.uid, user.email ?? '')
      .then((isAdmin) => {
        if (cancelled) return;
        if (!isAdmin) {
          console.warn('[OrganizerDashboard] User is not in admins collection — forcing logout.');
          logoutUser().catch(() => null);
        }
      })
      .catch(() => {
        // Firestore unreachable → fail closed
        if (!cancelled) logoutUser().catch(() => null);
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, isOrganizerDemo]);

  // Real-time Firestore subscriptions for Admin Panel
  useEffect(() => {
    if (!isAuthenticated) return;

    // 1. Subscribe to Volunteers
    const unsubVolunteers = subscribeCollection('volunteers', (snapshot) => {
      const vols: Volunteer[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Record<string, string>;
        vols.push({
          id: docSnap.id,
          name: data.fullName || 'Volunteer',
          volunteerId: data.uid ? `VOL-${data.uid.substring(0, 4).toUpperCase()}` : 'VOL-0000',
          status: 'active'
        });
      });
      setVolunteersList(vols);
      setStats(prev => ({
        ...prev,
        activeVolunteers: vols.filter(v => v.status === 'active').length
      }));
    });

    // 2. Subscribe to Fans (Attendance)
    const unsubFans = subscribeCollection('fans', (snapshot) => {
      setStats(prev => ({
        ...prev,
        attendance: snapshot.size > 0 ? (snapshot.size + 48500) : 0
      }));
    });

    // 3. Subscribe to Food Orders
    const unsubOrders = subscribeCollection('foodOrders', (snapshot) => {
      setStats(prev => ({
        ...prev,
        totalOrders: snapshot.size
      }));
    });

    // 4. Subscribe to Issue Reports
    const unsubIssues = subscribeCollection('issueReports', (snapshot) => {
      const openIssuesCount = snapshot.docs.filter(d => d.data().status === 'open' || d.data().status === 'pending').length;
      
      const newAlerts: StadiumAlert[] = [];
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        if (d.status === 'open' || d.status === 'pending') {
          newAlerts.push({
            id: docSnap.id,
            type: (d.category as string) || 'Issue',
            message: (d.description as string) || 'Stadium issue logged',
            timestamp: (d.timestamp as string) || new Date().toISOString(),
          });
        }
      });

      setStats(prev => ({
        ...prev,
        openIssues: openIssuesCount,
        recentAlerts: [...prev.recentAlerts.filter(a => a.type === 'Emergency'), ...newAlerts]
      }));
    });

    // 5. Subscribe to Emergency Requests
    const unsubEmergencies = subscribeCollection('emergencyRequests', (snapshot) => {
      const activeEmergenciesCount = snapshot.docs.filter(d => d.data().status === 'active').length;
      
      const newEmergencies: StadiumAlert[] = [];
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        if (d.status === 'active') {
          newEmergencies.push({
            id: docSnap.id,
            type: 'Emergency',
            message: `CRITICAL BEACON AT SEAT ${d.seatNumber as string}`,
            timestamp: (d.timestamp as string) || new Date().toISOString(),
          });
        }
      });

      setStats(prev => ({
        ...prev,
        activeEmergencies: activeEmergenciesCount,
        recentAlerts: [...prev.recentAlerts.filter(a => a.type !== 'Emergency'), ...newEmergencies]
      }));
    });

    // 6. Subscribe to Matches
    const unsubMatches = subscribeCollection('matches', (snapshot) => {
      const matchesList: Match[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Record<string, string>;
        matchesList.push({
          id: docSnap.id,
          stadiumName: data.stadiumName,
          matchName: data.matchName,
          matchDate: data.matchDate,
          matchTime: data.matchTime,
          ticketPrice: Number(data.ticketPrice),
          published: Boolean(data.published),
        });
      });
      setMatches(matchesList);
      if (matchesList.some(m => m.published)) {
        setIsPublished(true);
      }
    });

    // 7. Subscribe to systemConfig for published status
    const unsubConfig = subscribeCollection('systemConfig', (snapshot) => {
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.isPublished) {
          setIsPublished(true);
        }
      });
    });

    return () => {
      unsubVolunteers();
      unsubFans();
      unsubOrders();
      unsubIssues();
      unsubEmergencies();
      unsubMatches();
      unsubConfig();
    };
  }, [isAuthenticated]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auth Handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoginError('');
    setIsLoggingIn(true);
    try {
      // NOTE: there is intentionally no client-side admin auto-creation here.
      // The single admin account is provisioned once via `scripts/seedAdmin.ts`
      // (Firebase Admin SDK, run from a trusted shell) — see README.md. Letting
      // the browser create /admins/{uid} documents would let any authenticated
      // user grant themselves admin access.
      await loginUser(email, password, 'admin');
    } catch (err: unknown) {
      setLoginError(getFriendlyErrorMessage(err));
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Match Save Handler
  const handleSaveMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addRecord('matches', {
        stadiumName,
        matchName,
        matchDate,
        matchTime,
        ticketPrice: Number(ticketPrice),
        published: true, // Auto publish on save for seamless flow
        timestamp: new Date().toISOString()
      });

      // Update the system configuration to mark published
      await publishSystemConfig();

      setMatchSaveSuccess(true);
      setTimeout(() => setMatchSaveSuccess(false), 3000);
    } catch (e) {
      console.error("Error saving match to Firestore:", e);
    }
  };

  // Add Volunteer Handler
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const handleAddVolunteer = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName  = newVolunteerName.trim();
    const trimmedEmail = newVolunteerEmail.trim().toLowerCase();
    const trimmedPwd   = newVolunteerPassword.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPwd) {
      alert('All fields are required to register a volunteer.');
      return;
    }
    if (!EMAIL_RE.test(trimmedEmail)) {
      alert('Please enter a valid email address for the volunteer.');
      return;
    }
    if (trimmedPwd.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }

    setIsCreatingVolunteer(true);
    try {
      if (isOrganizerDemo) {
        // Demo Mode: skip Firebase Auth entirely and write straight to the
        // in-memory demo store so the new volunteer shows up instantly.
        await addRecord('volunteers', {
          uid: `demo-vol-${Date.now()}`,
          fullName: newVolunteerName.trim(),
          email: newVolunteerEmail.toLowerCase().trim(),
          role: 'volunteer',
          assignedGate: newVolunteerGate,
          active: true,
          createdAt: new Date().toISOString(),
        });
      } else {
        // Create Volunteer via admin endpoint/secondary instance
        await adminCreateVolunteer(
          newVolunteerName,
          newVolunteerEmail,
          newVolunteerPassword,
          newVolunteerGate
        );
      }

      // Clean up fields and reload list
      setNewVolunteerName('');
      setNewVolunteerEmail('');
      setNewVolunteerPassword('');
      setNewVolunteerGate('Gate A');
      
      // onSnapshot subscriptions update the volunteer list automatically
    } catch (err: unknown) {
      console.error("Failed to register volunteer:", err);
      alert(err instanceof Error ? err.message : "Failed to register volunteer. Ensure email is unique!");
    } finally {
      setIsCreatingVolunteer(false);
    }
  };

  // Remove Volunteer Handler
  const handleRemoveVolunteer = async (id: string) => {
    try {
      // Delete volunteer from Firestore volunteers collection
      await deleteRecord('volunteers', id);
      // onSnapshot subscription updates the list automatically
    } catch (e) {
      console.error("Failed to remove volunteer:", e);
    }
  };

  // Publish Event Handler
  const handlePublishEvent = async () => {
    try {
      await publishSystemConfig();
      setIsPublished(true);
      setShowPublishSuccessModal(true);
    } catch (e) {
      console.error("Error publishing event to Firestore:", e);
    }
  };

  // Send AI Command Handler
  const sendAICommand = async (textToSend: string) => {
    if (!textToSend.trim()) return;
    
    const userMsg = { id: `user-${Date.now()}`, sender: 'user' as const, text: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsSendingMsg(true);

    try {
      const data = await sendAICommandRequest(textToSend);
      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: data.response,
        source: data.source
      }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: "Error synchronizing with operational brain. Please check your n8n API settings."
      }]);
    } finally {
      setIsSendingMsg(false);
    }
  };

  const handleSendMessageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendAICommand(inputText);
  };

  // LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div id="organizer-login-container" className="relative min-h-screen bg-slate-950 flex items-center justify-center p-6 overflow-hidden">
        
        {/* Stadium backdrop */}
        <div className="gpu-blur-layer absolute inset-0">
          <img src={stadiumBg} alt="stadium" className="w-full h-full object-cover opacity-15 saturate-50 filter blur-[1px]" />
          <div className="absolute inset-0 bg-slate-950/80" />
        </div>

        {/* Login card — bg-slate-900 is a fully opaque solid color here, so
            backdrop-blur-md has nothing translucent to blur; dropped it since
            it did no visual work and only added an extra compositing layer
            behind the crisp form fields/text below. */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="gpu-blur-foreground w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-[0_0_50px_rgba(16,185,129,0.1)]"
        >
          <div className="text-center space-y-3 mb-8">
            <div className="h-14 w-14 rounded-2xl bg-emerald-500 text-black flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <Shield className="h-7 w-7" />
            </div>
            <div>
              <h2 className="font-sans font-black text-2xl text-white tracking-wide uppercase">Organizer Login</h2>
              <p className="text-xs text-slate-400">Sign in to orchestrate matches & task dispatch</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="org-email" className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-2">Email Address</label>
              <input
                id="org-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-sm text-white focus:ring-1 focus:ring-emerald-500/30 outline-none transition-all"
                placeholder="admin@nexusai.com"
              />
            </div>

            <div>
              <label htmlFor="org-password" className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-2">Security Key</label>
              <input
                id="org-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-sm text-white focus:ring-1 focus:ring-emerald-500/30 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>

            {loginError && (
              <p role="alert" className="text-xs text-red-500 font-semibold bg-red-950/30 border border-red-500/20 rounded-xl p-3 text-center">{loginError}</p>
            )}

            <button 
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-850 text-black font-sans font-black text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Logging in...</span>
                </>
              ) : (
                <>
                  <Key className="h-4 w-4" />
                  <span>Login to Command Center</span>
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // LOGGED IN DASHBOARD VIEW
  return (
    <div id="organizer-dashboard-root" className="min-h-screen bg-slate-950 text-white flex flex-col lg:flex-row">
      
      {/* Dynamic Success Modal */}
      <AnimatePresence>
        {showPublishSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="gpu-blur-layer absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div
              ref={publishSuccessModalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="publish-success-title"
              tabIndex={-1}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="gpu-blur-foreground w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center space-y-6 shadow-[0_0_50px_rgba(16,185,129,0.3)]"
            >
              <div className="h-16 w-16 bg-emerald-400 text-black rounded-full flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle className="h-9 w-9" />
              </div>
              <div className="space-y-2">
                <h3 id="publish-success-title" className="font-sans font-black text-2xl text-white uppercase tracking-wider">Event Published Successfully!</h3>
                <p className="text-xs text-slate-400">The stadium intelligence nodes are fully synchronized.</p>
              </div>

              <div className="bg-slate-950/80 p-4 rounded-xl text-left border border-slate-800 space-y-2">
                <div className="flex items-center space-x-2 text-xs text-emerald-400 font-semibold">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <span>Portugal vs Argentina match is now live for fans.</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-emerald-400 font-semibold">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <span>All volunteer accounts ({volunteersList.length}) are now ACTIVE.</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-emerald-400 font-semibold">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <span>Ticket bookings are active on all public portals.</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowPublishSuccessModal(false);
                  setActiveTab('dashboard');
                }}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-sans font-bold text-sm uppercase tracking-wider shadow-md transition-all cursor-pointer"
              >
                Go to Dashboard
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LEFT SIDEBAR NAVIGATION */}
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
            <button 
              onClick={() => setActiveTab('dashboard')}
              aria-current={activeTab === 'dashboard' ? 'page' : undefined}
              className={`w-full text-left px-4 py-3 rounded-xl flex items-center space-x-3 text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer ${activeTab === 'dashboard' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              <span>Dashboard</span>
            </button>

            <button 
              onClick={() => setActiveTab('setup')}
              aria-current={activeTab === 'setup' ? 'page' : undefined}
              className={`w-full text-left px-4 py-3 rounded-xl flex items-center space-x-3 text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer ${activeTab === 'setup' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              <PlusCircle className="h-4 w-4" aria-hidden="true" />
              <span>Match Setup</span>
            </button>

            <button 
              onClick={() => setActiveTab('volunteers')}
              aria-current={activeTab === 'volunteers' ? 'page' : undefined}
              className={`w-full text-left px-4 py-3 rounded-xl flex items-center space-x-3 text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer ${activeTab === 'volunteers' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              <Users className="h-4 w-4" aria-hidden="true" />
              <span>Volunteers</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer Controls */}
        <div className="p-4 border-t border-slate-800/40 space-y-2">
          {/* Integration Center Settings trigger */}
          <button
            onClick={onOpenSettings}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold tracking-wider uppercase flex items-center space-x-3 transition-colors cursor-pointer"
          >
            <Settings className="h-4 w-4 text-emerald-400" />
            <span>n8n Settings</span>
          </button>

          <button 
            onClick={async () => {
              await logoutUser();
              onLogout();
            }}
            className="w-full px-4 py-2.5 rounded-xl hover:bg-red-950/20 text-red-400 text-xs font-semibold tracking-wider uppercase flex items-center space-x-3 border border-transparent hover:border-red-900/30 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout Panel</span>
          </button>
        </div>
      </aside>

      {/* MAIN PANEL CONTENT */}
      <main className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
        
        {/* TAB 1: DASHBOARD OVERVIEW */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* Header statistics bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold tracking-widest">Real-time Overview</span>
                <h2 className="text-2xl font-black text-white tracking-wide uppercase">Stadium Command Intelligence</h2>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center space-x-3 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-xs">
                <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${isPublished ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span className="font-semibold text-slate-300">Event Status: <strong className="text-white uppercase">{isPublished ? 'LIVE ON AIR' : 'PENDING SETUP'}</strong></span>
              </div>
            </div>

            {/* BENTO STATISTICAL CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              
              <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex items-center space-x-4">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Volunteers</span>
                  <span className="text-xl font-bold text-white">{volunteersList.filter(v => v.status === "active").length || stats.activeVolunteers}</span>
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

            {/* LOWER CONTENT DIVISION */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              
              {/* Left Column: Heatmap Display */}
              <div className="xl:col-span-2 space-y-6">
                <div>
                  <h3 className="font-sans font-bold text-sm text-slate-300 uppercase tracking-wider mb-2">Stadium Occupancy Heatmap</h3>
                  <StadiumSeatMap showHeatmap={true} />
                </div>

                {/* Recent Emergency/Incident Alerts */}
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

              {/* Right Column: AI Command Center Chat Panel */}
              <div className="bg-slate-900 border border-slate-800/80 rounded-2xl flex flex-col h-[560px] overflow-hidden shadow-2xl relative">
                
                {/* Header of Command Center */}
                <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-sans font-extrabold text-xs text-white uppercase tracking-wider">Nexus AI Assistant</span>
                  </div>
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                </div>

                {/* Messages Log area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs">
                  {messages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
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

                {/* Chat suggestions chips */}
                <div className="p-3 bg-slate-950/40 border-t border-slate-800/50 flex flex-col space-y-1.5">
                  <span className="text-[9px] text-slate-500 font-mono uppercase font-bold">Query Telemetry:</span>
                  <div className="flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto">
                    {[
                      "Summarize today's incidents",
                      "How many food orders are pending?",
                      "Which gate is most congested?",
                      "Show available volunteers"
                    ].map((chipText, index) => (
                      <button 
                        key={index} 
                        onClick={() => sendAICommand(chipText)}
                        className="text-[10px] font-semibold bg-slate-950 hover:bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 hover:border-emerald-500/30 px-2.5 py-1 rounded-full transition-all text-left truncate max-w-full cursor-pointer"
                      >
                        {chipText}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input action form */}
                <form onSubmit={handleSendMessageSubmit} className="p-3 bg-slate-950 border-t border-slate-850 flex items-center space-x-2">
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

                {/* Absolute watermark logo Ronaldo inspired */}
                <div className="absolute bottom-20 right-4 h-24 w-24 opacity-[0.03] pointer-events-none select-none">
                  <img src={ronaldoConcept} alt="ronaldo" className="w-full h-full object-cover rounded-full" />
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: MATCH SETUP */}
        {activeTab === 'setup' && (
          <div className="space-y-6 max-w-4xl">
            <div>
              <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold tracking-widest">Orchestration Setup</span>
              <h2 className="text-2xl font-black text-white tracking-wide uppercase">Match Setup Panel</h2>
              <p className="text-xs text-slate-500">Configure matches, ticket ranges, and deploy virtual nodes</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              
              {/* Form panel */}
              <form onSubmit={handleSaveMatch} className="md:col-span-3 bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-4">
                
                <h3 className="font-sans font-bold text-sm text-white uppercase border-b border-slate-800 pb-2">Event Properties</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label htmlFor="match-stadium" className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-2">Stadium Name</label>
                    <input
                      id="match-stadium"
                      type="text"
                      required
                      value={stadiumName}
                      onChange={(e) => setStadiumName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>

                  <div className="col-span-2">
                    <label htmlFor="match-name" className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-2">Match Name (Group Stage / Finals)</label>
                    <input
                      id="match-name"
                      type="text"
                      required
                      placeholder="e.g. Portugal vs Argentina"
                      value={matchName}
                      onChange={(e) => setMatchName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label htmlFor="match-date" className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-2">Match Date</label>
                    <input
                      id="match-date"
                      type="text"
                      required
                      placeholder="DD/MM/YYYY"
                      value={matchDate}
                      onChange={(e) => setMatchDate(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label htmlFor="match-time" className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-2">Match Time</label>
                    <input
                      id="match-time"
                      type="text"
                      required
                      placeholder="e.g. 07:30 PM"
                      value={matchTime}
                      onChange={(e) => setMatchTime(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label htmlFor="match-price" className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-2">Ticket Price (USD)</label>
                    <input
                      id="match-price"
                      type="number"
                      required
                      value={ticketPrice}
                      onChange={(e) => setTicketPrice(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                </div>

                {matchSaveSuccess && (
                  <p role="status" aria-live="polite" className="text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-500/20 p-3 rounded-xl text-center">Match logistics updated & synced with Nexus node.</p>
                )}

                <button 
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-sans font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-md"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Save Match Configurations</span>
                </button>

              </form>

              {/* Match preview rendering */}
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
                        {/* Glowing ring overlay */}
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
        )}

        {/* TAB 3: VOLUNTEERS */}
        {activeTab === 'volunteers' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold tracking-widest">Logistics Dispatch</span>
                <h2 className="text-2xl font-black text-white tracking-wide uppercase">Volunteer Coordination</h2>
                <p className="text-xs text-slate-500">Register new volunteers dynamically and dispatch them instantly</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Add Volunteer Form */}
              <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-4 h-fit">
                <h3 className="font-sans font-bold text-sm text-white uppercase border-b border-slate-800 pb-2">Add Volunteer</h3>
                
                <form onSubmit={handleAddVolunteer} className="space-y-4">
                  <div>
                    <label htmlFor="vol-new-name" className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1.5">Full Name</label>
                    <input
                      id="vol-new-name"
                      type="text"
                      required
                      placeholder="e.g. Karthik"
                      value={newVolunteerName}
                      onChange={(e) => setNewVolunteerName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label htmlFor="vol-new-email" className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1.5">Email Address</label>
                    <input
                      id="vol-new-email"
                      type="email"
                      required
                      placeholder="e.g. karthik@nexusai.com"
                      value={newVolunteerEmail}
                      onChange={(e) => setNewVolunteerEmail(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label htmlFor="vol-new-gate" className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1.5">Assigned Gate</label>
                    <select
                      id="vol-new-gate"
                      value={newVolunteerGate}
                      onChange={(e) => setNewVolunteerGate(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-emerald-500 outline-none transition-all"
                    >
                      <option value="Gate A">Gate A</option>
                      <option value="Gate B">Gate B</option>
                      <option value="Gate C">Gate C</option>
                      <option value="Gate D">Gate D</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="vol-new-password" className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1.5">Password</label>
                    <input
                      id="vol-new-password"
                      type="password"
                      required
                      placeholder="e.g. password123"
                      value={newVolunteerPassword}
                      onChange={(e) => setNewVolunteerPassword(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isCreatingVolunteer}
                    className="w-full py-2.5 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-800 disabled:bg-slate-900 text-emerald-400 disabled:text-emerald-800 font-sans font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-2"
                  >
                    {isCreatingVolunteer ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Registering...</span>
                      </>
                    ) : (
                      <span>+ Register Volunteer</span>
                    )}
                  </button>
                </form>

                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-850 text-[10px] text-slate-500 space-y-1">
                  <p className="font-mono text-emerald-400 font-bold uppercase">Security Guard Note:</p>
                  <p>Nexus automatically hashes volunteer ID tokens (e.g. VOL-4821) as secure entrance credentials to unlock terminal devices.</p>
                </div>
              </div>

              {/* Table section */}
              <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-sans font-bold text-sm text-white uppercase">Security Enlist Table</h3>
                  <span className="text-[10px] text-slate-400 font-semibold">{volunteersList.length} volunteers cataloged</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left font-sans text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-850 text-slate-500 text-[10px] font-mono uppercase tracking-wider">
                        <th scope="col" className="py-3 px-2">#</th>
                        <th scope="col" className="py-3 px-2">Volunteer Name</th>
                        <th scope="col" className="py-3 px-2">Unique Volunteer ID</th>
                        <th scope="col" className="py-3 px-2">Role Status</th>
                        <th scope="col" className="py-3 px-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {volunteersList.map((vol, index) => (
                        <tr key={vol.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-3 px-2 text-slate-500 font-mono">{index + 1}</td>
                          <td className="py-3 px-2 font-bold text-white">{vol.name}</td>
                          <td className="py-3 px-2">
                            <span className="font-mono bg-slate-950 text-emerald-400 border border-emerald-500/10 px-2 py-0.5 rounded-md text-[10px]">
                              {vol.volunteerId}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono uppercase ${vol.status === 'active' ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                              {vol.status === 'active' ? 'Active' : 'Pending Publish'}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <button
                              onClick={() => handleRemoveVolunteer(vol.id)}
                              aria-label={`Remove volunteer ${vol.name}`}
                              className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-950/20 rounded-md transition-all cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {volunteersList.length === 0 && (
                  <p className="text-center text-xs text-slate-500 py-6">No volunteers added to the roster yet.</p>
                )}

              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}
