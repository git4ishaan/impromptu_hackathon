import React, { useState, useRef } from 'react';
import { MapPin, Info } from 'lucide-react';

interface SeatMapperProps {
  onSelect?: (coords: { x: number; y: number }) => void;
  selectedCoords?: { x: number; y: number } | null;
  readonly?: boolean;
  pins?: { x: number; y: number; label?: string }[];
}

export const SeatMapper: React.FC<SeatMapperProps> = ({ 
  onSelect, 
  selectedCoords, 
  readonly = false,
  pins = []
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number } | null>(null);

  const handleImageClick = (e: React.MouseEvent) => {
    if (readonly || !onSelect || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    onSelect({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (readonly || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setHoverCoords({ x, y });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-neutral-400">
          <Info className="w-4 h-4 text-blue-400" />
          {readonly ? 'View group location on floor plan' : 'Click on the blueprint to pin your seat'}
        </div>
      </div>

      <div 
        ref={containerRef}
        className={`relative rounded-2xl overflow-hidden bg-neutral-950 border border-neutral-700 shadow-2xl cursor-crosshair group ${readonly ? 'cursor-default' : ''}`}
        onClick={handleImageClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverCoords(null)}
      >
        <img 
          src="/campus_blueprint.png" 
          alt="Campus Library Blueprint" 
          className="w-full h-auto opacity-70 group-hover:opacity-90 transition-opacity duration-500 select-none grayscale hover:grayscale-0"
        />

        {/* Dynamic Grid Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]"></div>

        {/* Selected Pin */}
        {selectedCoords && (
          <div 
            className="absolute z-20 transition-all duration-300 transform -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${selectedCoords.x}%`, top: `${selectedCoords.y}%` }}
          >
            <div className="relative">
              <MapPin className="w-8 h-8 text-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-bounce" />
              <div className="absolute top-0 left-0 w-8 h-8 bg-blue-500 rounded-full animate-ping opacity-25"></div>
            </div>
          </div>
        )}

        {/* Static Pins (Other Sessions) */}
        {pins.map((pin, idx) => (
          <div 
            key={idx}
            className="absolute z-10 transform -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-125 group/pin"
            style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
          >
            <MapPin className="w-6 h-6 text-emerald-500 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
            {pin.label && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-neutral-900 border border-neutral-700 text-[10px] text-white rounded opacity-0 group-hover/pin:opacity-100 transition-opacity whitespace-nowrap">
                {pin.label}
              </div>
            )}
          </div>
        ))}

        {/* Hover Indicator */}
        {!readonly && hoverCoords && (
          <div 
            className="absolute pointer-events-none border border-blue-500/30 bg-blue-500/10 w-4 h-4 rounded-full -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
            style={{ left: `${hoverCoords.x}%`, top: `${hoverCoords.y}%` }}
          >
            <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
          </div>
        )}
      </div>
    </div>
  );
};
