import React, { useState } from 'react';

export function Equalizer() {
  const [bands, setBands] = useState([50, 50, 50, 50, 50]);
  const labels = ['60Hz', '250Hz', '1kHz', '4kHz', '16kHz'];

  const handleBandChange = (index: number, value: number) => {
    const newBands = [...bands];
    newBands[index] = value;
    setBands(newBands);
  };

  return (
    <div className="rounded-xl p-5" style={{
      background: 'linear-gradient(145deg, #1a1a1a, #0a0a0a)',
      boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.5)',
      border: '1px solid rgba(255,255,255,0.05)',
    }}>
      
      <div className="text-center mb-4">
        <span className="text-xs font-bold tracking-widest" style={{
          color: '#00ffff',
          textShadow: '0 0 10px #00ffff',
        }}>
          EQUALIZER
        </span>
      </div>

      <div className="flex justify-around items-end gap-3 h-32 mb-3">
        {bands.map((value, i) => (
          <div key={i} className="flex flex-col items-center gap-2 flex-1">
            <input
              type="range"
              min="0"
              max="100"
              value={value}
              onChange={(e) => handleBandChange(i, Number(e.target.value))}
              className="w-full h-24"
              style={{
                writingMode: 'bt-lr',
                WebkitAppearance: 'slider-vertical',
                appearance: 'slider-vertical',
                background: 'rgba(255,255,255,0.05)',
                outline: 'none',
                borderRadius: '4px',
              }}
            />
            <span className="text-[9px] font-mono" style={{ color: '#666' }}>
              {labels[i]}
            </span>
          </div>
        ))}
      </div>

      {/* EQ preset buttons */}
      <div className="grid grid-cols-3 gap-2">
        {['Flat', 'Rock', 'Jazz'].map((preset) => (
          <button
            key={preset}
            className="px-2 py-1 rounded text-[10px] font-semibold transition-all"
            style={{
              background: 'linear-gradient(135deg, #2a2a2a, #1a1a1a)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.05)',
              color: '#888',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            {preset}
          </button>
        ))}
      </div>
    </div>
  );
}
