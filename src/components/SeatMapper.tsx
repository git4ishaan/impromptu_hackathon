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
        <div className="flex items-center gap-2 text-xs font-bold text-on-surface-variant uppercase tracking-widest bg-surface-container-high border-2 border-on-surface px-2 py-1 shadow-hard-sm">
          <Info className="w-4 h-4 text-on-surface stroke-[3]" />
          {readonly ? 'View location' : 'Click blueprint to pin seat'}
        </div>
      </div>

      <div 
        ref={containerRef}
        className={`relative overflow-hidden bg-canvas border-2 border-on-surface shadow-hard group ${readonly ? 'cursor-default' : 'cursor-crosshair'}`}
        onClick={handleImageClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverCoords(null)}
      >
        <img 
          src="/campus_blueprint.png" 
          alt="Campus Library Blueprint" 
          className="w-full h-auto select-none opacity-80"
        />

        {/* Dynamic Grid Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(to_right,#1b1c15_1px,transparent_1px),linear-gradient(to_bottom,#1b1c15_1px,transparent_1px)] bg-[size:40px_40px]"></div>

        {/* Selected Pin */}
        {selectedCoords && (
          <div 
            className="absolute z-20 transform -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${selectedCoords.x}%`, top: `${selectedCoords.y}%` }}
          >
            <div className="bg-primary-container border-2 border-on-surface shadow-hard-sm p-1 rounded-none">
              <MapPin className="w-8 h-8 text-on-surface stroke-[3]" />
            </div>
          </div>
        )}

        {/* Static Pins (Other Sessions) */}
        {pins.map((pin, idx) => (
          <div 
            key={idx}
            className="absolute z-10 transform -translate-x-1/2 -translate-y-1/2 group/pin cursor-pointer"
            style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
          >
            <div className="bg-secondary-container border-2 border-on-surface p-1 shadow-hard-sm transition-transform hover:-translate-y-1 hover:-translate-x-1 hover:shadow-hard rounded-none">
              <MapPin className="w-6 h-6 text-on-surface stroke-[3]" />
            </div>
            {pin.label && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-canvas border-2 border-on-surface text-[10px] font-black uppercase text-on-surface opacity-0 group-hover/pin:opacity-100 transition-opacity whitespace-nowrap shadow-hard-sm z-30">
                {pin.label}
              </div>
            )}
          </div>
        ))}

        {/* Hover Indicator */}
        {!readonly && hoverCoords && (
          <div 
            className="absolute pointer-events-none border-2 border-on-surface bg-primary w-4 h-4 -translate-x-1/2 -translate-y-1/2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            style={{ left: `${hoverCoords.x}%`, top: `${hoverCoords.y}%` }}
          />
        )}
      </div>
    </div>
  );
};
