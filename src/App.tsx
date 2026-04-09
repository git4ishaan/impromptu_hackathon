import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { Auth } from './components/Auth';
import { SessionFeed } from './components/SessionFeed';
import { CreateSessionModal } from './components/CreateSessionModal';
import { LiveWorkspace } from './components/LiveWorkspace';
import { SeatMapper } from './components/SeatMapper';
import { StudyAssistant } from './components/StudyAssistant';
import { seedDemoSessions } from './lib/seedData';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Users, LogOut, Loader2, Plus, Sparkles, Database, Bell, Shield, AlertTriangle } from 'lucide-react';
import './App.css';

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Track if user is already hosting or in a session
  const isHosting = allSessions.some(s => s.host_id === session?.user?.id);

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

  // Ensure a profile row exists for the current user (fixes FK constraint on session_members)
  const ensureProfile = async (user: any) => {
    const { data } = await supabase.from('profiles').select('id').eq('id', user.id).single();
    if (!data) {
      await supabase.from('profiles').upsert({
        id: user.id,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Student',
      });
    }
  };

  useEffect(() => {
    if (!session?.user?.id) return;
    
    fetchGlobalData();

    const pollInterval = setInterval(() => {
      fetchGlobalData();
    }, 5000);

    const globalSub = supabase
      .channel('global:sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => fetchGlobalData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_members' }, () => fetchGlobalData())
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(globalSub);
    }
  }, [session?.user?.id]);

  const fetchGlobalData = async () => {
    if (!session?.user?.id) return;
    
    const { data: sessionData } = await supabase.from('sessions').select('*, profiles(full_name)');
    if (sessionData) setAllSessions(sessionData);

    const { data: memberData } = await supabase
      .from('session_members')
      .select('id, user_id, session_id, status, profiles(full_name)')
      .eq('status', 'pending');
      
    if (memberData && sessionData) {
      const myHostedIds = sessionData.filter(s => s.host_id === session.user.id).map(s => s.id);
      const myPending = memberData.filter(m => myHostedIds.includes(m.session_id));
      
      const enriched = myPending.map(m => ({
        ...m,
        session_subject: sessionData.find(s => s.id === m.session_id)?.subject
      }));
      setPendingRequests(enriched);
    }
  };

  const handleSeed = async () => {
    if (!session?.user?.id) return;
    setSeeding(true);
    await seedDemoSessions(session.user.id);
    setSeeding(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setActiveSession(null);
  };

  const handleHostSession = () => {
    if (isHosting) {
      alert('You are already hosting a session. Please end it before starting a new one.');
      return;
    }
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
          <Loader2 className="w-10 h-10 text-blue-500" />
        </motion.div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-neutral-900 text-white p-8 font-sans flex flex-col items-center justify-center text-center">
        <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-emerald-500 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Users className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-4">
            StudySpot MIT-WPU
          </h1>
          <p className="text-xl text-neutral-400">Join the live campus coordination hub</p>
        </motion.header>
        <Auth />
      </div>
    );
  }

  // ============ SESSION PAGE (full page, no overlay) ============
  if (activeSession) {
    return (
      <div className="min-h-screen bg-neutral-900 text-white font-sans">
        {/* Shared Navbar */}
        <header className="sticky top-0 z-50 bg-neutral-900/80 backdrop-blur-xl border-b border-neutral-800">
          <div className="max-w-6xl mx-auto flex justify-between items-center px-6 py-4">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <h1 
                className="text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setActiveSession(null)}
              >
                ← StudySpot
              </h1>
            </motion.div>
            
            <div className="flex items-center gap-4">
              {/* Notification Bell */}
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-xl transition-colors text-neutral-400 hover:text-white group"
                >
                  <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  {pendingRequests.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg border border-neutral-900 animate-pulse">
                      {pendingRequests.length}
                    </span>
                  )}
                </button>
                
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className="absolute top-full right-0 mt-4 w-80 bg-neutral-900 border border-neutral-700 rounded-3xl shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-neutral-800 bg-gradient-to-br from-indigo-500/10 to-transparent">
                        <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                          <Shield className="w-3 h-3" /> Access Alerts
                        </h4>
                      </div>
                      <div className="max-h-72 overflow-y-auto">
                        {pendingRequests.length === 0 ? (
                          <div className="p-6 text-center text-neutral-500 text-sm">No new requests.</div>
                        ) : (
                          pendingRequests.map(req => (
                            <div 
                              key={req.id} 
                              className="p-4 border-b border-neutral-800 hover:bg-neutral-800 transition-colors cursor-pointer"
                              onClick={() => {
                                setActiveSession(allSessions.find(s => s.id === req.session_id));
                                setShowNotifications(false);
                              }}
                            >
                              <p className="text-sm font-bold text-white">{req.profiles?.full_name || 'Anonymous'}</p>
                              <p className="text-xs text-neutral-400 mt-1">
                                wants to join <span className="text-indigo-400 font-bold">{req.session_subject}</span>
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button onClick={handleSignOut} className="flex items-center gap-2 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-xl text-sm transition-all">
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </header>

        {/* Full-page session workspace */}
        <LiveWorkspace 
          session={activeSession} 
          userId={session.user.id}
          onClose={() => setActiveSession(null)} 
        />
      </div>
    );
  }

  // ============ MAIN DASHBOARD ============
  return (
    <div className="min-h-screen bg-neutral-900 text-white font-sans">
      {/* Shared Navbar */}
      <header className="sticky top-0 z-50 bg-neutral-900/80 backdrop-blur-xl border-b border-neutral-800">
        <div className="max-w-6xl mx-auto flex justify-between items-center px-6 py-4">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
              StudySpot
            </h1>
            <p className="text-xs text-neutral-500">Welcome, {session.user.user_metadata.full_name || session.user.email}</p>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
            {/* Notification Bell */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-xl transition-colors text-neutral-400 hover:text-white group"
              >
                <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
                {pendingRequests.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg border border-neutral-900 animate-pulse">
                    {pendingRequests.length}
                  </span>
                )}
              </button>
              
              <AnimatePresence>
                {showNotifications && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute top-full right-0 mt-4 w-80 bg-neutral-900 border border-neutral-700 rounded-3xl shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="p-4 border-b border-neutral-800 bg-gradient-to-br from-indigo-500/10 to-transparent">
                      <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                        <Shield className="w-3 h-3" /> Access Alerts
                      </h4>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {pendingRequests.length === 0 ? (
                        <div className="p-6 text-center text-neutral-500 text-sm">No new requests.</div>
                      ) : (
                        pendingRequests.map(req => (
                          <div 
                            key={req.id} 
                            className="p-4 border-b border-neutral-800 hover:bg-neutral-800 transition-colors cursor-pointer"
                            onClick={() => {
                              setActiveSession(allSessions.find(s => s.id === req.session_id));
                              setShowNotifications(false);
                            }}
                          >
                            <p className="text-sm font-bold text-white">{req.profiles?.full_name || 'Anonymous'}</p>
                            <p className="text-xs text-neutral-400 mt-1">
                              wants to join <span className="text-indigo-400 font-bold">{req.session_subject}</span>
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {allSessions.length === 0 && (
              <button onClick={handleSeed} disabled={seeding} className="flex items-center gap-2 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white border border-neutral-700 rounded-xl text-sm transition-all">
                <Database className={`w-4 h-4 ${seeding ? 'animate-spin' : ''}`} />
                Seed Demo
              </button>
            )}
            <button 
              onClick={handleHostSession}
              disabled={isHosting}
              className={`flex items-center gap-2 px-6 py-2.5 font-bold rounded-xl text-sm transition-all active:scale-95 ${
                isHosting 
                  ? 'bg-neutral-700 text-neutral-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
              }`}
            >
              <Plus className="w-5 h-5" />
              {isHosting ? 'Already Hosting' : 'Host Session'}
            </button>
            <button onClick={handleSignOut} className="flex items-center gap-2 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-xl text-sm transition-all">
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </motion.div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 grid gap-8 md:grid-cols-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="md:col-span-12 flex flex-col gap-8"
        >
          <section className="bg-gradient-to-r from-blue-600/20 to-emerald-500/10 border border-blue-500/20 p-8 rounded-3xl flex justify-between items-center gap-8 relative overflow-hidden">
             <div className="relative z-10">
               <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                 <Sparkles className="w-6 h-6 text-yellow-400" />
                 Productivity is peaking today.
                </h2>
               <p className="text-neutral-400 max-w-md">There are currently {allSessions.length} active study sessions across the MIT-WPU Library floor.</p>
             </div>
             <motion.div
               animate={{ rotate: 360 }}
               transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
               className="absolute -right-8 -top-8 w-64 h-64 text-blue-500/10"
             >
               <Sparkles className="w-full h-full rotate-12" />
             </motion.div>
          </section>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="md:col-span-8 flex flex-col gap-8"
        >
          <section className="bg-neutral-800/30 backdrop-blur-sm p-8 rounded-3xl border border-neutral-700/50 min-h-[400px]">
            <SessionFeed onSelectSession={(s) => setActiveSession(s)} />
          </section>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="md:col-span-4 flex flex-col gap-8"
        >
          <StudyAssistant onJoinSession={(session) => setActiveSession(session)} />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="md:col-span-12 flex flex-col gap-8"
        >
          <section className="bg-neutral-800/30 backdrop-blur-sm p-6 rounded-3xl border border-neutral-700/50 overflow-hidden flex items-center justify-center">
            <div className="scale-[0.85] origin-center -my-12">
              <SeatMapper 
                readonly 
                pins={allSessions.map(s => ({ ...s.coordinates, label: s.subject }))} 
              />
            </div>
          </section>
        </motion.div>
      </main>

      <AnimatePresence>
        {isModalOpen && (
          <CreateSessionModal 
            userId={session.user.id} 
            onClose={() => setIsModalOpen(false)} 
          />
        )}
      </AnimatePresence>

      <footer className="max-w-6xl mx-auto mt-16 text-center text-xs text-neutral-500 border-t border-neutral-800 pt-8 pb-4">
        <p>&copy; 2026 StudySpot MIT-WPU Project. Innovation for campus navigability.</p>
      </footer>
    </div>
  );
}

export default App;
