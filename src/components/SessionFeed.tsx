import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Users, MapPin, ArrowRight, Loader2 } from 'lucide-react';

interface Session {
  id: string;
  subject: string;
  location_name: string;
  host_id: string;
  created_at: string;
  profiles: {
    full_name: string;
  };
}

interface SessionFeedProps {
  onSelectSession: (session: Session) => void;
}

export const SessionFeed: React.FC<SessionFeedProps> = ({ onSelectSession }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();

    // Subscribe to new sessions
    const subscription = supabase
      .channel('public:sessions')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sessions' }, () => {
        fetchSessions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchSessions = async () => {
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        profiles (
          full_name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching sessions:', error);
    } else {
      setSessions(data as any);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sessions.length === 0 ? (
        <div className="text-center p-12 bg-canvas border-2 border-on-surface shadow-hard">
          <Users className="w-12 h-12 text-on-surface mx-auto mb-4" />
          <p className="text-on-surface font-bold uppercase tracking-wider">No active sessions yet. Be the first to host one!</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {sessions.map((session) => (
            <div 
              key={session.id}
              onClick={() => onSelectSession(session)}
              className="bg-canvas border-2 border-on-surface shadow-hard hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer group flex flex-col sm:flex-row relative"
            >
              <div className="absolute top-0 left-0 bg-primary-container border-b-2 border-r-2 border-on-surface px-3 py-1 z-10 hidden sm:block">
                 <span className="text-[10px] font-black text-on-primary-fixed uppercase tracking-widest">{session.subject}</span>
              </div>
              <div className="p-6 sm:pl-8 space-y-2 flex-grow">
                <span className="sm:hidden text-[10px] font-black text-on-surface-variant uppercase tracking-widest bg-primary-container border-2 border-on-surface px-2 py-0.5 shadow-hard-sm inline-block mb-2">
                  {session.subject}
                </span>
                <h4 className="text-2xl font-display font-black text-on-surface uppercase group-hover:translate-x-2 transition-transform truncate max-w-[250px] md:max-w-md">
                  {session.location_name}
                </h4>
                <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-on-surface-variant pt-2 uppercase tracking-wide">
                  <span className="flex items-center gap-2 bg-surface-container-low border-2 border-on-surface px-2 py-1 text-on-surface">
                    <Users className="w-4 h-4 stroke-[3]" />
                     {session.profiles?.full_name || 'Anonymous User'}
                  </span>
                  <span className="flex items-center gap-2 bg-surface-container-low border-2 border-on-surface px-2 py-1 text-on-surface">
                    <MapPin className="w-4 h-4 stroke-[3]" />
                     Pinned on map
                  </span>
                </div>
              </div>
              <div className="sm:w-24 sm:border-l-2 border-t-2 sm:border-t-0 border-on-surface flex items-center justify-center bg-secondary-container group-hover:bg-secondary transition-colors p-4 sm:p-0 text-white">
                <ArrowRight className="w-8 h-8 stroke-[3] group-hover:translate-x-2 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
