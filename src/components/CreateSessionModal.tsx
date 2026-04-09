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
      const payload: any = {
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
    } catch (err: any) {
      setError(err.message || 'Failed to create session');
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
        className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto glass-card rounded-[3rem] shadow-[0_30px_60px_-15px_rgba(74,64,224,0.3)] transition-all"
      >
        <div className="p-8 border-b border-white/60 flex justify-between items-center bg-white/40 sticky top-0 z-10 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Plus className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-2xl font-black headline-font text-on-surface leading-tight">Host New Session</h3>
              <p className="text-[10px] font-black text-on-surface-variant opacity-60 uppercase tracking-[0.2em] mt-1">Setup your coordination spot</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-12 h-12 flex items-center justify-center bg-white/60 hover:bg-white text-on-surface-variant hover:text-red-500 rounded-2xl transition-all active:scale-90"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-10 p-10">
          {/* Form Side */}
          <form onSubmit={handleSubmit} className="space-y-10">
            <div className="space-y-6">
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-[0.25em] opacity-60 headline-font">1. Session Details</label>
              
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-primary/5 rounded-lg">
                  <Book className="w-4 h-4 text-primary" />
                </div>
                <input
                  type="text"
                  placeholder="Subject (e.g., Physics Midterm)"
                  required
                  className="w-full bg-white/40 border border-white/80 rounded-2xl py-5 pl-14 pr-4 text-on-surface font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-on-surface-variant/40"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-primary/5 rounded-lg">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <input
                  type="text"
                  placeholder="Location Name (e.g., Library F3)"
                  required
                  className="w-full bg-white/40 border border-white/80 rounded-2xl py-5 pl-14 pr-4 text-on-surface font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-on-surface-variant/40"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-6 pt-2">
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-[0.25em] opacity-60 headline-font">2. Settings</label>
              <div className="grid grid-cols-2 gap-4">
                <div 
                  onClick={() => setIsPrivate(!isPrivate)}
                  className={`p-5 rounded-3xl border transition-all relative overflow-hidden group shadow-sm ${
                    isPrivate 
                      ? 'bg-primary/10 border-primary/30 shadow-primary/5' 
                      : 'bg-white/40 border-white/80 hover:bg-white/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3 relative z-10">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isPrivate ? 'bg-primary/20 text-primary' : 'bg-on-surface-variant/5 text-on-surface-variant'}`}>
                      <Shield className="w-4 h-4" />
                    </div>
                    <div className={`w-10 h-5 rounded-full flex items-center p-1 transition-all ${isPrivate ? 'bg-primary' : 'bg-on-surface-variant/20'}`}>
                      <div className={`w-3 h-3 bg-white rounded-full shadow-md transition-all ${isPrivate ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                  </div>
                  <p className={`font-black text-sm headline-font ${isPrivate ? 'text-primary' : 'text-on-surface'} relative z-10`}>Private</p>
                  <p className="text-[10px] font-bold text-on-surface-variant opacity-60 mt-1 uppercase tracking-widest relative z-10">Host Approval Required</p>
                </div>

                <div className="p-5 rounded-3xl border border-white/80 bg-white/40 flex flex-col justify-center shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-xl bg-on-surface-variant/5 text-on-surface-variant flex items-center justify-center">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <select
                    className="bg-transparent text-sm font-black text-on-surface headline-font focus:outline-none cursor-pointer uppercase tracking-wide"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  >
                    <option value={30}>30 Minutes</option>
                    <option value={60}>1 Hour</option>
                    <option value={120}>2 Hours</option>
                    <option value={180}>3 Hours</option>
                  </select>
                  <p className="text-[10px] font-bold text-on-surface-variant opacity-60 mt-1 uppercase tracking-widest">Expected Time</p>
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
