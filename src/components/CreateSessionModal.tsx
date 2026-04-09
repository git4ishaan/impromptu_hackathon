import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { X, Book, MapPin, Loader2, Plus } from 'lucide-react';

interface CreateSessionModalProps {
  onClose: () => void;
  userId: string;
}

export const CreateSessionModal: React.FC<CreateSessionModalProps> = ({ onClose, userId }) => {
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState('');
  const [locationName, setLocationName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('sessions')
        .insert({
          subject,
          location_name: locationName,
          host_id: userId,
          coordinates: { x: 0, y: 0 }, // Default for now until Mapper is ready
        });

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
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-700 rounded-3xl shadow-2xl overflow-hidden transition-all transform scale-100">
        <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-800/50">
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

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <label className="block text-sm font-medium text-neutral-400">Essential Details</label>
            
            <div className="relative">
              <Book className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
              <input
                type="text"
                placeholder="Subject (e.g., Organic Chemistry Prep)"
                required
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl py-4 pl-11 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-neutral-600"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
              <input
                type="text"
                placeholder="Specific Location (e.g., Library Floor 2 - Cubicle 12)"
                required
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl py-4 pl-11 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-neutral-600"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/50 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="pt-4 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Launch Session'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
