import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabaseClient';
import type { Session as SupabaseSession, User } from '@supabase/supabase-js';
import { Auth } from './components/Auth';
import { HeroSection } from './components/HeroSection';
import { CampusPulse } from './components/CampusPulse';
import { SessionFeed } from './components/SessionFeed';
import { CreateSessionModal } from './components/CreateSessionModal';
import { LiveWorkspace } from './components/LiveWorkspace';
import { SeatMapper } from './components/SeatMapper';
import { StudyAssistant } from './components/StudyAssistant';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, LogOut, Loader2, Plus, Bell, Shield, Compass } from 'lucide-react';
import './App.css';

interface SessionItem {
  id: string;
  subject: string;
  location_name: string;
  host_id: string;
  coordinates?: { x: number; y: number };
  is_private?: boolean;
  duration_minutes?: number;
  created_at?: string;
  profiles?: { full_name: string };
}

interface PendingRequestItem {
  id: string;
  user_id: string;
  session_id: string;
  status: string;
  session_subject?: string;
  profiles?: { full_name: string };
}

function App() {
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<SessionItem | null>(null);
  const [allSessions, setAllSessions] = useState<SessionItem[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequestItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeNav, setActiveNav] = useState('discover');

  // Track if user is already hosting
  const isHosting = allSessions.some(s => s.host_id === session?.user?.id);

  // Ensure a profile row exists for the current user in Supabase
  const ensureProfile = async (user: User) => {
    try {
      const { data } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
      if (!data) {
        await supabase.from('profiles').upsert({
          id: user.id,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Student',
        });
      }
    } catch (err) {
      console.warn('[StudySpot] Profile check notice:', err);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) ensureProfile(session.user);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) ensureProfile(session.user);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadGlobalData = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const { data: sessionData, error: sessionErr } = await supabase
        .from('sessions')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false });

      if (sessionErr) throw sessionErr;

      if (sessionData) {
        const normalized = (sessionData as unknown as Array<Record<string, unknown>>).map(s => ({
          ...s,
          profiles: Array.isArray(s.profiles) ? s.profiles[0] : s.profiles
        }));
        setAllSessions(normalized as unknown as SessionItem[]);
      }

      const { data: memberData } = await supabase
        .from('session_members')
        .select('id, user_id, session_id, status, profiles(full_name)')
        .eq('status', 'pending');
        
      if (memberData && sessionData) {
        const myHostedIds = sessionData.filter(s => s.host_id === session.user.id).map(s => s.id);
        const myPending = memberData.filter(m => myHostedIds.includes(m.session_id));
        
        const enriched: PendingRequestItem[] = myPending.map(m => {
          const profileObj = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
          return {
            ...m,
            profiles: profileObj ? { full_name: profileObj.full_name } : undefined,
            session_subject: sessionData.find(s => s.id === m.session_id)?.subject
          };
        });
        setPendingRequests(enriched);
      }
    } catch (err) {
      console.error('[StudySpot] Error loading global data:', err);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) return;

    loadGlobalData();

    const pollInterval = setInterval(() => {
      loadGlobalData();
    }, 20000);

    const globalSub = supabase
      .channel('global:sessions:realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => loadGlobalData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_members' }, () => loadGlobalData())
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(globalSub);
    };
  }, [session, loadGlobalData]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setActiveSession(null);
  };

  const handleHostSession = () => {
    if (isHosting) {
      alert('You are already hosting a session. Please end it before starting a new one.');
      return;
    }
    setIsModalOpen(true);
  };

  const scrollToSection = (sectionId: string) => {
    setActiveNav(sectionId);
    const elem = document.getElementById(sectionId);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
          <Loader2 className="w-10 h-10 text-indigo-500" />
        </motion.div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Connecting to StudySpot...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen relative text-on-surface p-6 sm:p-12 font-sans flex flex-col items-center justify-center text-center overflow-hidden bg-slate-950">
        {/* Ambient Blobs */}
        <div className="bg-blobs">
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
          <div className="blob blob-3"></div>
        </div>

        <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-4 relative z-10">
          <div className="w-20 h-20 bg-slate-900/90 border border-slate-800 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-2xl shadow-indigo-500/10">
            <Users className="w-10 h-10 text-indigo-400" />
          </div>
          <h1 className="text-5xl sm:text-6xl font-black headline-font tracking-tight text-white mb-2">
            StudySpot
          </h1>
          <p className="text-base sm:text-lg font-medium text-slate-400 max-w-md mx-auto mb-8">
            The next-generation campus productivity and coordination hub.
          </p>
        </motion.header>
        <Auth />
      </div>
    );
  }

  // ============ SESSION WORKSPACE VIEW ============
  if (activeSession) {
    return (
      <div className="min-h-screen relative text-slate-100 font-sans bg-slate-950">
        <div className="bg-blobs">
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
          <div className="blob blob-3"></div>
        </div>

        <LiveWorkspace 
          session={activeSession} 
          userId={session.user.id}
          onClose={() => {
            setActiveSession(null);
            loadGlobalData();
          }} 
        />
      </div>
    );
  }

  // ============ MAIN PRODUCTION DASHBOARD ============
  return (
    <div className="min-h-screen relative text-slate-100 font-sans bg-slate-950">
      {/* Background Blobs */}
      <div className="bg-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      {/* Sticky Glass Navbar */}
      <header className="glass-card sticky top-3 z-50 mx-3 sm:mx-6 mt-3 px-4 sm:px-6 py-3.5 rounded-2xl flex justify-between items-center bg-slate-900/85 border border-slate-800/80 shadow-2xl backdrop-blur-xl">
        <motion.div initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => scrollToSection('discover')}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-600/30 text-white font-black text-sm">
              S
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold headline-font tracking-tight text-white">StudySpot</span>
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 uppercase tracking-widest hidden sm:inline-block">
                  MIT-WPU
                </span>
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">
                Campus Productivity
              </p>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden lg:flex items-center gap-1 ml-4 pl-4 border-l border-slate-800 text-xs font-semibold text-slate-400">
            {[
              { id: 'discover', label: 'Discover' },
              { id: 'sessions', label: 'Live Groups' },
              { id: 'pulse', label: 'Campus Pulse' },
              { id: 'map', label: 'Floor Map' },
              { id: 'copilot', label: 'AI Copilot' },
            ].map((nav) => (
              <button
                key={nav.id}
                onClick={() => scrollToSection(nav.id)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeNav === nav.id
                    ? 'text-white bg-slate-800/90 font-bold'
                    : 'hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {nav.label}
              </button>
            ))}
          </nav>
        </motion.div>

        {/* Right Nav Action Controls */}
        <motion.div initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2.5">
          {/* Notification Alerts */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all text-slate-300 hover:text-white"
              title="Access Alerts"
            >
              <Bell className="w-4 h-4" />
              {pendingRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-lg border border-slate-900 animate-pulse">
                  {pendingRequests.length}
                </span>
              )}
            </button>
            
            <AnimatePresence>
              {showNotifications && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute top-full right-0 mt-3 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden"
                >
                  <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
                    <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5" /> Join Requests
                    </h4>
                    <span className="text-[10px] text-slate-400 font-semibold">{pendingRequests.length} pending</span>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60">
                    {pendingRequests.length === 0 ? (
                      <div className="p-6 text-center text-slate-500 text-xs">No pending requests right now.</div>
                    ) : (
                      pendingRequests.map(req => (
                        <div 
                          key={req.id} 
                          className="p-4 hover:bg-slate-800/70 transition-colors cursor-pointer"
                          onClick={() => {
                            setActiveSession(allSessions.find(s => s.id === req.session_id) || null);
                            setShowNotifications(false);
                          }}
                        >
                          <p className="text-xs font-bold text-white">{(Array.isArray(req.profiles) ? req.profiles[0]?.full_name : req.profiles?.full_name) || 'Student'}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            requested to join <span className="text-indigo-400 font-semibold">{req.session_subject}</span>
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Host Button CTA */}
          <button 
            onClick={handleHostSession}
            disabled={isHosting}
            className={`flex items-center gap-1.5 px-4 py-2 font-bold rounded-xl text-xs transition-all active:scale-95 shadow-md ${
              isHosting 
                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>{isHosting ? 'Hosting Active' : 'Host Session'}</span>
          </button>

          {/* User Signout */}
          <button 
            onClick={handleSignOut} 
            className="p-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-400 hover:text-white transition-all"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </motion.div>
      </header>

      {/* Main Page Layout Flow */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 space-y-16 pb-24">
        {/* 1. HERO SECTION */}
        <div id="discover">
          <HeroSection 
            sessionCount={allSessions.length}
            onExplore={() => scrollToSection('sessions')}
            onHost={handleHostSession}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            isHosting={isHosting}
          />
        </div>

        {/* 2. CAMPUS TELEMETRY PULSE */}
        <CampusPulse />

        {/* 3. DISCOVERY & AI COPILOT 2-COLUMN SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Live Session Discovery (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <SessionFeed 
              onSelectSession={(s) => setActiveSession(s as unknown as SessionItem)}
              onHostClick={handleHostSession}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </div>

          {/* Right: StudySpot AI Copilot (5 cols) */}
          <div id="copilot" className="lg:col-span-5 sticky top-24">
            <div className="rounded-3xl bg-slate-900/85 border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-xl">
              <StudyAssistant onJoinSession={(session) => setActiveSession(session as unknown as SessionItem)} />
            </div>
          </div>
        </div>

        {/* 4. INTERACTIVE CAMPUS NAVIGATION SYSTEM */}
        <div id="map" className="space-y-6 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800 pb-6">
            <div>
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
                <Compass className="w-4 h-4" />
                <span>Spatial Map Engine</span>
              </div>
              <h2 className="text-3xl font-extrabold text-white headline-font tracking-tight">
                Interactive Campus Navigation
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Explore library blueprint floors, inspect noise levels (dB), and pinpoint open desks in real-time.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-400 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 self-start sm:self-auto">
              MIT-WPU Central Library • Building 4
            </span>
          </div>

          <div className="w-full bg-slate-900/60 p-4 sm:p-6 rounded-3xl border border-slate-800 shadow-2xl backdrop-blur-md">
            <SeatMapper 
              readonly 
              pins={allSessions.filter(s => s.coordinates).map(s => ({ 
                x: s.coordinates!.x, 
                y: s.coordinates!.y, 
                label: s.subject,
                host: s.profiles?.full_name 
              }))} 
            />
          </div>
        </div>
      </main>

      {/* Host Session Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <CreateSessionModal 
            userId={session.user.id} 
            onClose={() => {
              setIsModalOpen(false);
              loadGlobalData();
            }} 
          />
        )}
      </AnimatePresence>

      {/* Premium SaaS Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
              S
            </div>
            <p className="font-semibold text-slate-400">
              StudySpot &copy; 2026 MIT-WPU • Campus Coordination Engine
            </p>
          </div>
          <div className="flex items-center gap-6 text-slate-400">
            <button onClick={() => scrollToSection('discover')} className="hover:text-white transition-colors">Discover</button>
            <button onClick={() => scrollToSection('sessions')} className="hover:text-white transition-colors">Sessions</button>
            <button onClick={() => scrollToSection('pulse')} className="hover:text-white transition-colors">Telemetry</button>
            <button onClick={() => scrollToSection('map')} className="hover:text-white transition-colors">Map</button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
