import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Users, Loader2, ArrowRight, Clock } from 'lucide-react';

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
  onSelectSession?: (session: Session) => void;
}

export const SessionFeed: React.FC<SessionFeedProps> = ({ onSelectSession }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();

    const subscription = supabase
      .channel('public:sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
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
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8 px-2">
        <h3 className="text-2xl font-black headline-font text-on-surface flex items-center gap-3 tracking-tight">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          Live Sessions
        </h3>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 rounded-full border border-emerald-500/20">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Active Now</span>
        </div>
      </div>

      {sessions.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center p-16 bg-white/20 rounded-[2.5rem] border border-white/60 shadow-inner"
        >
          <div className="w-16 h-16 bg-white rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg">
            <Users className="w-8 h-8 text-on-surface-variant opacity-20" />
          </div>
          <p className="text-on-surface-variant font-medium headline-font opacity-60">No active sessions yet.</p>
          <p className="text-xs font-bold text-primary mt-2 uppercase tracking-widest">Be the first to host!</p>
        </motion.div>
      ) : (
        <div className="grid gap-4 max-h-[550px] overflow-y-auto pr-2 pb-6 no-scrollbar">
          <AnimatePresence>
            {sessions.map((session, index) => (
              <motion.div 
                key={session.id}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onSelectSession?.(session)}
                className="bg-white/40 backdrop-blur-md border border-white/80 p-6 rounded-[2rem] hover:border-primary/40 hover:bg-white/60 transition-all cursor-pointer group flex items-center justify-between shadow-sm hover:shadow-xl hover:shadow-primary/5 active:scale-[0.98]"
              >
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-primary uppercase tracking-[0.25em]">
                    {session.subject}
                  </span>
                  <h4 className="text-xl font-black text-on-surface headline-font group-hover:text-primary transition-colors leading-tight">
                    {session.location_name}
                  </h4>
                  <div className="flex items-center gap-4 pt-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-[10px] font-black text-primary border border-white">
                        {session.profiles?.full_name?.[0]?.toUpperCase() || 'S'}
                      </div>
                      <span className="text-xs font-bold text-on-surface-variant opacity-60 headline-font">
                         {session.profiles?.full_name || 'Anonymous'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-12 h-12 bg-white/60 rounded-2xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shadow-sm group-hover:shadow-primary/20">
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-all" />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
