import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { Auth } from './components/Auth';
import { SessionFeed } from './components/SessionFeed';
import { CreateSessionModal } from './components/CreateSessionModal';
import { LiveWorkspace } from './components/LiveWorkspace';
import { SeatMapper } from './components/SeatMapper';
import { MapPin, Users, CheckSquare, LogOut, Loader2, Plus, Sparkles } from 'lucide-react';
import './App.css';

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [allSessions, setAllSessions] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Fetch all sessions for building the Map
    fetchGlobalSessions();

    const globalSubscription = supabase
      .channel('global:sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
        fetchGlobalSessions();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(globalSubscription);
    };
  }, []);

  const fetchGlobalSessions = async () => {
    const { data } = await supabase.from('sessions').select('subject, coordinates');
    if (data) setAllSessions(data);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setActiveSession(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-neutral-900 text-white p-8 font-sans flex flex-col items-center justify-center text-center">
        <header className="mb-8">
          <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-emerald-500 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Users className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-4">
            StudySpot MIT-WPU
          </h1>
          <p className="text-xl text-neutral-400">Join the live campus coordination hub</p>
        </header>
        <Auth />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-6 font-sans">
      <header className="max-w-6xl mx-auto flex justify-between items-center mb-12">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            StudySpot
          </h1>
          <p className="text-sm text-neutral-400">Welcome, {session.user.user_metadata.full_name || session.user.email}</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Host Session
          </button>
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-xl text-sm transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid gap-8 md:grid-cols-12">
        <div className="md:col-span-12 flex flex-col gap-8">
          {/* Welcome Banner */}
          <section className="bg-gradient-to-r from-blue-600/20 to-emerald-500/10 border border-blue-500/20 p-8 rounded-3xl flex justify-between items-center gap-8 relative overflow-hidden">
             <div className="relative z-10">
               <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                 <Sparkles className="w-6 h-6 text-yellow-400" />
                 Productivity is peaking today.
                </h2>
               <p className="text-neutral-400 max-w-md">There are currently {allSessions.length} active study sessions across the MIT-WPU Library floor.</p>
             </div>
             <Sparkles className="absolute -right-8 -top-8 w-64 h-64 text-blue-500/10 rotate-12" />
          </section>
        </div>

        <div className="md:col-span-7 flex flex-col gap-8">
          <section className="bg-neutral-800/30 backdrop-blur-sm p-8 rounded-3xl border border-neutral-700/50 min-h-[400px]">
            <SessionFeed onSelectSession={(s) => setActiveSession(s)} />
          </section>
        </div>

        <div className="md:col-span-5 flex flex-col gap-8">
          <section className="bg-neutral-800/30 backdrop-blur-sm p-6 rounded-3xl border border-neutral-700/50 overflow-hidden">
            <h3 className="text-sm font-black text-neutral-500 uppercase tracking-widest mb-4">Real-time Campus Map</h3>
            <div className="scale-75 origin-top">
              <SeatMapper 
                readonly 
                pins={allSessions.map(s => ({ ...s.coordinates, label: s.subject }))} 
              />
            </div>
          </section>
        </div>
      </main>

      {isModalOpen && (
        <CreateSessionModal 
          userId={session.user.id} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}

      {activeSession && (
        <LiveWorkspace 
          session={activeSession} 
          onClose={() => setActiveSession(null)} 
        />
      )}

      <footer className="max-w-6xl mx-auto mt-16 text-center text-xs text-neutral-500 border-t border-neutral-800 pt-8 pb-4">
        <p>&copy; 2026 StudySpot MIT-WPU Project. Innovation for campus navigability.</p>
      </footer>
    </div>
  );
}

export default App;
