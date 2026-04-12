import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { Auth } from './components/Auth';
import { SessionFeed } from './components/SessionFeed';
import { CreateSessionModal } from './components/CreateSessionModal';
import { LiveWorkspace } from './components/LiveWorkspace';
import { SeatMapper } from './components/SeatMapper';
import { Users, LogOut, Loader2, Plus, Sparkles } from 'lucide-react';
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
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-canvas text-on-surface font-body flex flex-col items-center justify-center text-center p-8">
        <header className="mb-12">
          <div className="w-24 h-24 bg-primary-container border-2 border-on-surface shadow-hard mx-auto mb-8 flex items-center justify-center transition-transform hover:-translate-y-1">
            <Users className="w-12 h-12 text-on-surface" />
          </div>
          <h1 className="text-5xl md:text-6xl font-display font-black tracking-tighter text-on-surface mb-4 -ml-2 uppercase inline-block border-b-8 border-primary-container pb-2">
            StudySpot <br/>MIT-WPU
          </h1>
          <p className="text-xl font-bold text-on-surface-variant font-body uppercase tracking-wider mt-4">Join the live campus coordination hub</p>
        </header>
        <Auth />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-on-surface font-body p-6 md:p-12">
      <header className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-6">
        <div className="-ml-2">
          <h1 className="text-4xl font-display font-black tracking-tighter text-on-surface uppercase border-b-4 border-on-surface inline-block pb-1">
            StudySpot
          </h1>
          <div className="mt-4">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest bg-surface-container-high border-2 border-on-surface inline-block px-3 py-1.5 shadow-hard-sm">
              User ID: {session.user.email}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-primary-container border-2 border-on-surface text-on-primary-fixed font-black text-sm uppercase tracking-wider shadow-hard transition-transform hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
            Host Session
          </button>
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-3 bg-canvas border-2 border-on-surface text-on-surface font-bold text-sm uppercase tracking-wider shadow-hard transition-transform hover:bg-surface-container-low hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            <LogOut className="w-4 h-4 stroke-[3]" />
            <span>Quit</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid gap-12 md:grid-cols-12">
        <div className="md:col-span-12">
          {/* Welcome Banner */}
          <section className="bg-gradient-to-r from-primary to-primary-container border-2 border-on-surface p-8 shadow-hard flex justify-between items-center gap-8 relative overflow-hidden">
             <div className="relative z-10 text-on-primary-fixed">
               <h2 className="text-3xl md:text-4xl font-display font-black mb-4 flex items-center gap-3 uppercase tracking-tighter">
                 <Sparkles className="w-8 h-8 text-on-surface fill-on-surface" />
                 Productivity is peaking.
                </h2>
               <p className="font-bold text-lg max-w-xl border-l-4 border-on-surface pl-4 bg-primary-fixed/50 py-2 border-y-2 border-r-2 shadow-hard-sm">There are currently {allSessions.length} active study sessions across the MIT-WPU Library floor.</p>
             </div>
             <div className="absolute right-0 top-0 bottom-0 w-64 bg-on-surface opacity-10 skew-x-12 translate-x-16"></div>
          </section>
        </div>

        <div className="md:col-span-7 flex flex-col">
          <section className="bg-surface-container-low p-8 border-2 border-on-surface shadow-hard min-h-[500px] relative">
             <div className="absolute top-0 left-0 -mt-5 ml-4">
                <span className="inline-block bg-surface-container-highest border-2 border-on-surface px-4 py-1 shadow-hard-sm font-display font-bold uppercase tracking-widest text-on-surface text-sm">Live Feed</span>
             </div>
            <div className="mt-4">
              <SessionFeed onSelectSession={(s) => setActiveSession(s)} />
            </div>
          </section>
        </div>

        <div className="md:col-span-5 flex flex-col">
          <section className="bg-surface-container-low border-2 border-on-surface shadow-hard relative overflow-hidden h-full min-h-[500px]">
             <div className="absolute top-0 right-0 bg-secondary-container border-l-2 border-b-2 border-on-surface px-3 py-1 z-10">
               <h3 className="text-xs font-black text-on-surface uppercase tracking-widest">Map Data</h3>
             </div>
            <div className="p-6 h-full flex flex-col">
              <div className="flex-1 rounded-none border-2 border-on-surface bg-canvas overflow-hidden relative shadow-[inset_0_4px_8px_rgba(0,0,0,0.1)] pt-8">
                 <SeatMapper 
                  readonly 
                  pins={allSessions.map(s => ({ ...s.coordinates, label: s.subject }))} 
                 />
              </div>
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

      <footer className="max-w-6xl mx-auto mt-24 text-center text-xs font-bold text-on-surface-variant uppercase tracking-widest border-t-2 border-on-surface pt-8 pb-8">
        <p>StudySpot MIT-WPU &bull; Kinetic Workspace Protocol 2026</p>
      </footer>
    </div>
  );
}

export default App;
