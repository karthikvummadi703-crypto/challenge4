import React, { useState, useEffect, useCallback } from 'react';
import { Volunteer, Task, TaskStatus, OrderStatus, EmergencyStatus, IssueStatus } from '../types';
import { useAuth } from '../context/authContext';
import { getFriendlyErrorMessage } from '../services/authService';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { subscribeCollection, updateRecord } from '../services/dataSource';
import { useDemoMode } from '../context/demoModeContext';

import VolunteerLogin from './volunteer/VolunteerLogin';
import VolunteerHeader from './volunteer/VolunteerHeader';
import VolunteerTaskStack from './volunteer/VolunteerTaskStack';
import VolunteerMapPanel from './volunteer/VolunteerMapPanel';
import VolunteerAIChat from './volunteer/VolunteerAIChat';

interface VolunteerDashboardProps {
  onLogout: () => void;
}

interface DemoVolunteerAccount {
  id: string;
  name: string;
  volunteerId: string;
  email: string;
}

export default function VolunteerDashboard({ onLogout }: VolunteerDashboardProps) {
  const { user, profile, role, loginUser, logoutUser, error, setError, loading } = useAuth();
  const { isDemoMode, demoRole, demoProfile } = useDemoMode();
  const isVolunteerDemo = isDemoMode && demoRole === 'volunteer';

  // ── Auth state ──────────────────────────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState<DemoVolunteerAccount[]>([]);

  const currentVolunteer = isVolunteerDemo && demoProfile ? {
    id: demoProfile.uid,
    name: demoProfile.fullName,
    volunteerId: demoProfile.volunteerId || 'VOL-DEMO1',
    assignedGate: demoProfile.assignedGate || 'Gate A',
    email: demoProfile.email,
    status: 'active'
  } : (user && role === 'volunteer' ? {
    id: user.uid,
    name: profile?.fullName || 'Volunteer',
    volunteerId: user.uid ? `VOL-${user.uid.substring(0, 4).toUpperCase()}` : 'VOL-0000',
    assignedGate: 'Gate A',
    email: user.email,
    status: 'active'
  } : null);

  const isAuthenticated = !!currentVolunteer;

  // ── Task & map state ────────────────────────────────────────────────────────
  const [tasks, setTasks] = useState<Task[]>([]);
  const [highlightedSeat, setHighlightedSeat] = useState<string | undefined>(undefined);

  // ── Load demo accounts from Firestore ───────────────────────────────────────
  useEffect(() => {
    const fetchDemoVolunteers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'volunteers'));
        const volsList: DemoVolunteerAccount[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          volsList.push({
            id: doc.id,
            name: data.fullName || 'Volunteer',
            volunteerId: data.uid ? `VOL-${data.uid.substring(0, 4).toUpperCase()}` : 'VOL-0000',
            email: data.email
          });
        });
        setDemoAccounts(volsList);
      } catch (err) {
        console.error('Error loading volunteers from Firestore:', err);
      }
    };
    fetchDemoVolunteers();
  }, []);

  // ── Real-time task subscription ─────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !currentVolunteer) return;

    const unsubscribe = subscribeCollection('tasks', (snapshot) => {
      const dataList: Task[] = [];
      snapshot.forEach((docSnap) => {
        const t = docSnap.data() as Record<string, string>;
        dataList.push({
          id: docSnap.id,
          type: t.type as Task['type'],
          details: t.details,
          seatNumber: t.seatNumber,
          priority: t.priority as Task['priority'],
          status: t.status as Task['status'],
          assignedTo: t.assignedTo,
          timestamp: t.timestamp,
          linkedId: t.linkedId,
        });
      });
      dataList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setTasks(dataList);

      const activeTask = dataList.find(t => t.assignedTo === currentVolunteer.volunteerId && t.status === 'accepted');
      setHighlightedSeat(activeTask ? activeTask.seatNumber : undefined);
    });

    return () => unsubscribe();
  }, [isAuthenticated, currentVolunteer]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoginError('');
    setIsLoggingIn(true);
    try {
      await loginUser(email, password, 'volunteer');
    } catch (err: unknown) {
      setLoginError(getFriendlyErrorMessage(err));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleQuickLogin = async (acc: DemoVolunteerAccount) => {
    setEmail(acc.email);
    setPassword('password123');
    setLoginError('');
    setIsLoggingIn(true);
    try {
      await loginUser(acc.email, 'password123', 'volunteer');
    } catch (err: unknown) {
      console.error('Quick login failed:', err);
      setLoginError("Could not log in. Ensure the password matches 'password123' or your custom password.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  /**
   * Shared skeleton for task-status handlers: looks up `taskId` in the
   * current task list, silently no-ops if it's missing, runs `apply`,
   * and reports any Firestore error uniformly.
   */
  const runTaskAction = useCallback(async (
    taskId: string,
    apply: (task: Task) => Promise<void>,
    errorLabel: string
  ) => {
    if (!currentVolunteer) return;
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      await apply(task);
    } catch (err) {
      console.error(errorLabel, err);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVolunteer, tasks]);

  const handleAcceptTask = (taskId: string) => runTaskAction(taskId, async (task) => {
    await updateRecord('tasks', taskId, {
      status: 'accepted' satisfies TaskStatus,
      assignedTo: currentVolunteer!.volunteerId
    });
    const linkedId = task.linkedId;
    if (linkedId) {
      if (task.type === 'Deliver Food') {
        await updateRecord('foodOrders', linkedId, { status: 'preparing' satisfies OrderStatus });
      } else {
        await updateRecord('issueReports', linkedId, { assignedVolunteer: currentVolunteer!.volunteerId });
      }
    }
  }, 'Error accepting task:');

  const handleCompleteTask = (taskId: string) => runTaskAction(taskId, async (task) => {
    const completionTime = new Date().toISOString();
    const deliveryTimeMs = Date.now() - new Date(task.timestamp).getTime();
    await updateRecord('tasks', taskId, {
      status: 'completed' satisfies TaskStatus,
      deliveryTimeMs,
      completedAt: completionTime
    });
    const linkedId = task.linkedId;
    if (linkedId) {
      if (task.type === 'Deliver Food') {
        await updateRecord('foodOrders', linkedId, { status: 'delivered' satisfies OrderStatus });
      } else if (task.type === 'Medical Emergency') {
        await updateRecord('emergencyRequests', linkedId, { status: 'resolved' satisfies EmergencyStatus });
      } else {
        await updateRecord('issueReports', linkedId, { status: 'resolved' satisfies IssueStatus });
      }
    }
    setHighlightedSeat(undefined);
  }, 'Error completing task:');

  const handleLogout = async () => {
    await logoutUser();
    onLogout();
  };

  // ── Login gate ──────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <VolunteerLogin
        email={email} setEmail={setEmail}
        password={password} setPassword={setPassword}
        loginError={loginError}
        isLoggingIn={isLoggingIn}
        onSubmit={handleLogin}
        demoAccounts={demoAccounts}
        onQuickLogin={handleQuickLogin}
      />
    );
  }

  // ── Authenticated dashboard ─────────────────────────────────────────────────
  const myAssignedTasks = tasks.filter(t => t.assignedTo === currentVolunteer?.volunteerId && t.status !== 'completed');
  const otherTasks = tasks.filter(t => t.status === 'pending');

  return (
    <div id="volunteer-dashboard-root" className="min-h-screen bg-slate-950 text-white flex flex-col">
      <VolunteerHeader
        volunteerName={currentVolunteer?.name || ''}
        volunteerId={currentVolunteer?.volunteerId || ''}
        onLogout={handleLogout}
      />

      <main className="flex-1 p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch relative overflow-y-auto">
        <VolunteerTaskStack
          myAssignedTasks={myAssignedTasks}
          otherTasks={otherTasks}
          onHighlightSeat={setHighlightedSeat}
          onAcceptTask={handleAcceptTask}
          onCompleteTask={handleCompleteTask}
        />

        <VolunteerMapPanel
          highlightedSeat={highlightedSeat}
          activeTasks={tasks}
        />
      </main>

      <VolunteerAIChat />
    </div>
  );
}
