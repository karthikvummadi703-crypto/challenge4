import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, UserPlus, LogIn, Coffee, ShieldAlert, AlertTriangle, 
  MapPin, Send, HelpCircle, LogOut, CheckCircle, Navigation, 
  Flame, ShoppingCart, Minus, Plus, Compass, Sparkles, Loader2,
  RefreshCw
} from 'lucide-react';
import StadiumSeatMap from './StadiumSeatMap';
import { useAuth } from '../context/authContext';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface FanDashboardProps {
  onLogout: () => void;
  stadiumBg: string;
}

export default function FanDashboard({ onLogout, stadiumBg }: FanDashboardProps) {
  const { user, profile, role, signUpFan, loginUser, logoutUser, error, setError, loading } = useAuth();

  // Authentication UI State
  const [isRegistering, setIsRegistering] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [seatNumber, setSeatNumber] = useState(''); // starts empty to force generator
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingSeat, setIsGeneratingSeat] = useState(false);

  const isAuthenticated = !!user && role === 'fan';
  const currentUser = user ? {
    name: profile?.fullName || user.displayName || 'Demo Fan',
    email: user.email,
    seatNumber: profile?.seatNumber || seatNumber
  } : null;

  const generateUniqueSeatNumber = async (): Promise<string> => {
    const letters = ['A', 'B', 'C', 'VIP'];
    let attempts = 0;
    while (attempts < 100) {
      const letter = letters[Math.floor(Math.random() * letters.length)];
      let numberPart = "";
      if (letter === 'VIP') {
        numberPart = String(Math.floor(Math.random() * 50) + 1).padStart(3, '0');
      } else {
        numberPart = String(Math.floor(Math.random() * 400) + 1).padStart(3, '0');
      }
      const seat = `${letter}-${numberPart}`;

      try {
        const q = query(collection(db, 'fans'), where('seatNumber', '==', seat));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
          return seat;
        }
      } catch (err) {
        console.error("Firestore query failed, assuming unique:", err);
        return seat;
      }
      attempts++;
    }
    return `A-${Math.floor(Math.random() * 400) + 100}`;
  };

  const handleRegenerateSeat = async () => {
    setIsGeneratingSeat(true);
    try {
      const seat = await generateUniqueSeatNumber();
      setSeatNumber(seat);
      setEmergencySeat(seat); // synchronize emergency coordinate
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingSeat(false);
    }
  };

  useEffect(() => {
    if (isRegistering && (!seatNumber || seatNumber === 'A12-24')) {
      handleRegenerateSeat();
    }
  }, [isRegistering]);

  // Panel Tabs
  const [activeTab, setActiveTab] = useState<'dashboard' | 'food' | 'medical' | 'issue'>('dashboard');

  // Food Menu List
  const foodMenu = [
    { id: 'item-1', name: 'Veg Burger', price: 6.99, category: 'Burgers', image: '🍔' },
    { id: 'item-2', name: 'Chicken Burger', price: 7.99, category: 'Burgers', image: '🍔' },
    { id: 'item-3', name: 'French Fries', price: 3.49, category: 'Snacks', image: '🍟' },
    { id: 'item-4', name: 'Coke', price: 2.49, category: 'Beverages', image: '🥤' }
  ];

  // Cart State
  const [cart, setCart] = useState<Record<string, number>>({});
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Medical Alert State
  const [emergencySeat, setEmergencySeat] = useState('A12-24');
  const [emergencySuccess, setEmergencySuccess] = useState(false);

  // Issue reporting categories
  const issueCategories = [
    'Seat Occupancy',
    'Harassment',
    'Broken Seat',
    'Dirty Washroom',
    'Other'
  ];
  const [selectedIssueCategory, setSelectedIssueCategory] = useState('Seat Occupancy');
  const [issueDescription, setIssueDescription] = useState('');
  const [issueSuccess, setIssueSuccess] = useState(false);

  // AI Assistant Chat Logs
  const [chatLogs, setChatLogs] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    { sender: 'ai', text: "Hi! I'm Nexus AI. Your Stadium Assistant. How can I help you today?" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isAiAnswering, setIsAiAnswering] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Match score timer (Dynamic tick simulation)
  const [matchSeconds, setMatchSeconds] = useState(4104); // 68:24
  useEffect(() => {
    const timer = setInterval(() => {
      setMatchSeconds(sec => sec + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatMatchTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins}:${remSecs < 10 ? '0' : ''}${remSecs}`;
  };

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLogs]);

  // Auth Handler
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (isRegistering) {
        if (!name || !email || !password || !seatNumber) return;
        await signUpFan(name, email, password, seatNumber);
      } else {
        if (!email || !password) return;
        await loginUser(email, password, 'fan');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Food Ordering submit
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const orderedItems = (Object.entries(cart) as [string, number][])
      .filter(([_, qty]) => Number(qty) > 0)
      .map(([id, qty]) => {
        const item = foodMenu.find(f => f.id === id)!;
        return { name: item.name, quantity: Number(qty), price: Number(item.price) };
      });

    if (orderedItems.length === 0) return;

    const totalPrice = orderedItems.reduce((acc, cur) => acc + (Number(cur.price) * Number(cur.quantity)), 0);

    try {
      const orderDoc = await addDoc(collection(db, 'foodOrders'), {
        items: orderedItems,
        seatNumber: currentUser?.seatNumber || seatNumber,
        totalPrice,
        status: 'pending',
        timestamp: new Date().toISOString(),
        fanUid: user?.uid || 'anonymous',
        fanName: currentUser?.name || 'Anonymous Fan'
      });

      const taskDetails = `Deliver ${orderedItems.map((i: any) => `${i.name} (x${i.quantity})`).join(", ")}`;
      await addDoc(collection(db, 'tasks'), {
        type: 'Deliver Food',
        details: taskDetails,
        seatNumber: currentUser?.seatNumber || seatNumber,
        priority: 'Medium',
        status: 'pending',
        timestamp: new Date().toISOString(),
        linkedId: orderDoc.id,
        fanUid: user?.uid || 'anonymous',
        fanName: currentUser?.name || 'Anonymous Fan'
      });

      setCart({});
      setOrderSuccess(true);
      // Add chat feedback
      setChatLogs(prev => [...prev, {
        sender: 'ai',
        text: `Order received! Your popcorn and drinks will be delivered shortly to Seat ${currentUser?.seatNumber || seatNumber}.`
      }]);
      setTimeout(() => setOrderSuccess(false), 4000);
    } catch (err) {
      console.error("Error creating food order in Firestore:", err);
    }
  };

  const updateCartQty = (id: string, delta: number) => {
    setCart(prev => {
      const cur = prev[id] || 0;
      const next = Math.max(0, cur + delta);
      return { ...prev, [id]: next };
    });
  };

  // Trigger Medical Emergency
  const handleTriggerEmergency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emergencySeat.trim()) return;

    try {
      const emergencyDoc = await addDoc(collection(db, 'emergencyRequests'), {
        seatNumber: emergencySeat,
        status: 'active',
        timestamp: new Date().toISOString(),
        fanUid: user?.uid || 'anonymous',
        fanName: currentUser?.name || 'Anonymous Fan'
      });

      await addDoc(collection(db, 'tasks'), {
        type: 'Medical Emergency',
        details: 'CRITICAL: First Responder assistance requested.',
        seatNumber: emergencySeat,
        priority: 'High',
        status: 'pending',
        timestamp: new Date().toISOString(),
        linkedId: emergencyDoc.id,
        fanUid: user?.uid || 'anonymous',
        fanName: currentUser?.name || 'Anonymous Fan'
      });

      setEmergencySuccess(true);
      setChatLogs(prev => [...prev, {
        sender: 'ai',
        text: "CRITICAL ALERT: Emergency beacon active. Stadium first-responders have been dispatched to your seat position. Please keep calm and remain seated."
      }]);
      setTimeout(() => setEmergencySuccess(false), 5000);
    } catch (err) {
      console.error("Error triggering emergency in Firestore:", err);
    }
  };

  // Submit Issue Report
  const handleSubmitIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueDescription.trim()) return;

    try {
      const issueDoc = await addDoc(collection(db, 'issueReports'), {
        category: selectedIssueCategory,
        seatNumber: currentUser?.seatNumber || seatNumber,
        description: issueDescription,
        status: 'open',
        timestamp: new Date().toISOString(),
        fanUid: user?.uid || 'anonymous',
        fanName: currentUser?.name || 'Anonymous Fan'
      });

      await addDoc(collection(db, 'tasks'), {
        type: selectedIssueCategory === 'Broken Seat' ? 'Seat Issue' : 'Complaint Resolution',
        details: `${selectedIssueCategory} - ${issueDescription}`,
        seatNumber: currentUser?.seatNumber || seatNumber,
        priority: selectedIssueCategory === 'Harassment' ? 'High' : 'Medium',
        status: 'pending',
        timestamp: new Date().toISOString(),
        linkedId: issueDoc.id,
        fanUid: user?.uid || 'anonymous',
        fanName: currentUser?.name || 'Anonymous Fan'
      });

      setIssueDescription('');
      setIssueSuccess(true);
      setChatLogs(prev => [...prev, {
        sender: 'ai',
        text: `Incident ticket registered. We've assigned a volunteer officer to inspect ${selectedIssueCategory} at ${currentUser?.seatNumber || seatNumber}.`
      }]);
      setTimeout(() => setIssueSuccess(false), 4000);
    } catch (err) {
      console.error("Error creating issue report in Firestore:", err);
    }
  };

  // Ask AI Assistant Chatbot
  const handleAskAI = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const textToSend = chatInput;
    setChatLogs(prev => [...prev, { sender: 'user', text: textToSend }]);
    setChatInput('');
    setIsAiAnswering(true);

    fetch('/api/ai/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: textToSend })
    })
      .then(res => res.json())
      .then(data => {
        setChatLogs(prev => [...prev, { sender: 'ai', text: data.response }]);
      })
      .catch(() => {
        setChatLogs(prev => [...prev, { sender: 'ai', text: "Error communicating with operational intelligence." }]);
      })
      .finally(() => {
        setIsAiAnswering(false);
      });
  };

  // Quick preset query triggers
  const triggerPresetQuery = (txt: string) => {
    setChatLogs(prev => [...prev, { sender: 'user', text: txt }]);
    setIsAiAnswering(true);
    fetch('/api/ai/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: txt })
    })
      .then(res => res.json())
      .then(data => {
        setChatLogs(prev => [...prev, { sender: 'ai', text: data.response }]);
      })
      .catch(() => {})
      .finally(() => setIsAiAnswering(false));
  };

  // LOGIN / REGISTER GATES
  if (!isAuthenticated) {
    return (
      <div id="fan-auth-container" className="relative min-h-screen bg-slate-950 flex items-center justify-center p-6 overflow-hidden">
        
        <div className="absolute inset-0 z-0">
          <img src={stadiumBg} alt="stadium bg" className="w-full h-full object-cover opacity-15 filter saturate-50 blur-[2px]" />
          <div className="absolute inset-0 bg-slate-950/80" />
        </div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="relative z-10 w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(16,185,129,0.06)]"
        >
          <div className="text-center space-y-2 mb-6">
            <div className="h-12 w-12 rounded-xl bg-emerald-500 text-black flex items-center justify-center mx-auto shadow-md">
              <Users className="h-6 w-6" />
            </div>
            <h2 className="font-sans font-black text-xl text-white uppercase tracking-wider">
              {isRegistering ? 'Register Fan Pass' : 'Fan Pass Portal'}
            </h2>
            <p className="text-xs text-slate-500">Access exclusive in-stadium food delivery & assistance</p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-950/30 border border-red-500/20 rounded-xl text-xs text-red-400 font-semibold text-center">
                {error}
              </div>
            )}

            {isRegistering && (
              <div>
                <label htmlFor="fan-name" className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1.5">Full Name</label>
                <input
                  id="fan-name"
                  type="text" required
                  value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Cristiano Ronaldo"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-xs text-white outline-none"
                />
              </div>
            )}

            <div>
              <label htmlFor="fan-email" className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1.5">Email Address</label>
              <input
                id="fan-email"
                type="email" required
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="fan@worldcup.com"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-xs text-white outline-none"
              />
            </div>

            <div>
              <label htmlFor="fan-password" className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1.5">Password</label>
              <input
                id="fan-password"
                type="password" required
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-xs text-white outline-none"
              />
            </div>

            {isRegistering && (
              <div>
                <label htmlFor="fan-seat" className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1.5">Your Seat Location</label>
                <div className="relative flex items-center">
                  <input
                    id="fan-seat"
                    type="text"
                    readOnly
                    required
                    value={seatNumber}
                    placeholder="Generating unique seat..."
                    className="w-full px-3.5 py-2 pr-10 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono uppercase outline-none select-none"
                  />
                  <button
                    type="button"
                    disabled={isGeneratingSeat}
                    onClick={handleRegenerateSeat}
                    aria-label="Generate new seat number"
                    className="absolute right-2 p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-emerald-400 hover:text-emerald-300 disabled:opacity-50 cursor-pointer flex items-center justify-center transition-all"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isGeneratingSeat ? 'animate-spin' : ''}`} aria-hidden="true" />
                  </button>
                </div>
                <span className="text-[9px] text-slate-500 mt-1 block">Your unique stadium seat number is automatically validated as available.</span>
              </div>
            )}

            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-800 disabled:text-slate-400 text-black font-sans font-black text-xs uppercase tracking-widest shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>{isRegistering ? 'Register and Enter' : 'Enter Fan Pass'}</span>
              )}
            </button>
          </form>

          {/* Toggle register / login */}
          <div className="pt-4 border-t border-slate-800/60 text-center">
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-xs text-emerald-400 hover:underline cursor-pointer"
            >
              {isRegistering ? 'Already registered? Login instead' : 'New to stadium? Create Fan Pass'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // LOGGED IN FAN ARENA
  const cartSubtotal = (Object.entries(cart) as [string, number][]).reduce((sum, [id, qty]) => {
    const item = foodMenu.find(f => f.id === id)!;
    return sum + (Number(item.price) * Number(qty));
  }, 0);

  return (
    <div id="fan-dashboard-root" className="min-h-screen bg-slate-950 text-white flex flex-col lg:flex-row">
      
      {/* COLUMN 1: LEFT SIDEBAR */}
      <aside className="w-full lg:w-64 bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-800/80 flex flex-col justify-between shrink-0 z-10">
        <div>
          {/* Fan Avatar details */}
          <div className="p-6 border-b border-slate-800/40 flex items-center space-x-3">
            <div className="h-9 w-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
              {currentUser?.name[0].toUpperCase()}
            </div>
            <div>
              <h2 className="font-sans font-bold text-sm tracking-wider truncate max-w-[140px]">{currentUser?.name}</h2>
              <span className="text-[10px] font-mono text-emerald-400 font-bold block uppercase tracking-wider">SEAT: {currentUser?.seatNumber}</span>
            </div>
          </div>

          <nav className="p-4 space-y-1">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`w-full text-left px-4 py-3 rounded-xl flex items-center space-x-3 text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer ${activeTab === 'dashboard' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              <Compass className="h-4 w-4" />
              <span>Dashboard</span>
            </button>

            <button 
              onClick={() => setActiveTab('food')}
              className={`w-full text-left px-4 py-3 rounded-xl flex items-center space-x-3 text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer ${activeTab === 'food' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              <Coffee className="h-4 w-4" />
              <span>Food Ordering</span>
            </button>

            <button 
              onClick={() => setActiveTab('medical')}
              className={`w-full text-left px-4 py-3 rounded-xl flex items-center space-x-3 text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer ${activeTab === 'medical' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              <ShieldAlert className="h-4 w-4" />
              <span>Medical Help</span>
            </button>

            <button 
              onClick={() => setActiveTab('issue')}
              className={`w-full text-left px-4 py-3 rounded-xl flex items-center space-x-3 text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer ${activeTab === 'issue' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              <AlertTriangle className="h-4 w-4" />
              <span>Report Issue</span>
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800/40">
          <button 
            onClick={async () => {
              await logoutUser();
              onLogout();
            }}
            className="w-full px-4 py-2.5 rounded-xl hover:bg-red-950/20 text-red-400 text-xs font-semibold tracking-wider uppercase flex items-center space-x-3 border border-transparent hover:border-red-900/30 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Leave Fan Pass</span>
          </button>
        </div>
      </aside>

      {/* COLUMN 2: CENTER WORK AREA */}
      <main className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
        
        {/* TAB 1: GENERAL DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* Live Match Board Header card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
              
              {/* Background gradient line */}
              <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-indigo-500" />

              <div className="text-center space-y-1 text-slate-500 text-[10px] font-mono uppercase font-bold tracking-widest">
                <span>FIFA World Cup 2026 • Group Stage</span>
              </div>

              {/* Soccer scoreboard */}
              <div className="flex items-center justify-center space-x-8 sm:space-x-12 mt-4">
                
                {/* Team 1 */}
                <div className="flex flex-col items-center space-y-1">
                  <div className="h-10 w-14 bg-red-950/20 border border-red-900/30 text-red-500 flex items-center justify-center rounded-lg text-lg font-black tracking-wider">
                    POR
                  </div>
                  <span className="text-xs font-bold text-white uppercase">Portugal</span>
                </div>

                {/* Score */}
                <div className="text-center space-y-1">
                  <div className="text-3xl sm:text-4xl font-sans font-black tracking-wider text-white">2 - 1</div>
                  <div className="inline-flex items-center space-x-1.5 bg-rose-950/40 border border-rose-800/20 px-2.5 py-0.5 rounded-full">
                    <span className="h-1.5 w-1.5 bg-rose-500 rounded-full animate-ping" />
                    <span className="text-[10px] font-mono text-rose-400 font-semibold">{formatMatchTime(matchSeconds)} • LIVE</span>
                  </div>
                </div>

                {/* Team 2 */}
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

            {/* Stadium seat map rendering with highlighted user seat */}
            <div className="space-y-3">
              <h3 className="font-sans font-bold text-sm text-slate-300 uppercase tracking-wider">Your Seat Location Pin</h3>
              <StadiumSeatMap highlightedSeat={currentUser?.seatNumber || seatNumber} />
            </div>

            {/* General tips cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                <Coffee className="h-5 w-5 text-emerald-400 mb-2" />
                <h4 className="text-xs font-bold text-white uppercase mb-1">In-Seat Delivery</h4>
                <p className="text-[10px] text-slate-500">Order from your device, and our volunteers deliver straight to seat {currentUser?.seatNumber || seatNumber}.</p>
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
        )}

        {/* TAB 2: FOOD ORDERING */}
        {activeTab === 'food' && (
          <div className="space-y-6">
            <div>
              <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold tracking-widest">Beverage & Food Delivery</span>
              <h2 className="text-2xl font-black text-white tracking-wide uppercase">In-Seat Catering</h2>
              <p className="text-xs text-slate-500">Delivered directly to seat <strong>{currentUser?.seatNumber || seatNumber}</strong></p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              
              {/* Menu items list */}
              <div className="md:col-span-3 space-y-4">
                <h3 className="font-sans font-bold text-sm text-slate-300 uppercase">Available Menu</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {foodMenu.map((item) => {
                    const qty = cart[item.id] || 0;
                    return (
                      <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-3.5">
                          <span className="text-2xl filter saturate-100">{item.image}</span>
                          <div>
                            <h4 className="font-bold text-sm text-white">{item.name}</h4>
                            <span className="text-xs text-emerald-400 font-mono font-bold">${item.price}</span>
                          </div>
                        </div>

                        {/* Add / Subtract controls */}
                        <div className="flex items-center space-x-2.5">
                          <button 
                            type="button"
                            onClick={() => updateCartQty(item.id, -1)}
                            className="p-1 rounded-md bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white cursor-pointer"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="text-sm font-bold font-mono text-white w-4 text-center">{qty}</span>
                          <button 
                            type="button"
                            onClick={() => updateCartQty(item.id, 1)}
                            className="p-1 rounded-md bg-slate-950 border border-slate-800 hover:border-slate-750 text-slate-400 hover:text-white cursor-pointer animate-none"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cart review panel */}
              <div className="md:col-span-2">
                <form onSubmit={handlePlaceOrder} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <h3 className="font-sans font-bold text-sm text-white uppercase border-b border-slate-800 pb-2 flex items-center space-x-2">
                    <ShoppingCart className="h-4 w-4 text-emerald-400" />
                    <span>Your Catering Order</span>
                  </h3>

                  <div className="space-y-3">
                    {(Object.entries(cart) as [string, number][]).filter(([_, q]) => Number(q) > 0).map(([id, qty]) => {
                      const item = foodMenu.find(f => f.id === id)!;
                      return (
                        <div key={id} className="flex items-center justify-between text-xs">
                          <span className="text-slate-300">{item.name} <strong className="text-emerald-400 font-mono">x{qty}</strong></span>
                          <span className="text-white font-mono">${(Number(item.price) * Number(qty)).toFixed(2)}</span>
                        </div>
                      );
                    })}

                    {(Object.values(cart) as number[]).reduce((a, b) => Number(a) + Number(b), 0) === 0 && (
                      <p className="text-xs text-slate-500 text-center py-6">Your catering tray is empty. Add food items to begin.</p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-800/60 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Delivery location:</span>
                      <strong className="text-white font-mono uppercase">Seat {currentUser?.seatNumber || seatNumber}</strong>
                    </div>
                    <div className="flex justify-between text-base font-bold pt-1">
                      <span>Total Price:</span>
                      <strong className="text-emerald-400 font-mono">${cartSubtotal.toFixed(2)}</strong>
                    </div>
                  </div>

                  {orderSuccess && (
                    <div role="status" aria-live="polite" className="p-3 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl text-center font-medium">
                      Order Placed! Delivery is en-route.
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={cartSubtotal === 0}
                    className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-900 text-black font-sans font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md"
                  >
                    Place Catering Order
                  </button>
                </form>
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: MEDICAL EMERGENCY */}
        {activeTab === 'medical' && (
          <div className="space-y-6 max-w-xl">
            <div>
              <span className="text-[10px] font-mono text-red-500 uppercase font-bold tracking-widest">Safety Assistance</span>
              <h2 className="text-2xl font-black text-white tracking-wide uppercase">In-Stadium Emergency</h2>
              <p className="text-xs text-slate-500">Contact our stadium response team instantly</p>
            </div>

            <form onSubmit={handleTriggerEmergency} className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl space-y-5 text-center">
              
              <div className="h-20 w-20 rounded-full bg-red-500/10 border-2 border-red-500/30 text-red-500 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(239,68,68,0.2)] animate-pulse">
                <ShieldAlert className="h-10 w-10" />
              </div>

              <div className="space-y-1">
                <h3 className="font-sans font-black text-lg text-white uppercase">Critical Beacon Portal</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">Triggering this sends high-priority paramedic dispatch directly to your reported coordinate location.</p>
              </div>

              <div>
                <label htmlFor="emergency-seat" className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-2">Verify Your Coordinate Seat</label>
                <input
                  id="emergency-seat"
                  type="text"
                  required
                  value={emergencySeat}
                  onChange={(e) => setEmergencySeat(e.target.value)}
                  className="max-w-[200px] text-center px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-base font-mono text-red-400 uppercase outline-none focus:border-red-500 transition-all"
                />
              </div>

              {emergencySuccess && (
                <div role="alert" aria-live="assertive" className="p-3 bg-red-950/20 border border-red-500/30 text-red-400 text-xs rounded-xl font-medium">
                  EMERGENCY RESOLUTION ACTIVE. Paramedic team is dispatching. Stay seated.
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-red-500 hover:bg-red-400 text-white font-sans font-black text-sm uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_20px_rgba(239,68,68,0.3)]"
              >
                Trigger Emergency Aid
              </button>

              <div className="pt-2">
                <span className="text-[10px] text-slate-600 font-mono uppercase">Average paramedic arrival time: 2.4 minutes</span>
              </div>
            </form>
          </div>
        )}

        {/* TAB 4: REPORT ISSUE */}
        {activeTab === 'issue' && (
          <div className="space-y-6 max-w-xl">
            <div>
              <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold tracking-widest">Compliance & Comfort</span>
              <h2 className="text-2xl font-black text-white tracking-wide uppercase">Log Stadium Issue</h2>
              <p className="text-xs text-slate-500">Report seating, washroom cleaning, or harassment issues</p>
            </div>

            <form onSubmit={handleSubmitIssue} className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-4">
              
              <h3 className="font-sans font-bold text-sm text-white uppercase border-b border-slate-800 pb-2">Issue Ticket details</h3>

              <div>
                <label className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-2">Category</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {issueCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedIssueCategory(cat)}
                      className={`py-2 px-3 rounded-xl border text-[11px] font-bold text-center transition-all cursor-pointer ${selectedIssueCategory === cat ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="issue-description" className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-2">Describe the Incident / Problem</label>
                <textarea
                  id="issue-description"
                  required
                  rows={4}
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder="Provide precise details (e.g. Broken latch on seat, spill on steps, etc.)"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-emerald-500 outline-none transition-all resize-none"
                />
              </div>

              {issueSuccess && (
                <div role="status" aria-live="polite" className="p-3 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl text-center font-medium">
                  Incident Report logged! Dispatching a volunteer.
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-sans font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md"
              >
                Submit Incident Pass
              </button>
            </form>
          </div>
        )}

      </main>

      {/* COLUMN 3: RIGHT PANEL (NEXUS AI CHAT WINDOW) */}
      <aside className="w-full lg:w-80 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800/80 flex flex-col h-[600px] lg:h-auto overflow-hidden shrink-0">
        
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="font-sans font-black text-xs text-white uppercase tracking-wider">Nexus AI Assistant</h3>
          </div>
          <Sparkles className="h-4 w-4 text-emerald-400" />
        </div>

        {/* Logs */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs">
          {chatLogs.map((log, i) => (
            <div key={i} className={`flex ${log.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-3.5 rounded-2xl max-w-[85%] ${log.sender === 'user' ? 'bg-emerald-500 text-black font-semibold' : 'bg-slate-950 text-slate-200 border border-slate-850'}`}>
                {log.text}
              </div>
            </div>
          ))}
          {isAiAnswering && (
            <div className="flex justify-start">
              <div className="bg-slate-950 text-slate-500 px-3 py-1.5 rounded-xl animate-pulse font-mono text-[10px]">
                Nexus thinking...
              </div>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Shortcuts suggestions */}
        <div className="p-3 bg-slate-950/40 border-t border-slate-850/50 space-y-1.5">
          <span className="text-[9px] text-slate-500 font-mono uppercase font-bold">Ask Quick Queries:</span>
          <div className="flex flex-wrap gap-1.5">
            {[
              "Where is the nearest food court?",
              "Where is the nearest washroom?",
              "What gate is Gate C?",
              "Order popcorn and 1 coke"
            ].map((shortcut, index) => (
              <button
                key={index}
                onClick={() => triggerPresetQuery(shortcut)}
                className="text-[10px] font-semibold bg-slate-950 hover:bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 hover:border-emerald-500/30 px-2 py-0.5 rounded-full transition-all text-left max-w-full truncate cursor-pointer"
              >
                {shortcut}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <form onSubmit={handleAskAI} className="p-3 bg-slate-950 border-t border-slate-850 flex items-center space-x-2">
          <label htmlFor="fan-ai-input" className="sr-only">Ask AI assistant</label>
          <input
            id="fan-ai-input"
            type="text" required
            placeholder="Ask AI assistant..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-800 text-xs px-3 py-2 rounded-xl text-white focus:outline-none transition-all focus:border-emerald-500 placeholder:text-slate-650"
          />
          <button type="submit" aria-label="Send message" className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black transition-all cursor-pointer">
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </form>

      </aside>

    </div>
  );
}
