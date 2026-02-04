import React, { useEffect, useState } from 'react';

interface VUMeterProps {
  level: number;
  channel: 'L' | 'R';
  isPlaying: boolean;
}

export function VUMeter({ level, channel, isPlaying }: VUMeterProps) {
  const [needleAngle, setNeedleAngle] = useState(-45);

  useEffect(() => {
    if (!isPlaying) {
      setNeedleAngle(-45);
      return;
    }
    
    const targetAngle = (level * 90) - 45;
    setNeedleAngle(prev => {
      const diff = targetAngle - prev;
      return prev + diff * 0.25;
    });
  }, [level, isPlaying]);

  return (
    <div className="w-full">
      <div className="relative">
        
        {/* Meter face - minimalist design */}
        <div className="relative h-32 md:h-40">
          <svg viewBox="0 0 200 120" className="w-full h-full">
            
            {/* Subtle background arc */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="rgba(255,255,255,0.03)"
              strokeWidth="1"
            />
            
            {/* Minimal scale marks */}
            {[...Array(19)].map((_, i) => {
              const angle = -90 + (i * 10);
              const isMain = i % 3 === 0;
              const radius = isMain ? 70 : 74;
              const radiusOuter = 78;
              
              const x1 = 100 + radius * Math.cos((angle * Math.PI) / 180);
              const y1 = 100 + radius * Math.sin((angle * Math.PI) / 180);
              const x2 = 100 + radiusOuter * Math.cos((angle * Math.PI) / 180);
              const y2 = 100 + radiusOuter * Math.sin((angle * Math.PI) / 180);
              
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth={isMain ? "1.5" : "0.8"}
                />
              );
            })}

            {/* Minimalist dB labels */}
            {[-20, -10, -3, 0, 3].map((db, idx) => {
              const angles = [-90, -60, -25, 0, 35];
              const angle = angles[idx];
              const radius = 58;
              
              const x = 100 + radius * Math.cos((angle * Math.PI) / 180);
              const y = 100 + radius * Math.sin((angle * Math.PI) / 180);
              
              return (
                <text
                  key={db}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-[9px] font-light"
                  fill={db >= 0 ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)'}
                  style={{
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                  }}
                >
                  {db > 0 ? `+${db}` : db}
                </text>
              );
            })}

            {/* Red zone indicator - subtle */}
            <path
              d="M 140 75 A 60 60 0 0 1 172 100"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="3"
            />

            {/* Needle - ultra minimal */}
            <defs>
              <linearGradient id={`needleGrad-${channel}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.6)" />
              </linearGradient>
            </defs>

            <g 
              style={{ 
                transform: `rotate(${needleAngle}deg)`, 
                transformOrigin: '100px 100px',
                transition: 'transform 0.1s ease-out',
              }}
            >
              <line
                x1="100"
                y1="100"
                x2="100"
                y2="30"
                stroke={`url(#needleGrad-${channel})`}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              
              {/* Needle tip */}
              <circle
                cx="100"
                cy="30"
                r="1.5"
                fill="rgba(255,255,255,0.8)"
              />
            </g>

            {/* Center pivot - minimal */}
            <circle 
              cx="100" 
              cy="100" 
              r="4" 
              fill="rgba(255,255,255,0.1)"
            />
            <circle 
              cx="100" 
              cy="100" 
              r="1.5" 
              fill="rgba(255,255,255,0.3)"
            />
          </svg>
        </div>

        {/* Channel label */}
        <div className="text-center mt-4">
          <span className="text-xs tracking-[0.3em] font-light" style={{
            color: 'rgba(255,255,255,0.5)',
          }}>
            {channel}
          </span>
        </div>
      </div>
    </div>
  );
}
