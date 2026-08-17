import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowRight, Plus, BookOpen, MapPin } from 'lucide-react';

export interface Session {
  id: string;
  subject: string;
  location_name: string;
  host_id: string;
  is_private?: boolean;
  duration_minutes?: number;
  created_at: string;
  coordinates?: { x: number; y: number };
  profiles: {
    full_name: string;
  };
}

interface SessionFeedProps {
  onSelectSession?: (session: Session) => void;
  onHostClick?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

function calculateElapsedTime(isoDate: string): string {
  const diff = Math.floor((Date.now() - new Date(isoDate).getTime()) / (1000 * 60));
  if (diff < 1) return 'Just started';
  if (diff < 60) return `Started ${diff} min ago`;
  const hours = Math.floor(diff / 60);
  return `Started ${hours}h ago`;
}

function getFocusBadge(subject: string) {
  const s = subject.toLowerCase();
  if (s.includes('ml') || s.includes('ai') || s.includes('code') || s.includes('dsa') || s.includes('cs')) {
    return { label: 'Programming', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' };
  }
  if (s.includes('calc') || s.includes('math') || s.includes('physics') || s.includes('thermo')) {
    return { label: 'Mathematics', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' };
  }
  if (s.includes('prep') || s.includes('exam') || s.includes('midterm') || s.includes('final')) {
    return { label: 'Exam Prep', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
  }
  return { label: 'Collaborative', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
}

export const SessionFeed: React.FC<SessionFeedProps> = ({
  onSelectSession,
  onHostClick,
  searchQuery = '',
  onSearchChange,
}) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = ['All', 'Programming', 'Mathematics', 'Projects', 'Exam Prep'];

  useEffect(() => {
    let isSubscribed = true;

    const getSessions = async () => {
      try {
        const { data, error } = await supabase
          .from('sessions')
          .select(`
            *,
            profiles (
              full_name
            )
          `)
          .order('created_at', { ascending: false });

        if (!isSubscribed) return;

        if (error) {
          console.error('[StudySpot] Error fetching sessions:', error);
        } else if (data) {
          const normalized = (data as unknown as Array<Record<string, unknown>>).map(s => ({
            ...s,
            profiles: Array.isArray(s.profiles) ? s.profiles[0] : s.profiles
          }));
          setSessions(normalized as unknown as Session[]);
        }
      } catch (err) {
        console.error('[StudySpot] Unexpected session query error:', err);
      } finally {
        if (isSubscribed) setLoading(false);
      }
    };

    getSessions();

    const subscription = supabase
      .channel('public:sessions:feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
        getSessions();
      })
      .subscribe();

    return () => {
      isSubscribed = false;
      supabase.removeChannel(subscription);
    };
  }, []);

  const filteredSessions = sessions.filter(s => {
    const matchesSearch =
      s.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.location_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.profiles?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (activeCategory === 'All') return true;

    const sLower = s.subject.toLowerCase();
    if (activeCategory === 'Programming') return sLower.includes('cs') || sLower.includes('dsa') || sLower.includes('ml') || sLower.includes('code') || sLower.includes('algorithm');
    if (activeCategory === 'Mathematics') return sLower.includes('math') || sLower.includes('calc') || sLower.includes('physics') || sLower.includes('thermo');
    if (activeCategory === 'Exam Prep') return sLower.includes('exam') || sLower.includes('prep') || sLower.includes('midterm') || sLower.includes('final') || sLower.includes('sprint');
    if (activeCategory === 'Projects') return sLower.includes('project') || sLower.includes('hackathon') || sLower.includes('sprint');

    return true;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Loading live campus sessions...</p>
      </div>
    );
  }

  return (
    <section id="sessions" className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Live Discovery</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white headline-font tracking-tight">
            Active Study Groups
          </h2>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 self-start sm:self-auto shadow-inner">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeCategory === cat
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions Grid */}
      {filteredSessions.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-12 sm:p-16 bg-slate-900/50 rounded-3xl border border-slate-800/80 shadow-2xl backdrop-blur-md space-y-5"
        >
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mx-auto flex items-center justify-center shadow-lg">
            <BookOpen className="w-8 h-8 text-indigo-400" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-xl font-bold text-white headline-font">
              {searchQuery ? `No sessions match "${searchQuery}"` : 'Your next study session starts here.'}
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              {searchQuery
                ? 'Try searching for a different subject or reset filters to see all campus sessions.'
                : 'Be the first to host a focused study session and coordinate with peers on campus.'}
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            {searchQuery && onSearchChange && (
              <button
                onClick={() => {
                  onSearchChange('');
                  setActiveCategory('All');
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all"
              >
                Clear Filters
              </button>
            )}
            {onHostClick && (
              <button
                onClick={onHostClick}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Host a Session
              </button>
            )}
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {filteredSessions.map((session, index) => {
              const focusBadge = getFocusBadge(session.subject);
              const initials = session.profiles?.full_name
                ? session.profiles.full_name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)
                : 'ST';

              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.35, delay: index * 0.05 }}
                  onClick={() => onSelectSession?.(session)}
                  className="group relative p-6 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Header Row: Focus Tag & Live Pulse */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${focusBadge.color}`}>
                        {focusBadge.label}
                      </span>
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                        <span>{calculateElapsedTime(session.created_at)}</span>
                      </div>
                    </div>

                    {/* Subject Title */}
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-white group-hover:text-indigo-400 transition-colors headline-font leading-snug">
                        {session.subject}
                      </h3>
                      <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="font-semibold text-slate-300 truncate">{session.location_name}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Row: Host Info & Join CTA */}
                  <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-[10px] font-extrabold text-white shrink-0 shadow-sm">
                        {initials}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-semibold text-slate-300 truncate">
                          {session.profiles?.full_name || 'MIT-WPU Student'}
                        </p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Host</p>
                      </div>
                    </div>

                    <button className="px-4 py-2 rounded-xl bg-slate-800 group-hover:bg-indigo-600 text-slate-200 group-hover:text-white font-bold text-xs transition-all flex items-center gap-1.5 shrink-0 shadow-md group-hover:shadow-indigo-600/30">
                      <span>Join</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
};
