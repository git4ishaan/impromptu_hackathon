import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { SeatMapper } from './SeatMapper';
import { motion } from 'framer-motion';
import { X, Book, MapPin, Loader2, Plus, MousePointer2, Shield, Clock } from 'lucide-react';

interface CreateSessionModalProps {
  onClose: () => void;
  userId: string;
}

export const CreateSessionModal: React.FC<CreateSessionModalProps> = ({ onClose, userId }) => {
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState('');
  const [locationName, setLocationName] = useState('');
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coords) {
      setError('Please pinpoint your seat on the map first!');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // Ensure profile exists in Supabase before inserting session (prevents FK error)
      try {
        const { data: profile } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle();
        if (!profile) {
          await supabase.from('profiles').upsert({
            id: userId,
            full_name: 'MIT-WPU Student',
          });
        }
      } catch (profileErr) {
        console.warn('Profile check warning:', profileErr);
      }

      interface SessionPayload {
        subject: string;
        location_name: string;
        host_id: string;
        coordinates: { x: number; y: number };
        is_private?: boolean;
        duration_minutes?: number;
      }

      const payload: SessionPayload = {
        subject,
        location_name: locationName,
        host_id: userId,
        coordinates: coords,
      };

      // Try inserting with new fields
      let { error: insertError } = await supabase.from('sessions').insert({
        ...payload,
        is_private: isPrivate,
        duration_minutes: durationMinutes
      });

      // If it fails (likely due to missing columns/SQL not run), fallback to legacy payload
      if (insertError?.message?.includes('duration_minutes') || insertError?.message?.includes('is_private')) {
        console.warn('Falling back to legacy insert. SQL migrations likely not applied.');
        const { error: fallbackError } = await supabase.from('sessions').insert(payload);
        insertError = fallbackError;
      }

      if (insertError) throw insertError;
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create session';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-neutral-950/90 backdrop-blur-md"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700/80 rounded-[2.5rem] shadow-2xl shadow-black/80 transition-all text-slate-100"
      >
        <div className="p-6 sm:p-8 border-b border-slate-800 flex justify-between items-center bg-slate-950/80 sticky top-0 z-10 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
              <Plus className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black headline-font text-white leading-tight">Host New Session</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">Setup your campus coordination spot</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-400 rounded-xl transition-all active:scale-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-10 p-10">
          {/* Form Side */}
          <form onSubmit={handleSubmit} className="space-y-10">
            <div className="space-y-6">
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-[0.25em] opacity-60 headline-font">1. Session Details</label>
              
              <div className="space-y-2">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-500/10 rounded-lg">
                    <Book className="w-4 h-4 text-indigo-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Subject (e.g., Physics Midterm)"
                    required
                    className="w-full bg-slate-900/80 border border-slate-700/80 rounded-2xl py-5 pl-14 pr-4 text-slate-100 font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-500"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {['Intro to ML', 'Engineering Physics', 'Thermodynamics', 'Data Structures', 'Calculus III'].map(sub => (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => setSubject(sub)}
                      className={`text-[10px] font-bold px-3 py-1 rounded-full border transition-all whitespace-nowrap ${
                        subject === sub 
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm' 
                          : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-500/10 rounded-lg">
                    <MapPin className="w-4 h-4 text-indigo-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Location Name (e.g., Library F3)"
                    required
                    className="w-full bg-slate-900/80 border border-slate-700/80 rounded-2xl py-5 pl-14 pr-4 text-slate-100 font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-500"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                  />
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {[
                    { name: 'F1 - Collaborative', x: 68.2, y: 45.1 },
                    { name: 'F2 - Silent Zone', x: 22.1, y: 78.4 },
                    { name: 'F3 - Engineering', x: 50.0, y: 55.0 },
                    { name: 'F4 - Research Desk', x: 35.5, y: 22.8 },
                    { name: 'Main Hall Cafe', x: 50.0, y: 15.0 },
                  ].map(loc => (
                    <button
                      key={loc.name}
                      type="button"
                      onClick={() => {
                        setLocationName(loc.name);
                        setCoords({ x: loc.x, y: loc.y });
                      }}
                      className={`text-[10px] font-bold px-3 py-1 rounded-full border transition-all whitespace-nowrap ${
                        locationName === loc.name 
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm' 
                          : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {loc.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6 pt-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] headline-font">2. Settings</label>
              <div className="grid grid-cols-2 gap-4">
                <div 
                  onClick={() => setIsPrivate(!isPrivate)}
                  className={`p-5 rounded-3xl border transition-all relative overflow-hidden group shadow-sm cursor-pointer ${
                    isPrivate 
                      ? 'bg-indigo-500/15 border-indigo-500/40 shadow-indigo-500/10' 
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3 relative z-10">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isPrivate ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-400'}`}>
                      <Shield className="w-4 h-4" />
                    </div>
                    <div className={`w-10 h-5 rounded-full flex items-center p-1 transition-all ${isPrivate ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                      <div className={`w-3 h-3 bg-white rounded-full shadow-md transition-all ${isPrivate ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                  </div>
                  <p className={`font-black text-sm headline-font ${isPrivate ? 'text-indigo-400' : 'text-slate-200'} relative z-10`}>Private</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest relative z-10">Host Approval Required</p>
                </div>

                <div className="p-5 rounded-3xl border border-slate-800 bg-slate-900/80 flex flex-col justify-center shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <select
                    className="bg-slate-900 text-sm font-black text-slate-100 headline-font focus:outline-none cursor-pointer uppercase tracking-wide border border-slate-800 rounded-lg p-1"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  >
                    <option value={30}>30 Minutes</option>
                    <option value={60}>60 Minutes (1 hr)</option>
                    <option value={90}>90 Minutes (1.5 hr)</option>
                    <option value={120}>120 Minutes (2 hr)</option>
                    <option value={180}>180 Minutes (3 hr)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-6 pt-4">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-bold headline-font"
                >
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full tonal-gradient-btn font-black py-5 rounded-[1.5rem] flex items-center justify-center gap-3 transition-all headline-font shadow-xl shadow-primary/20 active:scale-[0.97] disabled:opacity-50 uppercase tracking-[0.2em] text-sm"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    <Plus className="w-5 h-5" />
                    Launch Session
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Map Side */}
          <div className="space-y-6">
            <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-[0.25em] opacity-60 headline-font flex items-center gap-2">
              <MousePointer2 className="w-3 h-3" />
              Pin Exact Location
            </label>
            <div className="p-1 bg-white ring-1 ring-white/60 rounded-[2.5rem] shadow-xl overflow-hidden relative group">
              <SeatMapper 
                onSelect={setCoords} 
                selectedCoords={coords} 
              />
              {!coords && (
                <div className="absolute top-4 right-4 bg-primary text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg pointer-events-none animate-bounce uppercase tracking-widest">
                  Tap to Pin Seat
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
