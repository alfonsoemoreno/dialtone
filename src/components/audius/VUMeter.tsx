import React, { useEffect, useState } from 'react';

interface VUMeterProps {
  level: number;
  channel: 'L' | 'R';
  isPlaying: boolean;
  isPowered: boolean;
  showLabel?: boolean;
}

export function VUMeter({
  level,
  channel,
  isPlaying,
  isPowered,
  showLabel = true,
}: VUMeterProps) {
  const [needleAngle, setNeedleAngle] = useState(-45);
  const faceOpacity = isPowered ? 1 : 0.25;
  const tickColor = isPowered ? "rgba(0,0,0,0.75)" : "rgba(0,0,0,0.35)";
  const minorTickColor = isPowered ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.2)";
  const labelColor = isPowered ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.35)";

  useEffect(() => {
    if (!isPowered || !isPlaying) {
      setNeedleAngle(-45);
      return;
    }
    
    const targetAngle = (level * 90) - 45;
    setNeedleAngle(prev => {
      const diff = targetAngle - prev;
      return prev + diff * 0.25;
    });
  }, [level, isPlaying, isPowered]);

  return (
    <div className="w-full">
      <div className="relative">
        
        {/* Meter face - minimalist design */}
        <div className="relative h-32 md:h-40">
          <svg viewBox="0 0 200 120" className="w-full h-full">
            <defs>
              <radialGradient id={`faceGrad-${channel}`} cx="50%" cy="35%" r="70%">
                <stop offset="0%" stopColor="rgba(245,228,191,0.95)" />
                <stop offset="55%" stopColor="rgba(230,205,150,0.9)" />
                <stop offset="100%" stopColor="rgba(195,160,85,0.9)" />
              </radialGradient>
              <linearGradient id={`bezelGrad-${channel}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(40,30,18,0.9)" />
                <stop offset="50%" stopColor="rgba(10,7,4,0.9)" />
                <stop offset="100%" stopColor="rgba(30,20,12,0.95)" />
              </linearGradient>
              <linearGradient id={`glassGrad-${channel}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
                <stop offset="30%" stopColor="rgba(255,255,255,0.05)" />
                <stop offset="60%" stopColor="rgba(255,255,255,0.12)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
              </linearGradient>
              <filter id={`needleShadow-${channel}`} x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="1.2" stdDeviation="1.2" floodColor="rgba(0,0,0,0.55)" />
              </filter>
              <radialGradient id={`pivotGrad-${channel}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(25,20,16,0.9)" />
                <stop offset="60%" stopColor="rgba(5,4,3,0.9)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.95)" />
              </radialGradient>
            </defs>

            <g style={{ opacity: faceOpacity }}>
              {/* Bezel */}
              <rect x="6" y="6" width="188" height="108" rx="8" fill={`url(#bezelGrad-${channel})`} />
              {/* Face */}
              <rect x="12" y="12" width="176" height="96" rx="6" fill={`url(#faceGrad-${channel})`} />
              {/* Inner shadow edge */}
              <rect
                x="12"
                y="12"
                width="176"
                height="96"
                rx="6"
                fill="none"
                stroke="rgba(0,0,0,0.25)"
                strokeWidth="1"
              />
            </g>
            
            {/* Subtle background arc */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke={minorTickColor}
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
                  stroke={isMain ? tickColor : minorTickColor}
                  strokeWidth={isMain ? "1.6" : "0.8"}
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
                  fill={db >= 0 ? labelColor : "rgba(0,0,0,0.45)"}
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
              stroke="rgba(120,20,15,0.55)"
              strokeWidth="3.5"
            />

            {/* Needle - ultra minimal */}
            <g
              style={{ 
                transform: `rotate(${needleAngle}deg)`, 
                transformOrigin: '100px 100px',
                transition: 'transform 0.1s ease-out',
                opacity: isPowered ? 1 : 0.2,
              }}
            >
              <line
                x1="100"
                y1="100"
                x2="100"
                y2="34"
                stroke="rgba(0,0,0,0.25)"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <line
                x1="100"
                y1="100"
                x2="100"
                y2="30"
                stroke={isPowered ? "rgba(200,40,30,0.95)" : "rgba(70,10,10,0.18)"}
                strokeWidth="2"
                strokeLinecap="round"
                filter={`url(#needleShadow-${channel})`}
              />
              
              {/* Needle tip */}
              <circle
                cx="100"
                cy="30"
                r="2"
                fill={isPowered ? "rgba(200,40,30,0.95)" : "rgba(70,10,10,0.2)"}
              />
            </g>

            {/* Center pivot - minimal */}
            <circle 
              cx="100" 
              cy="100" 
              r="6" 
              fill={`url(#pivotGrad-${channel})`}
            />
            <circle 
              cx="100" 
              cy="100" 
              r="2" 
              fill="rgba(255,255,255,0.08)"
            />

            {/* Glass highlight */}
            <rect
              x="12"
              y="12"
              width="176"
              height="96"
              rx="6"
              fill={`url(#glassGrad-${channel})`}
              opacity={isPowered ? 0.7 : 0.25}
            />
            <path
              d="M 20 20 H 180"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="1"
              opacity={isPowered ? 0.8 : 0.3}
            />
          </svg>

          {showLabel ? (
            <div className="absolute bottom-1 left-0 right-0 text-center">
              <span
                className="text-[10px] tracking-[0.3em] font-light"
                style={{
                  color: 'rgba(0,0,0,0.55)',
                }}
              >
                {channel}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
