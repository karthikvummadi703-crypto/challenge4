import React, { useState, useEffect } from 'react';
import { Match, Volunteer, StadiumAlert, VolunteerStatus } from '../types';
import { useAuth } from '../context/authContext';
import { adminCreateVolunteer, verifyAdminAccess } from '../services/userService';
import { getFriendlyErrorMessage } from '../services/authService';
import { sendAICommand as sendAICommandRequest } from '../services/apiClient';
import { subscribeCollection, addRecord, deleteRecord, publishSystemConfig } from '../services/dataSource';
import { useDemoMode } from '../context/demoModeContext';
import { generateSecurePassword } from '../utils/generatePassword';

import OrganizerLogin from './organizer/OrganizerLogin';
import PublishSuccessModal from './organizer/PublishSuccessModal';
import OrganizerSidebar from './organizer/OrganizerSidebar';
import DashboardOverviewPanel from './organizer/DashboardOverviewPanel';
import MatchSetupPanel from './organizer/MatchSetupPanel';
import VolunteersPanel from './organizer/VolunteersPanel';

interface OrganizerDashboardProps {
  onLogout: () => void;
  stadiumBg: string;
  ronaldoConcept: string;
  onOpenSettings: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  source?: string;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  { id: '1', sender: 'ai', text: 'Welcome to Nexus AI Command Center. I can assist you with real-time operational query reports, incident coordination, heatmaps, and dispatcher automation.' }
];

