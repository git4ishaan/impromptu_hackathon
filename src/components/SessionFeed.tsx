import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Users, MapPin, Clock, ArrowRight, Loader2 } from 'lucide-react';

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

export const SessionFeed: React.FC = () => {
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
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Clock className="w-5 h-5 text-emerald-400" />
          Live Study Sessions
        </h3>
        <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/20 animate-pulse">
          Live Now
        </span>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center p-12 bg-neutral-800/30 rounded-2xl border border-neutral-700/50">
          <Users className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
          <p className="text-neutral-400">No active sessions yet. Be the first to host one!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session) => (
            <div 
              key={session.id}
              className="bg-neutral-800/80 backdrop-blur-md border border-neutral-700 p-5 rounded-2xl hover:border-emerald-500/50 transition-all cursor-pointer group flex items-center justify-between"
            >
              <div className="space-y-1">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  {session.subject}
                </span>
                <h4 className="text-lg font-semibold text-white group-hover:text-emerald-300 transition-colors">
                  {session.location_name}
                </h4>
                <div className="flex items-center gap-3 text-sm text-neutral-400 pt-1">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                     {session.profiles?.full_name || 'Anonymous User'}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                     Pinned on map
                  </span>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-neutral-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
