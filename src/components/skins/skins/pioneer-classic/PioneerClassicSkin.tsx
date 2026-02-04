"use client";

import { useRef, useState } from "react";
import type { PlayerState, PlayerSource } from "@/lib/player/types";
import { AnalogVUMeter } from "@/components/visuals/AnalogVUMeter";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const volumeToAngle = (volume: number) => -135 + volume * 270;
const angleToVolume = (angle: number) => (angle + 135) / 270;

export type PioneerClassicSkinProps = {
  state: PlayerState;
  onPlayPause: () => void;
  onSourceChange: (source: PlayerSource) => void;
  onVolumeChange: (volume: number) => void;
};

export const PioneerClassicSkin = ({
  state,
  onPlayPause,
  onSourceChange,
  onVolumeChange,
}: PioneerClassicSkinProps) => {
  const knobRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);

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

  const dialNeedle = (state.vuLevel ?? 0) * 18 - 9;

  const showOverlay = true;

  return (
    <div className="skin pioneer-classic">
      <div className="pioneer-classic-stage">
        <div
          className={`pioneer-classic-shell${showOverlay ? " show-overlay" : ""}`}
        >
        <div className="pioneer-classic-wood" />
        <div className="pioneer-classic-face">
          <div className="pioneer-classic-title">
            <span className="logo">Pioneer</span>
            <span className="model">4 Channel Stereo Receiver ED-110</span>
          </div>

          <div className="pioneer-classic-dial">
            <div className="pioneer-classic-vu left">
              <div className="vu-label">Level</div>
              <AnalogVUMeter level={state.vuLevel ?? 0} width={230} height={130} />
            </div>
            <div className="pioneer-classic-tuning">
              <div className="dial-arc" />
              <div className="dial-needle" style={{ transform: `rotate(${dialNeedle}deg)` }} />
              <div className="dial-scale">
                {[
                  "10",
                  "20",
                  "30",
                  "40",
                  "50",
                  "60",
                  "70",
                  "80",
                  "90",
                  "100",
                  "110",
                  "120",
                  "140",
                  "160",
                ].map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
            </div>
            <div className="pioneer-classic-vu right">
              <div className="vu-label">Level</div>
              <AnalogVUMeter level={state.vuLevel ?? 0} width={230} height={130} />
            </div>
          </div>

          <div className="pioneer-classic-display">
            <div className="freq">FM 102.7 MHz</div>
            <div className="song">
              {state.activeSource === "spotify"
                ? state.title ?? "Artist · Song Title"
                : state.stationName ?? "Radio Station"}
            </div>
          </div>

          <div className="pioneer-classic-row">
            <div className="control volume">
              <div className="label">Volume</div>
              <div
                className="knob"
                ref={knobRef}
                onPointerDown={onPointerDown}
                onPointerUp={onPointerUp}
                onPointerMove={handlePointerMove}
                style={{ transform: `rotate(${volumeToAngle(state.volume)}deg)` }}
              >
                <span className="knob-indicator" />
              </div>
            </div>
            <div className="control power">
              <div className="label">Power</div>
              <div className="toggle" />
            </div>
            <div className="control selector">
              <div className="label">Selector</div>
              <div className="selector-row">
                {["AUX", "FM", "AM", "FM", "AUX", "TAPE"].map((label, idx) => (
                  <button key={`${label}-${idx}`} className="selector-btn" />
                ))}
              </div>
              <div className="selector-labels">
                {["AUX", "FM", "AM", "FM", "AUX", "TAPE"].map((label, idx) => (
                  <span key={`${label}-${idx}`}>{label}</span>
                ))}
              </div>
            </div>
            <div className="control bass">
              <div className="label">Bass</div>
              <div className="knob small" />
            </div>
            <div className="control balance">
              <div className="label">Balance</div>
              <div className="knob small" />
            </div>
          </div>

          <div className="pioneer-classic-actions">
            <button className="action-btn" onClick={onPlayPause}>
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
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};
