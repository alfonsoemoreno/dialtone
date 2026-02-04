"use client";

import { useMemo, useRef, useState } from "react";
import type { PlayerState, PlayerSource } from "@/lib/player/types";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const volumeToAngle = (volume: number) => -130 + volume * 260;
const angleToVolume = (angle: number) => (angle + 130) / 260;

export type PioneerED110SkinProps = {
  state: PlayerState;
  onPlayPause: () => void;
  onSourceChange: (source: PlayerSource) => void;
  onVolumeChange: (volume: number) => void;
};

export const PioneerED110Skin = ({
  state,
  onPlayPause,
  onSourceChange,
  onVolumeChange,
}: PioneerED110SkinProps) => {
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
    const clamped = clamp(degrees, -130, 130);
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
    <div className="skin pioneer-ed110">
      <div className="pioneer-frame">
        <div className="pioneer-top">
          <div className="pioneer-brand">
            <span className="pioneer-logo">PIONEER</span>
            <span className="pioneer-model">ED-110 4 CHANNEL STEREO RECEIVER</span>
          </div>
          <div className="pioneer-display">
            <div className="display-line">{displayTitle}</div>
            <div className="display-sub">
              Source: {state.activeSource.toUpperCase()} · {state.status.toUpperCase()}
            </div>
          </div>
        </div>

        <div className="pioneer-middle">
          <div className="pioneer-vu">
            <div className={`vu-tube ${state.status === "playing" ? "playing" : ""}`}>
              <span />
            </div>
            <div className={`vu-tube ${state.status === "playing" ? "playing" : ""}`}>
              <span />
            </div>
          </div>
          <div className="pioneer-controls">
            <button className="pioneer-play" onClick={onPlayPause}>
              {state.status === "playing" ? "Pause" : "Play"}
            </button>
            <div className="pioneer-source">
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
          </div>
        </div>

        <div className="pioneer-bottom">
          <div
            className="pioneer-knob"
            ref={knobRef}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerMove={handlePointerMove}
            style={{ transform: `rotate(${volumeToAngle(state.volume)}deg)` }}
          >
            <span className="knob-indicator" />
          </div>
          <div className="knob-label">Master Volume</div>
        </div>
      </div>
    </div>
  );
};
