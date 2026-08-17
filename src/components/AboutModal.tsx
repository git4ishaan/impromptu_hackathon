import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Globe, Code, Sparkles, Shield, Cpu, ExternalLink, Library } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const liveUrl = typeof window !== 'undefined' ? window.location.origin : 'https://studyspot.vercel.app';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden text-slate-100 flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-600/30 text-white font-black text-sm">
                  S
                </div>
                <div>
                  <h3 className="text-lg font-extrabold headline-font text-white flex items-center gap-2">
                    About StudySpot
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 uppercase tracking-widest">
                      v2.0
                    </span>
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    MIT-WPU Campus Productivity Platform
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 space-y-6 overflow-y-auto">
              {/* Live URL Pill Box */}
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-600/20 rounded-xl text-indigo-400">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Live Platform URL</p>
                    <a
                      href={liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-black text-white hover:text-indigo-400 transition-colors flex items-center gap-1.5"
                    >
                      <span>{liveUrl}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
                <a
                  href={liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-600/30 transition-all active:scale-95 whitespace-nowrap self-stretch sm:self-auto text-center"
                >
                  Visit Live App
                </a>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Platform Mission</h4>
                <p className="text-sm text-slate-300 leading-relaxed">
                  StudySpot is a real-time spatial coordination hub that connects students across campus. It solves crowded library friction with interactive multi-floor blueprint mapping, real-time noise & occupancy telemetry, and Groq-powered AI tutoring.
                </p>
              </div>

              {/* Architecture Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <Cpu className="w-4 h-4 text-indigo-400" />
                  <p className="text-xs font-bold text-white">Groq AI Engine</p>
                  <p className="text-[11px] text-slate-400">Sub-second inference for campus study guidance.</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <p className="text-xs font-bold text-white">Supabase Realtime</p>
                  <p className="text-[11px] text-slate-400">PostgreSQL WebSocket sync with Row Level Security.</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <Library className="w-4 h-4 text-cyan-400" />
                  <p className="text-xs font-bold text-white">Spatial Map</p>
                  <p className="text-[11px] text-slate-400">Interactive F1–F4 library blueprint navigation.</p>
                </div>
              </div>

              {/* Links & Repository */}
              <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
                <a
                  href="https://github.com/git4ishaan/impromptu_hackathon"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-200 font-semibold transition-all"
                >
                  <Code className="w-4 h-4" />
                  <span>View GitHub Repository</span>
                </a>
                <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Built for MIT-WPU Hackathon 2026
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
