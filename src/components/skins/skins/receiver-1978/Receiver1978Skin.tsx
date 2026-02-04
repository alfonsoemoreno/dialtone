"use client";

import { useMemo, useRef, useState } from "react";
import type { PlayerState, PlayerSource } from "@/lib/player/types";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const volumeToAngle = (volume: number) => -120 + volume * 240;
const angleToVolume = (angle: number) => (angle + 120) / 240;

export type Receiver1978SkinProps = {
  state: PlayerState;
  onPlayPause: () => void;
  onSourceChange: (source: PlayerSource) => void;
  onVolumeChange: (volume: number) => void;
};

export const Receiver1978Skin = ({
  state,
  onPlayPause,
  onSourceChange,
  onVolumeChange,
}: Receiver1978SkinProps) => {
  const knobRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const displayTitle = useMemo(() => {
    if (state.activeSource === "spotify") {
      return state.title ? `${state.title} · ${state.artist ?? ""}` : "Spotify Ready";
    }
    return state.stationName ?? "Select a station";
  }, [state]);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || !knobRef.current) return;
    const rect = knobRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const angle = Math.atan2(event.clientY - centerY, event.clientX - centerX);
    const degrees = (angle * 180) / Math.PI;
    const clamped = clamp(degrees, -120, 120);
    const volume = clamp(angleToVolume(clamped), 0, 1);
    onVolumeChange(volume);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(false);
  };

  return (
    <div className="skin receiver-1978">
      <div className="receiver-frame">
        <div className="receiver-top">
          <div className="receiver-brand">
            <span>HORIZON</span>
            <span className="receiver-model">RX-78</span>
          </div>
          <div className="receiver-display">
            <div className="display-line">{displayTitle}</div>
            <div className="display-sub">
              Source: {state.activeSource.toUpperCase()} · {state.status.toUpperCase()}
            </div>
          </div>
        </div>
        <div className="receiver-middle">
          <button className="play-toggle" onClick={onPlayPause}>
            {state.status === "playing" ? "Pause" : "Play"}
          </button>
          <div className="source-switch">
            <button
              className={state.activeSource === "radio" ? "active" : ""}
              onClick={() => onSourceChange("radio")}
            >
              Radio
            </button>
            <button
              className={state.activeSource === "spotify" ? "active" : ""}
              onClick={() => onSourceChange("spotify")}
            >
              Spotify
            </button>
          </div>
          <div className="vu-meter">
            <div className="vu-bar">
              <span
                className="vu-fill"
                style={{ height: `${Math.round((state.vuLevel ?? 0) * 100)}%` }}
              />
            </div>
            <div className="vu-bar">
              <span
                className="vu-fill"
                style={{ height: `${Math.round((state.vuLevel ?? 0) * 100)}%` }}
              />
            </div>
          </div>
        </div>
        <div className="receiver-bottom">
          <div
            className="volume-knob"
            ref={knobRef}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerMove={handlePointerMove}
            style={{ transform: `rotate(${volumeToAngle(state.volume)}deg)` }}
          >
            <span className="knob-indicator" />
          </div>
          <div className="volume-label">Volume</div>
        </div>
      </div>
    </div>
  );
};
