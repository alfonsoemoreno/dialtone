import React from 'react';

interface Station {
  id: string;
  name: string;
  genre: string;
  frequency: string;
}

interface StationListProps {
  stations: Station[];
  selectedStation: Station;
  onSelectStation: (station: Station) => void;
  isPowerOn: boolean;
}

export function StationList({ stations, selectedStation, onSelectStation, isPowerOn }: StationListProps) {
  return (
    <div>
      <div className="mb-4">
        <div className="text-xs tracking-[0.3em]" style={{
          color: '#666',
          fontWeight: 300,
        }}>
          PRESETS
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {stations.map((station, index) => {
          const isSelected = station.id === selectedStation.id;
          
          return (
            <button
              key={station.id}
              onClick={() => isPowerOn && onSelectStation(station)}
              disabled={!isPowerOn}
              className="text-left px-4 py-3 rounded-sm transition-all disabled:opacity-20"
              style={{
                background: isSelected
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isSelected ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)'}`,
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] tracking-wider font-mono" style={{
                  color: '#666',
                }}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="text-[10px] font-mono" style={{
                  color: isSelected ? '#fff' : '#999',
                }}>
                  {station.frequency}
                </span>
              </div>
              <div className="text-xs font-light truncate" style={{
                color: isSelected ? '#fff' : '#666',
              }}>
                {station.name}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
