import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/authContext';
import { createRecordWithTask } from '../services/dataSource';
import { useDemoMode } from '../context/demoModeContext';
import { OrderedItem, OrderStatus, EmergencyStatus, IssueStatus, TaskStatus } from '../types';
import { FOOD_MENU } from './fan/FanFoodTab';

import FanAuth from './fan/FanAuth';
import FanSidebar from './fan/FanSidebar';
import FanHomeTab from './fan/FanHomeTab';
import FanFoodTab from './fan/FanFoodTab';
import FanMedicalTab from './fan/FanMedicalTab';
import FanIssueTab from './fan/FanIssueTab';
import FanAIChat, { FanChatMessage } from './fan/FanAIChat';

interface FanDashboardProps {
  onLogout: () => void;
  stadiumBg: string;
}

/** Queries Firestore to find an unused seat number. Pure function — no component state. */
async function generateUniqueSeatNumber(): Promise<string> {
  const letters = ['A', 'B', 'C', 'VIP'] as const;
  let attempts = 0;
  while (attempts < 100) {
    const letter = letters[Math.floor(Math.random() * letters.length)];
    const numberPart = letter === 'VIP'
      ? String(Math.floor(Math.random() * 50) + 1).padStart(3, '0')
      : String(Math.floor(Math.random() * 400) + 1).padStart(3, '0');
    const seat = `${letter}-${numberPart}`;
    try {
      const q = query(collection(db, 'fans'), where('seatNumber', '==', seat));
      const snap = await getDocs(q);
      if (snap.empty) return seat;
    } catch {
      // Firestore unavailable (demo mode path) — assume the seat is unique
      return seat;
    }
    attempts++;
  }
  return `A-${Math.floor(Math.random() * 400) + 100}`;
}

