import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Plus, Search, Radio, Volume2, Users, Clock } from 'lucide-react';

interface HeroSectionProps {
  sessionCount: number;
  onExplore: () => void;
  onHost: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isHosting: boolean;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  sessionCount,
  onExplore,
  onHost,
  searchQuery,
  onSearchChange,
  isHosting,
}) => {
  return (
    <section className="relative pt-12 pb-16 px-4 overflow-hidden">
      {/* Ambient background glow & subtle grid */}
      <div className="absolute inset-0 pointer-events-none -z-10 flex items-center justify-center">
        <div className="w-[800px] h-[400px] bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-cyan-500/15 rounded-full blur-3xl opacity-70"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
      </div>

      <div className="max-w-5xl mx-auto text-center space-y-8 relative z-10">
        {/* Top live badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/70 shadow-lg backdrop-blur-md"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-semibold text-slate-300">
            MIT-WPU Central Library • <span className="text-emerald-400 font-bold">Live Status</span>
          </span>
          <span className="w-1 h-1 rounded-full bg-slate-600"></span>
          <span className="text-xs font-medium text-slate-400">Semester Exam Week</span>
        </motion.div>

        {/* Editorial Heading */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="space-y-4"
        >
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white headline-font leading-[1.1]">
            Find your perfect{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-300 bg-clip-text text-transparent">
              study spot.
            </span>
          </h1>
          <p className="text-base sm:text-xl text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed">
            Discover where your campus is quiet, focused, and productive right now. Join peers or sync on campus blueprints.
          </p>
        </motion.div>

        {/* Live contextual telemetry pills */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-wrap items-center justify-center gap-3 pt-2"
        >
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 backdrop-blur-sm">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="font-semibold text-white">{sessionCount > 0 ? sessionCount : 12}</span> active sessions
          </div>
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 backdrop-blur-sm">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-semibold text-white">68%</span> library occupancy
          </div>
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 backdrop-blur-sm">
            <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold text-white">4</span> quiet zones free
          </div>
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 backdrop-blur-sm">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Next peak: <span className="font-semibold text-white">6:30 PM</span>
          </div>
        </motion.div>

        {/* Smart Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="max-w-2xl mx-auto pt-2"
        >
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-cyan-500/20 rounded-2xl blur-lg opacity-75 group-hover:opacity-100 transition duration-500"></div>
            <div className="relative flex items-center bg-slate-900/90 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-xl p-2 focus-within:border-indigo-500/80 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
              <Search className="w-5 h-5 text-slate-400 ml-3 shrink-0" />
              <input
                type="text"
                placeholder="Where do you want to study? (e.g., DSA group, Quiet F2, ML sprint...)"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full bg-transparent border-0 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="text-xs text-slate-400 hover:text-white px-2 py-1 mr-1"
                >
                  Clear
                </button>
              )}
              <button
                onClick={onExplore}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition-all active:scale-95 shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 shrink-0"
              >
                Explore <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick search prompt tags */}
          <div className="flex items-center justify-center gap-2 mt-3 flex-wrap text-xs text-slate-400">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Popular:</span>
            {['DSA Group', 'Silent Zone F2', 'Machine Learning', 'Research Desk F4'].map((tag) => (
              <button
                key={tag}
                onClick={() => onSearchChange(tag)}
                className="px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-[11px] text-slate-300 hover:text-white transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Action CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-4 pt-2"
        >
          <button
            onClick={onExplore}
            className="px-7 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/25 transition-all flex items-center gap-2 hover:translate-y-[-1px] active:scale-95"
          >
            Explore Study Spots <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onHost}
            disabled={isHosting}
            className={`px-7 py-3.5 rounded-xl border font-bold text-sm transition-all flex items-center gap-2 active:scale-95 ${
              isHosting
                ? 'bg-slate-800/40 border-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-slate-900/80 hover:bg-slate-800 border-slate-700 hover:border-slate-600 text-slate-200 hover:text-white shadow-lg'
            }`}
          >
            <Plus className="w-4 h-4 text-indigo-400" />
            {isHosting ? 'Already Hosting' : 'Host a Session'}
          </button>
        </motion.div>
      </div>
    </section>
  );
};
