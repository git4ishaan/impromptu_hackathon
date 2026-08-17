import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Layers, ZoomIn, ZoomOut, RotateCcw, Volume2, Compass, X } from 'lucide-react';

interface SeatMapperProps {
  onSelect?: (coords: { x: number; y: number }) => void;
  selectedCoords?: { x: number; y: number } | null;
  readonly?: boolean;
  pins?: { x: number; y: number; label?: string; host?: string; noise?: string }[];
}

export const SeatMapper: React.FC<SeatMapperProps> = ({
  onSelect,
  selectedCoords,
  readonly = false,
  pins = [],
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeFloor, setActiveFloor] = useState<string>('F2');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number } | null>(null);
  const [selectedZone, setSelectedZone] = useState<{
    name: string;
    floor: string;
    noise: string;
    occupancy: string;
    seats: number;
    description: string;
  } | null>(null);

  const floorData: Record<
    string,
    { name: string; noise: string; status: 'Quiet' | 'Moderate' | 'Busy'; statusColor: string; occupancy: string }
  > = {
    F1: { name: 'Collaborative Study Commons', noise: '42 dB', status: 'Moderate', statusColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20', occupancy: '74%' },
    F2: { name: 'Silent Focus & Reading Deck', noise: '18 dB', status: 'Quiet', statusColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', occupancy: '42%' },
    F3: { name: 'Engineering & Computing Wing', noise: '28 dB', status: 'Moderate', statusColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20', occupancy: '61%' },
    F4: { name: 'Research Desks & Deep Focus', noise: '20 dB', status: 'Quiet', statusColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20', occupancy: '35%' },
  };

  const handleImageClick = (e: React.MouseEvent) => {
    if (readonly || !onSelect || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    onSelect({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (readonly || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setHoverCoords({ x, y });
  };

  const currentFloor = floorData[activeFloor] || floorData['F2'];

  return (
    <div className="w-full space-y-4">
      {/* Floating Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-xl">
        {/* Floor Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          <Layers className="w-4 h-4 text-slate-400 ml-2 mr-1" />
          {['F1', 'F2', 'F3', 'F4'].map((floor) => (
            <button
              key={floor}
              type="button"
              onClick={() => setActiveFloor(floor)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeFloor === floor
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {floor}
            </button>
          ))}
        </div>

        {/* Live Acoustic Telemetry Pill */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
            <Volume2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Acoustics:</span>
            <span className="font-bold text-white">{currentFloor.noise}</span>
          </div>

          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${currentFloor.statusColor}`}>
            {currentFloor.status} • {currentFloor.occupancy} Full
          </span>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setZoomLevel((prev) => Math.min(prev + 0.2, 1.6))}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel((prev) => Math.max(prev - 0.2, 1))}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            {zoomLevel > 1 && (
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Reset zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Blueprint Visual Surface */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl group">
        <div
          ref={containerRef}
          className={`relative overflow-hidden transition-transform duration-300 ${
            readonly ? 'cursor-default' : 'cursor-crosshair'
          }`}
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
          onClick={handleImageClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverCoords(null)}
        >
          <img
            src="/campus_blueprint.png"
            alt="Central Library Interactive Floor Blueprint"
            className="w-full h-auto object-cover opacity-85 select-none transition-opacity duration-300"
          />

          {/* High-Tech Grid Coordinate Overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-25 bg-[linear-gradient(to_right,#8080801a_1px,transparent_1px),linear-gradient(to_bottom,#8080801a_1px,transparent_1px)] bg-[size:36px_36px]"></div>

          {/* Selected Seat Pin (Host Placement) */}
          {selectedCoords && (
            <div
              className="absolute z-30 transition-all duration-300 transform -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${selectedCoords.x}%`, top: `${selectedCoords.y}%` }}
            >
              <div className="relative flex flex-col items-center">
                <MapPin className="w-8 h-8 text-indigo-400 drop-shadow-[0_0_12px_rgba(99,102,241,0.9)] animate-bounce" />
                <div className="absolute top-0 left-0 w-8 h-8 bg-indigo-500 rounded-full animate-ping opacity-30"></div>
                <span className="px-2 py-0.5 mt-1 rounded bg-indigo-600 text-white font-extrabold text-[9px] uppercase tracking-wider shadow-lg whitespace-nowrap">
                  Selected Spot
                </span>
              </div>
            </div>
          )}

          {/* Active Session Pins */}
          {pins.map((pin, idx) => (
            <div
              key={idx}
              className="absolute z-20 transform -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-125 group/pin cursor-pointer"
              style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedZone({
                  name: pin.label || 'Study Spot',
                  floor: activeFloor,
                  noise: pin.noise || currentFloor.noise,
                  occupancy: currentFloor.occupancy,
                  seats: 6,
                  description: 'Active peer coordination group hosted on this floor deck.',
                });
              }}
            >
              <div className="relative flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/60 flex items-center justify-center backdrop-blur-sm shadow-[0_0_12px_rgba(16,185,129,0.5)]">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                </div>
                <div className="absolute -inset-1 rounded-full bg-emerald-400/30 animate-ping opacity-75"></div>
              </div>

              {/* Floating Tooltip Hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3.5 py-2 bg-slate-900/95 border border-slate-700/80 text-white rounded-xl opacity-0 group-hover/pin:opacity-100 transition-all duration-200 whitespace-nowrap shadow-2xl z-40 pointer-events-none space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                    {activeFloor} • {currentFloor.name}
                  </span>
                </div>
                <p className="text-xs font-extrabold text-slate-100">{pin.label || 'Active Session'}</p>
                <div className="flex items-center gap-3 text-[10px] text-slate-400 font-semibold pt-0.5">
                  <span>Noise: {currentFloor.noise}</span>
                  <span>•</span>
                  <span>Occupancy: {currentFloor.occupancy}</span>
                </div>
              </div>
            </div>
          ))}

          {/* Interactive Mouse Hover Target Ring */}
          {!readonly && hoverCoords && (
            <div
              className="absolute pointer-events-none border border-indigo-400/40 bg-indigo-500/10 w-6 h-6 rounded-full -translate-x-1/2 -translate-y-1/2 flex items-center justify-center backdrop-blur-[1px]"
              style={{ left: `${hoverCoords.x}%`, top: `${hoverCoords.y}%` }}
            >
              <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse"></div>
            </div>
          )}
        </div>

        {/* Top-Left Blueprint Badge */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-semibold text-slate-200 backdrop-blur-md shadow-lg">
          <Compass className="w-3.5 h-3.5 text-indigo-400" />
          <span>MIT-WPU Central Library • {activeFloor}</span>
        </div>

        {/* Bottom Instruction Bar */}
        <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs text-slate-400 backdrop-blur-md">
          <span>{readonly ? 'Hover or click markers to inspect telemetry.' : 'Click anywhere on the blueprint to place your group pin.'}</span>
          <span className="text-[11px] font-bold text-slate-300">{pins.length} active spots</span>
        </div>
      </div>

      {/* Zone Detail Modal/Card */}
      <AnimatePresence>
        {selectedZone && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="p-5 rounded-2xl bg-slate-900/95 border border-indigo-500/30 shadow-2xl backdrop-blur-xl flex items-start justify-between gap-4"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  {selectedZone.floor} Zone
                </span>
                <span className="text-xs font-semibold text-slate-400">• {selectedZone.occupancy} Full</span>
                <span className="text-xs font-semibold text-emerald-400">• Noise: {selectedZone.noise}</span>
              </div>
              <h4 className="text-base font-bold text-white headline-font">{selectedZone.name}</h4>
              <p className="text-xs text-slate-400">{selectedZone.description}</p>
            </div>

            <button
              onClick={() => setSelectedZone(null)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