export default function OrganizerDashboard({ onLogout, stadiumBg, ronaldoConcept, onOpenSettings }: OrganizerDashboardProps) {
  const { user, role, loginUser, logoutUser, error: _error, setError: _setError, loading: _loading } = useAuth();
  const { isDemoMode, demoRole } = useDemoMode();
  const isOrganizerDemo = isDemoMode && demoRole === 'organizer';

  // ── Authentication state ────────────────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const isAuthenticated = isOrganizerDemo || (!!user && role === 'admin');

  // ── Tab state ───────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'dashboard' | 'setup' | 'volunteers'>('dashboard');

  // ── Dashboard AI chat (lifted here so tab-switches don't reset history) ────
  const [dashboardMessages, setDashboardMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);

  // ── Match form state ────────────────────────────────────────────────────────
  const [stadiumName, setStadiumName] = useState('Estádio do Nexus');
  const [matchName, setMatchName] = useState('Portugal vs Argentina');
  const [matchDate, setMatchDate] = useState('18/07/2026');
  const [matchTime, setMatchTime] = useState('19:30');
  const [ticketPrice, setTicketPrice] = useState('120');
  const [matchSaveSuccess, setMatchSaveSuccess] = useState(false);

  // ── Volunteer form state ────────────────────────────────────────────────────
  const [newVolunteerName, setNewVolunteerName] = useState('');
  const [newVolunteerEmail, setNewVolunteerEmail] = useState('');
  const [newVolunteerPassword, setNewVolunteerPassword] = useState(() => generateSecurePassword());
  const [newVolunteerGate, setNewVolunteerGate] = useState('Gate A');
  const [isCreatingVolunteer, setIsCreatingVolunteer] = useState(false);
  const [passwordAcknowledged, setPasswordAcknowledged] = useState(false);

  // ── Data state ──────────────────────────────────────────────────────────────
  const [volunteersList, setVolunteersList] = useState<Volunteer[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isPublished, setIsPublished] = useState(false);
  const [showPublishSuccessModal, setShowPublishSuccessModal] = useState(false);

  const [stats, setStats] = useState({
    activeVolunteers: 0,
    totalOrders: 0,
    openIssues: 0,
    activeEmergencies: 0,
    attendance: 0,
    recentAlerts: [] as StadiumAlert[]
  });

  // ── Secondary Firestore admin guard ────────────────────────────────────────
  useEffect(() => {
    if (isOrganizerDemo) return;
    if (!user) return;

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
        if (!cancelled) logoutUser().catch(() => null);
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, isOrganizerDemo]);

  // ── Real-time Firestore subscriptions ───────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubVolunteers = subscribeCollection('volunteers', (snapshot) => {
      const vols: Volunteer[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Record<string, string>;
        vols.push({
          id: docSnap.id,
          name: data.fullName || 'Volunteer',
          volunteerId: data.uid ? `VOL-${data.uid.substring(0, 4).toUpperCase()}` : 'VOL-0000',
          status: 'active' satisfies VolunteerStatus,
        });
      });
      setVolunteersList(vols);
      setStats(prev => ({ ...prev, activeVolunteers: vols.filter(v => v.status === 'active').length }));
    });

    const unsubFans = subscribeCollection('fans', (snapshot) => {
      setStats(prev => ({ ...prev, attendance: snapshot.size > 0 ? (snapshot.size + 48500) : 0 }));
    });

    const unsubOrders = subscribeCollection('foodOrders', (snapshot) => {
      setStats(prev => ({ ...prev, totalOrders: snapshot.size }));
    });

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
      if (matchesList.some(m => m.published)) setIsPublished(true);
    });

    const unsubConfig = subscribeCollection('systemConfig', (snapshot) => {
      snapshot.forEach(docSnap => {
        if (docSnap.data().isPublished) setIsPublished(true);
      });
    });

    return () => {
      unsubVolunteers(); unsubFans(); unsubOrders();
      unsubIssues(); unsubEmergencies(); unsubMatches(); unsubConfig();
    };
  }, [isAuthenticated]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoginError('');
    setIsLoggingIn(true);
    try {
      await loginUser(email, password, 'admin');
    } catch (err: unknown) {
      setLoginError(getFriendlyErrorMessage(err));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSaveMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addRecord('matches', {
        stadiumName, matchName, matchDate, matchTime,
        ticketPrice: Number(ticketPrice),
        published: true,
        timestamp: new Date().toISOString()
      });
      await publishSystemConfig();
      setMatchSaveSuccess(true);
      setTimeout(() => setMatchSaveSuccess(false), 3000);
    } catch (e) {
      console.error('Error saving match to Firestore:', e);
    }
  };

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const handleAddVolunteer = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName  = newVolunteerName.trim();
    const trimmedEmail = newVolunteerEmail.trim().toLowerCase();
    const trimmedPwd   = newVolunteerPassword.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPwd) { alert('All fields are required.'); return; }
    if (!EMAIL_RE.test(trimmedEmail)) { alert('Please enter a valid email address for the volunteer.'); return; }
    if (trimmedPwd.length < 6) { alert('Password must be at least 6 characters.'); return; }
    if (!passwordAcknowledged) { alert('Please confirm you have copied the generated password before creating the account.'); return; }

    setIsCreatingVolunteer(true);
    try {
      if (isOrganizerDemo) {
        await addRecord('volunteers', {
          uid: `demo-vol-${Date.now()}`, fullName: newVolunteerName.trim(),
          email: newVolunteerEmail.toLowerCase().trim(), role: 'volunteer',
          assignedGate: newVolunteerGate, active: true, createdAt: new Date().toISOString(),
        });
      } else {
        await adminCreateVolunteer(newVolunteerName, newVolunteerEmail, newVolunteerPassword, newVolunteerGate);
      }
      setNewVolunteerName(''); setNewVolunteerEmail('');
      setNewVolunteerPassword(generateSecurePassword()); setNewVolunteerGate('Gate A');
      setPasswordAcknowledged(false);
    } catch (err: unknown) {
      console.error('Failed to register volunteer:', err);
      alert(err instanceof Error ? err.message : 'Failed to register volunteer. Ensure email is unique!');
    } finally {
      setIsCreatingVolunteer(false);
    }
  };

  const handleRemoveVolunteer = async (id: string) => {
    try {
      await deleteRecord('volunteers', id);
    } catch (e) {
      console.error('Failed to remove volunteer:', e);
    }
  };

  const handlePublishEvent = async () => {
    try {
      await publishSystemConfig();
      setIsPublished(true);
      setShowPublishSuccessModal(true);
    } catch (e) {
      console.error('Error publishing event to Firestore:', e);
    }
  };

  /** Calls the AI API and returns a ChatMessage for DashboardOverviewPanel to append. */
  const handleSendCommand = async (text: string) => {
    try {
      const data = await sendAICommandRequest(text);
      return { id: `ai-${Date.now()}`, sender: 'ai' as const, text: data.response, source: data.source };
    } catch {
      return { id: `ai-${Date.now()}`, sender: 'ai' as const, text: 'Error synchronizing with operational brain. Please check your n8n API settings.' };
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    onLogout();
  };

  // ── Login gate ──────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <OrganizerLogin
        stadiumBg={stadiumBg}
        email={email} setEmail={setEmail}
        password={password} setPassword={setPassword}
        loginError={loginError}
        isLoggingIn={isLoggingIn}
        onSubmit={handleLogin}
      />
    );
  }

  // ── Authenticated dashboard ─────────────────────────────────────────────────
  return (
    <div id="organizer-dashboard-root" className="min-h-screen bg-slate-950 text-white flex flex-col lg:flex-row">
      <PublishSuccessModal
        visible={showPublishSuccessModal}
        volunteerCount={volunteersList.length}
        onClose={() => { setShowPublishSuccessModal(false); setActiveTab('dashboard'); }}
      />

      <OrganizerSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenSettings={onOpenSettings}
        onLogout={handleLogout}
      />

      <main className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
        {activeTab === 'dashboard' && (
          <DashboardOverviewPanel
            isPublished={isPublished}
            stats={stats}
            volunteersList={volunteersList}
            messages={dashboardMessages}
            onMessagesChange={setDashboardMessages}
            onSendCommand={handleSendCommand}
            ronaldoConcept={ronaldoConcept}
          />
        )}
        {activeTab === 'setup' && (
          <MatchSetupPanel
            stadiumName={stadiumName} setStadiumName={setStadiumName}
            matchName={matchName} setMatchName={setMatchName}
            matchDate={matchDate} setMatchDate={setMatchDate}
            matchTime={matchTime} setMatchTime={setMatchTime}
            ticketPrice={ticketPrice} setTicketPrice={setTicketPrice}
            matchSaveSuccess={matchSaveSuccess}
            matches={matches}
            onSubmit={handleSaveMatch}
          />
        )}
        {activeTab === 'volunteers' && (
          <VolunteersPanel
            volunteersList={volunteersList}
            newVolunteerName={newVolunteerName} setNewVolunteerName={setNewVolunteerName}
            newVolunteerEmail={newVolunteerEmail} setNewVolunteerEmail={setNewVolunteerEmail}
            newVolunteerPassword={newVolunteerPassword} setNewVolunteerPassword={setNewVolunteerPassword}
            newVolunteerGate={newVolunteerGate} setNewVolunteerGate={setNewVolunteerGate}
            passwordAcknowledged={passwordAcknowledged} setPasswordAcknowledged={setPasswordAcknowledged}
            isCreatingVolunteer={isCreatingVolunteer}
            isPublished={isPublished}
            onAddVolunteer={handleAddVolunteer}
            onRemoveVolunteer={handleRemoveVolunteer}
            onPublishEvent={handlePublishEvent}
          />
        )}
      </main>
    </div>
  );
}
