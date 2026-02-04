"use client";

import { useMemo, useRef, useState } from "react";
import type { PlayerState, PlayerSource } from "@/lib/player/types";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const volumeToAngle = (volume: number) => -135 + volume * 270;
const angleToVolume = (angle: number) => (angle + 135) / 270;

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
    const clamped = clamp(degrees, -135, 135);
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
      <div className="pioneer-shell">
        <div className="pioneer-wood" />
        <div className="pioneer-face">
          <div className="pioneer-dial">
            <div className="dial-left">
              <div className="signal-tile">4</div>
              <div className="vu-box">
                <div className="vu-label">Signal</div>
                <div
                  className="vu-needle"
                  style={{
                    transform: `rotate(${(state.vuLevel ?? 0) * 32 - 12}deg)`,
                  }}
                />
              </div>
            </div>
            <div className="dial-scale">
              <div className="dial-brand">
                <span className="dial-logo">Pioneer</span>
                <span className="dial-model">4 Channel Stereo System</span>
              </div>
              <div className="dial-header">
                <span>FM</span>
                <span>MHz</span>
              </div>
              <div className="dial-line" />
              <div className="dial-markers">
                {["76", "78", "80", "82", "84", "86", "88", "90"].map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
              <div className="dial-sub">
                <span>AM</span>
                <span>kHz · x10</span>
              </div>
              <div className="dial-title">{displayTitle}</div>
            </div>
            <div className="dial-right">
              <div className="tuning-knob" />
              <div className="sq-badge">SQ</div>
            </div>
          </div>

          <div className="pioneer-row">
            <div className="control-stack control-power">
              <div className="control-label">Power</div>
              <div className="toggle">Off · On</div>
              <div className="mini-knob" />
              <div className="jack" />
              <div className="tiny-label">Phones</div>
            </div>
            <div className="control-stack control-bass">
              <div className="control-label">Bass</div>
              <div className="mini-knob" />
              <div className="tiny-label">Flat · Max</div>
            </div>
            <div className="control-stack control-treble">
              <div className="control-label">Treble</div>
              <div className="mini-knob" />
              <div className="tiny-label">Flat · Max</div>
            </div>
            <div className="control-stack control-volume">
              <div className="control-label">Volume</div>
              <div
                className="master-knob"
                ref={knobRef}
                onPointerDown={onPointerDown}
                onPointerUp={onPointerUp}
                onPointerMove={handlePointerMove}
                style={{ transform: `rotate(${volumeToAngle(state.volume)}deg)` }}
              >
                <span className="knob-indicator" />
              </div>
              <div className="tiny-label">Front · Rear</div>
            </div>
            <div className="control-stack control-balance">
              <div className="control-label">Balance</div>
              <div className="mini-knob" />
              <div className="tiny-label">Left · Right</div>
            </div>
            <div className="control-stack control-mode">
              <div className="control-label">Mode</div>
              <div className="slider" />
              <div className="slider" />
              <div className="slider" />
              <div className="tiny-label">4ch · 2ch</div>
            </div>
            <div className="control-stack control-selector">
              <div className="control-label">Selector</div>
              <div className="mini-knob" />
              <div className="tiny-label">AM/FM · Phono</div>
            </div>
            <div className="control-stack control-mic">
              <div className="control-label">Mic Mixing</div>
              <div className="mini-knob" />
              <div className="jack" />
              <div className="tiny-label">Mic</div>
            </div>
            <div className="control-stack control-cd4">
              <div className="control-label">CD-4 Sep</div>
              <div className="jack" />
              <div className="jack" />
              <div className="tiny-label">Left · Right</div>
            </div>
          </div>

          <div className="pioneer-actions">
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
      </div>
    </div>
  );
};
