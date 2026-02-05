import React, { useState, useRef, useEffect } from 'react';

interface ControlKnobProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  disabled?: boolean;
  size?: "md" | "lg" | "xl";
  valueLabel?: string;
  showValue?: boolean;
  onClick?: () => void;
}

export function ControlKnob({
  value,
  onChange,
  label,
  disabled = false,
  size = "md",
  valueLabel,
  showValue = true,
  onClick,
}: ControlKnobProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const startValueRef = useRef(0);
  const movedRef = useRef(false);
  const activeInputRef = useRef<"pointer" | "touch" | null>(null);
  const draggingRef = useRef(false);
  const bodyOverflowRef = useRef<string | null>(null);

  const lockScroll = () => {
    if (typeof document === "undefined") return;
    if (bodyOverflowRef.current === null) {
      bodyOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
  };

  const unlockScroll = () => {
    if (typeof document === "undefined") return;
    if (bodyOverflowRef.current !== null) {
      document.body.style.overflow = bodyOverflowRef.current;
      bodyOverflowRef.current = null;
    }
  };

  const outerSize =
    size === "xl"
      ? "w-36 h-36 md:w-44 md:h-44"
      : size === "lg"
        ? "w-28 h-28 md:w-32 md:h-32"
        : "w-16 h-16 md:w-20 md:h-20";
  const innerSize =
    size === "xl"
      ? "w-32 h-32 md:w-40 md:h-40"
      : size === "lg"
        ? "w-24 h-24 md:w-28 md:h-28"
        : "w-14 h-14 md:w-18 md:h-18";

  const rotation = (value / 100) * 270 - 135;

  const startDrag = (clientY: number, input: "pointer" | "touch") => {
    if (draggingRef.current) return;
    activeInputRef.current = input;
    draggingRef.current = true;
    setIsDragging(true);
    startYRef.current = clientY;
    startValueRef.current = value;
    movedRef.current = false;
    if (input === "touch") {
      lockScroll();
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    e.stopPropagation();
    if (e.currentTarget.setPointerCapture) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    startDrag(e.clientY, "pointer");
    e.preventDefault();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    const touch = e.touches[0];
    if (!touch) return;
    e.stopPropagation();
    startDrag(touch.clientY, "touch");
    if (e.cancelable) e.preventDefault();
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (clientY: number) => {
      if (!draggingRef.current) return;
      const deltaY = startYRef.current - clientY;
      if (Math.abs(deltaY) > 3) {
        movedRef.current = true;
      }
      const newValue = Math.max(0, Math.min(100, startValueRef.current + deltaY * 0.5));
      onChange(Math.round(newValue));
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (activeInputRef.current !== "pointer") return;
      if (e.cancelable) e.preventDefault();
      handleMove(e.clientY);
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (activeInputRef.current !== "touch") return;
      const touch = e.touches[0];
      if (!touch) return;
      handleMove(touch.clientY);
      if (e.cancelable) e.preventDefault();
    };
    const endDrag = () => {
      if (!disabled && onClick && !movedRef.current) {
        onClick();
      }
      activeInputRef.current = null;
      draggingRef.current = false;
      setIsDragging(false);
      unlockScroll();
    };
    const handlePointerEnd = (e: PointerEvent) => {
      if (activeInputRef.current !== "pointer") return;
      if (movedRef.current && e.cancelable) e.preventDefault();
      endDrag();
    };
    const handleTouchEnd = (e: TouchEvent) => {
      if (activeInputRef.current !== "touch") return;
      if (movedRef.current && e.cancelable) e.preventDefault();
      endDrag();
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerEnd);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
      unlockScroll();
    };
  }, [isDragging, onChange, onClick, disabled]);

  return (
    <div className="flex flex-col items-center gap-3">
      
      {/* Minimalist knob */}
      <div
        className={`relative ${outerSize} rounded-full flex items-center justify-center`}
        onPointerDown={handlePointerDown}
        onTouchStart={handleTouchStart}
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.08)',
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          cursor: disabled ? 'not-allowed' : 'grab',
        }}
      >
        
        <div
          className={`${innerSize} rounded-full ${
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
        {showValue ? (
          <div
            className="text-[10px] font-mono"
            style={{
              color: '#999',
            }}
          >
            {valueLabel ?? (value > 50 ? `+${value - 50}` : value < 50 ? `-${50 - value}` : '0')}
          </div>
        ) : null}
      </div>
    </div>
  );
}
