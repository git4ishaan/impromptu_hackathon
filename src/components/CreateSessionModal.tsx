import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { SeatMapper } from './SeatMapper';
import { X, Book, MapPin, Loader2, Plus, MousePointer2 } from 'lucide-react';

interface CreateSessionModalProps {
  onClose: () => void;
  userId: string;
}

export const CreateSessionModal: React.FC<CreateSessionModalProps> = ({ onClose, userId }) => {
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState('');
  const [locationName, setLocationName] = useState('');
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
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
      const { error: insertError } = await supabase
        .from('sessions')
        .insert({
          subject,
          location_name: locationName,
          host_id: userId,
          coordinates: coords,
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
      <div 
        className="absolute inset-0 bg-on-surface/20 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-surface-container-lowest/80 backdrop-blur-md border-2 border-on-surface rounded-none shadow-hard transition-all">
        <div className="p-6 border-b-2 border-on-surface flex justify-between items-center bg-primary-container sticky top-0 z-20">
          <h3 className="text-2xl font-display font-black flex items-center gap-2 uppercase tracking-tighter text-on-surface">
            <Plus className="w-8 h-8 stroke-[3]" />
            Host Study Session
          </h3>
          <button 
            onClick={onClose}
            className="p-2 border-2 border-on-surface bg-canvas shadow-hard-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none hover:bg-error-container transition-all"
          >
            <X className="w-5 h-5 stroke-[3] text-on-surface" />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-8 p-8">
          {/* Form Side */}
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-4">
              <label className="inline-block bg-surface-container-highest border-2 border-on-surface px-3 py-1 shadow-hard-sm text-xs font-black text-on-surface uppercase tracking-widest">1. Session Details</label>
              
              <div className="relative mt-2">
                <Book className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant stroke-[3]" />
                <input
                  type="text"
                  placeholder="Subject (e.g., Physics Midterm)"
                  required
                  className="w-full bg-canvas border-2 border-on-surface py-4 pl-11 pr-4 text-on-surface font-bold focus:outline-none focus:bg-primary-fixed focus:shadow-hard-sm transition-all placeholder:text-on-surface-variant"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant stroke-[3]" />
                <input
                  type="text"
                  placeholder="Location Name (e.g., Library F3)"
                  required
                  className="w-full bg-canvas border-2 border-on-surface py-4 pl-11 pr-4 text-on-surface font-bold focus:outline-none focus:bg-primary-fixed focus:shadow-hard-sm transition-all placeholder:text-on-surface-variant"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t-2 border-on-surface">
              <label className="inline-block bg-surface-container-highest border-2 border-on-surface px-3 py-1 shadow-hard-sm text-xs font-black text-on-surface uppercase tracking-widest">2. Confirmation</label>
              {error && (
                <div className="p-4 bg-error-container border-2 border-on-surface text-on-surface font-bold text-sm shadow-hard-sm mt-2">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-container border-2 border-on-surface text-on-primary-fixed font-black uppercase tracking-widest py-4 flex items-center justify-center gap-2 transition-transform hover:-translate-y-1 active:translate-y-1 active:translate-x-1 active:shadow-none disabled:opacity-50 shadow-hard mt-4"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Launch Session'}
              </button>
            </div>
          </form>

          {/* Map Side */}
          <div className="space-y-4">
            <label className="inline-block bg-surface-container-highest border-2 border-on-surface px-3 py-1 shadow-hard-sm text-xs font-black text-on-surface uppercase tracking-widest flex w-fit items-center gap-2">
              <MousePointer2 className="w-4 h-4 stroke-[3]" />
              Pin Exact Seat
            </label>
            <div className="mt-2">
              <SeatMapper 
                onSelect={setCoords} 
                selectedCoords={coords} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
