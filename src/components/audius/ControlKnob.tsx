import React, { useState, useRef, useEffect } from 'react';

interface ControlKnobProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  disabled?: boolean;
}

export function ControlKnob({ value, onChange, label, disabled = false }: ControlKnobProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const startValueRef = useRef(0);

  const rotation = (value / 100) * 270 - 135;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    startYRef.current = e.clientY;
    startValueRef.current = value;
    e.preventDefault();
  };

  useEffect(() => {
    const handleMove = (clientY: number) => {
      if (!isDragging) return;
      const deltaY = startYRef.current - clientY;
      const newValue = Math.max(0, Math.min(100, startValueRef.current + deltaY * 0.5));
      onChange(Math.round(newValue));
    };

    const handlePointerMove = (e: PointerEvent) => handleMove(e.clientY);
    const handleEnd = () => setIsDragging(false);

    if (isDragging) {
      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handleEnd);
    }

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handleEnd);
    };
  }, [isDragging, onChange]);

  return (
    <div className="flex flex-col items-center gap-3">
      
      {/* Minimalist knob */}
      <div
        className="relative w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center"
        onPointerDown={handlePointerDown}
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.08)',
          touchAction: 'none',
          cursor: disabled ? 'not-allowed' : 'grab',
        }}
      >
        
        <div
          className={`w-14 h-14 md:w-18 md:h-18 rounded-full ${
            disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
          } relative`}
          style={{
            background: 'rgba(255,255,255,0.03)',
            transform: `rotate(${rotation}deg)`,
            transition: 'background 0.2s',
          }}
        >
          {/* Indicator dot */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-1 h-3 rounded-full" style={{
            background: 'rgba(255,255,255,0.75)',
            boxShadow: '0 0 6px rgba(255,255,255,0.4)',
          }}></div>
        </div>

        {/* Position arc */}
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="1"
            strokeDasharray="212"
            strokeDashoffset="53"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="1"
            strokeDasharray="212"
            strokeDashoffset={212 - (159 * value / 100) + 53}
            style={{
              transition: 'stroke-dashoffset 0.1s',
            }}
          />
        </svg>
      </div>

      {/* Label and value */}
      <div className="text-center">
        <div className="text-xs tracking-[0.3em] mb-1" style={{
          color: '#666',
          fontWeight: 300,
        }}>
          {label}
        </div>
        <div className="text-[10px] font-mono" style={{
          color: '#999',
        }}>
          {value > 50 ? `+${value - 50}` : value < 50 ? `-${50 - value}` : '0'}
        </div>
      </div>
    </div>
  );
}
