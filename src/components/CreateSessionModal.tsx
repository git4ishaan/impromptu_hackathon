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
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-neutral-900 border border-neutral-700 rounded-3xl shadow-2xl transition-all"
      >
        <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-800/50 sticky top-0 z-10 backdrop-blur-xl">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-400" />
            Host Study Session
          </h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-neutral-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-8 p-8">
          {/* Form Side */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <label className="block text-xs font-black text-neutral-500 uppercase tracking-widest">1. Session Details</label>
              
              <div className="relative">
                <Book className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Subject (e.g., Physics Midterm)"
                  required
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl py-4 pl-11 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-neutral-600"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Location Name (e.g., Library F3)"
                  required
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl py-4 pl-11 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-neutral-600"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <label className="block text-xs font-black text-neutral-500 uppercase tracking-widest">2. Settings</label>
              <div className="grid grid-cols-2 gap-4">
                <div 
                  onClick={() => setIsPrivate(!isPrivate)}
                  className={`p-4 rounded-xl border border-neutral-700 flex flex-col justify-center cursor-pointer transition-all ${isPrivate ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-neutral-800'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Shield className={`w-5 h-5 ${isPrivate ? 'text-indigo-400' : 'text-neutral-500'}`} />
                    <div className={`w-8 h-4 rounded-full flex items-center p-0.5 transition-colors ${isPrivate ? 'bg-indigo-500' : 'bg-neutral-700'}`}>
                      <div className={`w-3 h-3 bg-white rounded-full shadow transform transition-transform ${isPrivate ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </div>
                  <p className={`font-bold text-sm ${isPrivate ? 'text-indigo-300' : 'text-neutral-300'}`}>Private</p>
                  <p className="text-[10px] text-neutral-500 mt-1">Host approval required</p>
                </div>

                <div className="p-4 rounded-xl border border-neutral-700 bg-neutral-800 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-neutral-500" />
                  </div>
                  <select
                    className="bg-transparent text-sm font-bold text-white focus:outline-none cursor-pointer"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  >
                    <option value={30} className="bg-neutral-900">30 Minutes</option>
                    <option value={60} className="bg-neutral-900">1 Hour</option>
                    <option value={120} className="bg-neutral-900">2 Hours</option>
                    <option value={180} className="bg-neutral-900">3 Hours</option>
                  </select>
                  <p className="text-[10px] text-neutral-500 mt-1">Expected occupancy</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <label className="block text-xs font-black text-neutral-500 uppercase tracking-widest">3. Confirmation</label>
              {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/50 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50 shadow-xl shadow-blue-500/10"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Launch Session'}
              </button>
            </div>
          </form>

          {/* Map Side */}
          <div className="space-y-4">
            <label className="block text-xs font-black text-neutral-500 uppercase tracking-widest flex items-center gap-2">
              <MousePointer2 className="w-3 h-3" />
              Pin Exact Seat
            </label>
            <SeatMapper 
              onSelect={setCoords} 
              selectedCoords={coords} 
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
};