export default function FanDashboard({ onLogout, stadiumBg }: FanDashboardProps) {
  const { user, profile, role, signUpFan, loginUser, logoutUser, error, setError } = useAuth();
  const { isDemoMode, demoRole, demoProfile } = useDemoMode();
  const isFanDemo = isDemoMode && demoRole === 'fan';

  // ── Auth state ──────────────────────────────────────────────────────────────
  const [isRegistering, setIsRegistering] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [seatNumber, setSeatNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('English');
  const [favoriteTeam, setFavoriteTeam] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingSeat, setIsGeneratingSeat] = useState(false);

  const isAuthenticated = isFanDemo || (!!user && role === 'fan');
  const currentUser = isFanDemo && demoProfile ? {
    name: demoProfile.fullName,
    email: demoProfile.email,
    seatNumber: demoProfile.seatNumber || 'A-118'
  } : (user ? {
    name: profile?.fullName || user.displayName || 'Demo Fan',
    email: user.email,
    seatNumber: profile?.seatNumber || seatNumber
  } : null);

  // ── Tab state ───────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'dashboard' | 'food' | 'medical' | 'issue'>('dashboard');

  // ── Food/cart state ─────────────────────────────────────────────────────────
  const [cart, setCart] = useState<Record<string, number>>({});
  const [orderSuccess, setOrderSuccess] = useState(false);

  // ── Medical state ───────────────────────────────────────────────────────────
  const [emergencySeat, setEmergencySeat] = useState('A12-24');
  const [emergencySuccess, setEmergencySuccess] = useState(false);

  // ── Issue state ─────────────────────────────────────────────────────────────
  const [selectedIssueCategory, setSelectedIssueCategory] = useState('Seat Occupancy');
  const [issueDescription, setIssueDescription] = useState('');
  const [issueSuccess, setIssueSuccess] = useState(false);

  // ── AI chat (lifted here so action handlers can append acknowledgements) ────
  const [chatLogs, setChatLogs] = useState<FanChatMessage[]>([
    { sender: 'ai', text: "Hi! I'm Nexus AI. Your Stadium Assistant. How can I help you today?" }
  ]);
  const appendChatMessage = useCallback((msg: FanChatMessage) => {
    setChatLogs(prev => [...prev, msg]);
  }, []);

  // ── Seat generation ─────────────────────────────────────────────────────────
  const handleRegenerateSeat = useCallback(async () => {
    setIsGeneratingSeat(true);
    try {
      const seat = await generateUniqueSeatNumber();
      setSeatNumber(seat);
      setEmergencySeat(seat);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingSeat(false);
    }
  // generateUniqueSeatNumber is a module-level pure function — no deps needed
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isRegistering && !seatNumber) {
      handleRegenerateSeat();
    }
  // handleRegenerateSeat is stable (useCallback with []); seatNumber is a guard
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRegistering]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !EMAIL_RE.test(trimmedEmail)) { setError('Please enter a valid email address.'); return; }
    if (!password || password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (isRegistering) {
      if (!name.trim()) { setError('Full name is required.'); return; }
      if (!seatNumber) { setError('Seat number is required.'); return; }
    }
    setIsSubmitting(true);
    try {
      if (isRegistering) {
        await signUpFan(name, trimmedEmail, password, seatNumber, { phone, country, preferredLanguage, favoriteTeam });
      } else {
        await loginUser(trimmedEmail, password, 'fan');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const orderedItems = (Object.entries(cart) as [string, number][])
      .filter(([_, qty]) => Number(qty) > 0)
      .flatMap(([id, qty]) => {
        const item = FOOD_MENU.find(f => f.id === id);
        if (!item) return [];
        return [{ name: item.name, quantity: Number(qty), price: Number(item.price) }];
      });
    if (orderedItems.length === 0) return;
    const totalPrice = orderedItems.reduce((acc, cur) => acc + (Number(cur.price) * Number(cur.quantity)), 0);
    try {
      const taskDetails = `Deliver ${orderedItems.map((i: OrderedItem) => `${i.name} (x${i.quantity})`).join(', ')}`;
      await createRecordWithTask(
        'foodOrders',
        {
          items: orderedItems,
          seatNumber: currentUser?.seatNumber || seatNumber,
          totalPrice,
          status: 'pending' satisfies OrderStatus,
          timestamp: new Date().toISOString(),
          fanUid: user?.uid || 'anonymous',
          fanName: currentUser?.name || 'Anonymous Fan'
        },
        {
          type: 'Deliver Food',
          details: taskDetails,
          seatNumber: currentUser?.seatNumber || seatNumber,
          priority: 'Medium',
          status: 'pending' satisfies TaskStatus,
          timestamp: new Date().toISOString(),
          fanUid: user?.uid || 'anonymous',
          fanName: currentUser?.name || 'Anonymous Fan'
        }
      );
      setCart({});
      setOrderSuccess(true);
      appendChatMessage({
        sender: 'ai',
        text: `Order received! Your food will be delivered shortly to Seat ${currentUser?.seatNumber || seatNumber}.`
      });
      setTimeout(() => setOrderSuccess(false), 4000);
    } catch (err) {
      console.error('Error creating food order in Firestore:', err);
    }
  };

  const handleUpdateCartQty = useCallback((id: string, delta: number) => {
    setCart(prev => {
      const cur = prev[id] || 0;
      const next = Math.max(0, cur + delta);
      return { ...prev, [id]: next };
    });
  }, []);

  const handleTriggerEmergency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emergencySeat.trim()) return;
    try {
      await createRecordWithTask(
        'emergencyRequests',
        {
          seatNumber: emergencySeat,
          status: 'active' satisfies EmergencyStatus,
          timestamp: new Date().toISOString(),
          fanUid: user?.uid || 'anonymous',
          fanName: currentUser?.name || 'Anonymous Fan'
        },
        {
          type: 'Medical Emergency',
          details: 'CRITICAL: First Responder assistance requested.',
          seatNumber: emergencySeat,
          priority: 'High',
          status: 'pending' satisfies TaskStatus,
          timestamp: new Date().toISOString(),
          fanUid: user?.uid || 'anonymous',
          fanName: currentUser?.name || 'Anonymous Fan'
        }
      );
      setEmergencySuccess(true);
      appendChatMessage({
        sender: 'ai',
        text: 'CRITICAL ALERT: Emergency beacon active. Stadium first-responders have been dispatched to your seat position. Please keep calm and remain seated.'
      });
      setTimeout(() => setEmergencySuccess(false), 5000);
    } catch (err) {
      console.error('Error triggering emergency in Firestore:', err);
    }
  };

  const handleSubmitIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueDescription.trim()) return;
    try {
      await createRecordWithTask(
        'issueReports',
        {
          category: selectedIssueCategory,
          seatNumber: currentUser?.seatNumber || seatNumber,
          description: issueDescription,
          status: 'open' satisfies IssueStatus,
          timestamp: new Date().toISOString(),
          fanUid: user?.uid || 'anonymous',
          fanName: currentUser?.name || 'Anonymous Fan'
        },
        {
          type: selectedIssueCategory === 'Broken Seat' ? 'Seat Issue' : 'Complaint Resolution',
          details: `${selectedIssueCategory} - ${issueDescription}`,
          seatNumber: currentUser?.seatNumber || seatNumber,
          priority: selectedIssueCategory === 'Harassment' ? 'High' : 'Medium',
          status: 'pending' satisfies TaskStatus,
          timestamp: new Date().toISOString(),
          fanUid: user?.uid || 'anonymous',
          fanName: currentUser?.name || 'Anonymous Fan'
        }
      );
      setIssueDescription('');
      setIssueSuccess(true);
      appendChatMessage({
        sender: 'ai',
        text: `Incident ticket registered. We've assigned a volunteer officer to inspect ${selectedIssueCategory} at ${currentUser?.seatNumber || seatNumber}.`
      });
      setTimeout(() => setIssueSuccess(false), 4000);
    } catch (err) {
      console.error('Error creating issue report in Firestore:', err);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    onLogout();
  };

  // ── Auth gate ───────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <FanAuth
        stadiumBg={stadiumBg}
        isRegistering={isRegistering}
        onToggleMode={() => setIsRegistering(!isRegistering)}
        name={name} setName={setName}
        email={email} setEmail={setEmail}
        password={password} setPassword={setPassword}
        phone={phone} setPhone={setPhone}
        country={country} setCountry={setCountry}
        preferredLanguage={preferredLanguage} setPreferredLanguage={setPreferredLanguage}
        favoriteTeam={favoriteTeam} setFavoriteTeam={setFavoriteTeam}
        seatNumber={seatNumber}
        isGeneratingSeat={isGeneratingSeat}
        onRegenerateSeat={handleRegenerateSeat}
        isSubmitting={isSubmitting}
        error={error}
        onSubmit={handleAuthSubmit}
      />
    );
  }

  // ── Authenticated fan arena ─────────────────────────────────────────────────
  const activeSeatNumber = currentUser?.seatNumber || seatNumber;

  return (
    <div id="fan-dashboard-root" className="min-h-screen bg-slate-950 text-white flex flex-col lg:flex-row">
      <FanSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
        userName={currentUser?.name || ''}
        seatNumber={activeSeatNumber}
      />

      <main className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
        {activeTab === 'dashboard' && <FanHomeTab seatNumber={activeSeatNumber} />}

        {activeTab === 'food' && (
          <FanFoodTab
            seatNumber={activeSeatNumber}
            cart={cart}
            onUpdateCartQty={handleUpdateCartQty}
            onPlaceOrder={handlePlaceOrder}
            orderSuccess={orderSuccess}
          />
        )}

        {activeTab === 'medical' && (
          <FanMedicalTab
            emergencySeat={emergencySeat}
            onEmergencySeatChange={setEmergencySeat}
            emergencySuccess={emergencySuccess}
            onSubmit={handleTriggerEmergency}
          />
        )}

        {activeTab === 'issue' && (
          <FanIssueTab
            selectedIssueCategory={selectedIssueCategory}
            onSelectCategory={setSelectedIssueCategory}
            issueDescription={issueDescription}
            onDescriptionChange={setIssueDescription}
            issueSuccess={issueSuccess}
            onSubmit={handleSubmitIssue}
          />
        )}
      </main>

      <FanAIChat chatLogs={chatLogs} onAppendMessage={appendChatMessage} />
    </div>
  );
}
