"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Power,
  Radio as RadioIcon,
  Music,
} from "lucide-react";
import { VUMeter } from "@/components/audius/VUMeter";
import { ControlKnob } from "@/components/audius/ControlKnob";
import { StationList } from "@/components/audius/StationList";
import { Visualizer } from "@/components/audius/Visualizer";
import { getPlayerHub } from "@/lib/player/PlayerHub";
import { RadioProvider } from "@/lib/player/providers/radio";
import { SpotifyProvider } from "@/lib/player/providers/spotify";
import type { PlayerState } from "@/lib/player/types";
import type { RadioBrowserStation } from "@/lib/radioBrowser";
import { mapRadioBrowserStation } from "@/lib/radioBrowser";
import { storage } from "@/lib/storage";

interface Station {
  id: string;
  name: string;
  genre: string;
  frequency: string;
  streamUrl: string;
}

const defaultState: PlayerState = {
  source: "radio",
  activeSource: "radio",
  status: "idle",
  volume: 0.65,
};

export const PlayerUI = () => {
  const hub = useMemo(() => getPlayerHub(), []);
  const initialized = useRef(false);
  const radioRef = useRef<RadioProvider | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState>(defaultState);
  const [isPowerOn, setIsPowerOn] = useState(true);
  const [volume, setVolume] = useState(65);
  const [bass, setBass] = useState(50);
  const [treble, setTreble] = useState(50);
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [mode, setMode] = useState<"radio" | "music">("radio");
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [radioAnalyser, setRadioAnalyser] = useState<AnalyserNode | null>(null);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const settings = storage.getSettings();
    const radio = new RadioProvider();
    const spotify = new SpotifyProvider();
    hub.register(radio);
    hub.register(spotify);
    radioRef.current = radio;
    hub.setActive(settings.lastSource);
    hub.setVolume(settings.volume);
    setVolume(Math.round(settings.volume * 100));

    const unsubscribe = hub.onStateChange((state) => {
      setPlayerState(state);
      setVolume(Math.round(state.volume * 100));
      setMode(state.activeSource === "spotify" ? "music" : "radio");
    });

    return () => unsubscribe();
  }, [hub]);

  useEffect(() => {
    const interval = setInterval(() => {
      const analyser = radioRef.current?.getAnalyser() ?? null;
      setRadioAnalyser((prev) => (prev === analyser ? prev : analyser));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchStations = async () => {
      const params = new URLSearchParams({ country: "Chile", limit: "6" });
      const res = await fetch(`/api/radios/search?${params.toString()}`);
      const data = (await res.json()) as { stations: RadioBrowserStation[] };
      const mapped = (data.stations ?? []).map(mapRadioBrowserStation);
      const nextStations = mapped.slice(0, 6).map((station, idx) => ({
        id: station.id,
        name: station.name,
        genre: station.genre,
        frequency: (88 + idx * 2.1).toFixed(1),
        streamUrl: station.streamUrl,
      }));
      setStations(nextStations);
      if (!selectedStation && nextStations.length > 0) {
        setSelectedStation(nextStations[0]);
        const provider = hub.getProvider("radio") as RadioProvider | undefined;
        provider?.setStation(nextStations[0].name, nextStations[0].streamUrl);
      }
    };
    fetchStations().catch(() => undefined);
  }, [hub, selectedStation]);

  useEffect(() => {
    const loadStatus = async () => {
      const res = await fetch("/api/auth/spotify/status", { cache: "no-store" });
      if (!res.ok) return setSpotifyConnected(false);
      const data = (await res.json()) as { connected: boolean };
      setSpotifyConnected(Boolean(data.connected));
    };
    loadStatus().catch(() => undefined);
  }, []);


  const isPlaying = playerState.status === "playing";
  const isReady = isPowerOn;

  const handlePlayPause = async () => {
    if (!isReady) return;
    if (isPlaying) {
      await hub.pause();
    } else {
      await hub.play();
    }
  };

  const handleNext = async () => {
    if (!isReady) return;
    if (mode === "music") {
      await fetch("/api/spotify/next", { method: "POST" });
      return;
    }
    if (!stations.length || !selectedStation) return;
    const index = stations.findIndex((s) => s.id === selectedStation.id);
    const next = stations[(index + 1) % stations.length];
    setSelectedStation(next);
    const provider = hub.getProvider("radio") as RadioProvider | undefined;
    provider?.setStation(next.name, next.streamUrl);
    await hub.play();
  };

  const handlePrevious = async () => {
    if (!isReady) return;
    if (mode === "music") {
      await fetch("/api/spotify/previous", { method: "POST" });
      return;
    }
    if (!stations.length || !selectedStation) return;
    const index = stations.findIndex((s) => s.id === selectedStation.id);
    const prev = stations[(index - 1 + stations.length) % stations.length];
    setSelectedStation(prev);
    const provider = hub.getProvider("radio") as RadioProvider | undefined;
    provider?.setStation(prev.name, prev.streamUrl);
    await hub.play();
  };

  const handleSelectStation = async (station: Station) => {
    setSelectedStation(station);
    const provider = hub.getProvider("radio") as RadioProvider | undefined;
    provider?.setStation(station.name, station.streamUrl);
    await hub.setActive("radio");
    if (isReady) {
      await hub.play();
    }
  };

  const handleVolumeChange = async (next: number) => {
    setVolume(next);
    await hub.setVolume(next / 100);
  };

  const handleBassChange = (next: number) => {
    setBass(next);
    radioRef.current?.setTone(next, treble);
  };

  const handleTrebleChange = (next: number) => {
    setTreble(next);
    radioRef.current?.setTone(bass, next);
  };

  const handleTogglePower = () => {
    const next = !isPowerOn;
    setIsPowerOn(next);
    if (!next) {
      hub.pause();
    }
  };

  const handleMode = async (next: "radio" | "music") => {
    setMode(next);
    await hub.setActive(next === "music" ? "spotify" : "radio");
  };

  const handleConnectSpotify = () => {
    window.location.href = "/api/auth/spotify/login";
  };

  const leftLevel = playerState.vuLevel ?? 0;
  const rightLevel = playerState.vuLevel ?? 0;
  const analyser = playerState.activeSource === "radio" ? radioAnalyser : null;

  const currentStation = selectedStation ?? stations[0];

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 md:p-6"
      style={{
        background: "linear-gradient(to bottom, #0a0a0a 0%, #000000 100%)",
      }}
    >
      <div className="w-full max-w-none">
        <div
          className="relative w-full"
          style={{
            background: "linear-gradient(180deg, #0f0f0f 0%, #050505 50%, #000000 100%)",
            boxShadow:
              "0 40px 80px rgba(0,0,0,0.95), 0 20px 40px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.03)",
            borderRadius: "4px",
          }}
        >
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 50%, transparent)",
            }}
          ></div>

          <div className="relative p-8 md:p-12 lg:p-16 xl:p-20">
            <div className="flex items-center justify-between mb-12 lg:mb-16">
              <div>
                <h1
                  className="text-xl md:text-2xl lg:text-3xl font-light tracking-[0.5em]"
                  style={{
                    color: "#fff",
                    textShadow: "0 0 20px rgba(255,255,255,0.1)",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                  }}
                >
                  AUDIUS
                </h1>
                <p
                  className="text-[9px] md:text-[10px] tracking-[0.3em] mt-1"
                  style={{
                    color: "#666",
                    fontWeight: 300,
                  }}
                >
                  HIGH FIDELITY RECEIVER
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-xs tracking-[0.3em]" style={{ color: "#777" }}>
                  <button
                    onClick={() => handleMode("radio")}
                    className={`px-3 py-2 rounded-full transition-all ${
                      mode === "radio" ? "text-white" : "text-[#555]"
                    }`}
                    style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <RadioIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleMode("music")}
                    className={`px-3 py-2 rounded-full transition-all ${
                      mode === "music" ? "text-white" : "text-[#555]"
                    }`}
                    style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <Music className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={handleTogglePower}
                  className="relative group"
                >
                  <div
                    className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all"
                    style={{
                      background: isPowerOn
                        ? "radial-gradient(circle at center, rgba(255,255,255,0.05), rgba(255,255,255,0.01))"
                        : "transparent",
                      border: "1px solid rgba(255,255,255,0.1)",
                      boxShadow: isPowerOn ? "0 0 20px rgba(255,255,255,0.1)" : "none",
                    }}
                  >
                    <Power
                      className="w-5 h-5 md:w-6 md:h-6"
                      style={{
                        color: isPowerOn ? "#fff" : "#333",
                        filter: isPowerOn ? "drop-shadow(0 0 8px rgba(255,255,255,0.5))" : "none",
                      }}
                    />
                  </div>
                </button>

                <button
                  onClick={handleConnectSpotify}
                  className="px-4 py-2 rounded-full text-xs tracking-[0.2em]"
                  style={{
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: spotifyConnected ? "#fff" : "#666",
                  }}
                >
                  {spotifyConnected ? "SPOTIFY ON" : "CONNECT"}
                </button>
              </div>
            </div>

            <div
              className="mb-12 lg:mb-16 rounded-sm overflow-hidden"
              style={{
                background: "#000",
                boxShadow: "inset 0 2px 10px rgba(0,0,0,0.9)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <div className="relative px-8 py-12 md:px-16 md:py-16 lg:px-20 lg:py-20">
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: "linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 40%)",
                  }}
                ></div>

                <div className="grid grid-cols-2 gap-16 lg:gap-24 mb-16 lg:mb-20 max-w-4xl mx-auto">
                  <VUMeter level={leftLevel} channel="L" isPlaying={isPlaying && isPowerOn} />
                  <VUMeter level={rightLevel} channel="R" isPlaying={isPlaying && isPowerOn} />
                </div>

                <div
                  className="text-center mb-12"
                  style={{
                    opacity: isPowerOn ? 1 : 0.2,
                    transition: "opacity 0.5s",
                  }}
                >
                  <div className="mb-8">
                    <div
                      className="text-sm tracking-[0.3em] mb-3"
                      style={{
                        color: "#666",
                        fontWeight: 300,
                      }}
                    >
                      NOW PLAYING
                    </div>
                    <h2
                      className="text-3xl md:text-4xl lg:text-5xl font-light mb-3 tracking-wide"
                      style={{
                        color: "#fff",
                        fontFamily: "system-ui, -apple-system, sans-serif",
                      }}
                    >
                      {mode === "music"
                        ? playerState.title ?? "Spotify"
                        : selectedStation?.name ?? "Station"}
                    </h2>
                    <p
                      className="text-base md:text-lg lg:text-xl tracking-wider"
                      style={{
                        color: "#999",
                        fontWeight: 300,
                      }}
                    >
                      {mode === "music"
                        ? playerState.artist ?? ""
                        : selectedStation?.genre ?? ""}
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-8 mb-8">
                    <div
                      className="font-light tracking-[0.2em]"
                      style={{
                        fontSize: "3rem",
                        color: "#fff",
                        fontFamily: "system-ui, -apple-system, sans-serif",
                      }}
                    >
                      {mode === "music"
                        ? "SPOTIFY"
                        : selectedStation?.frequency ?? "--"}
                      <span className="text-xl ml-2" style={{ color: "#666" }}>
                        MHz
                      </span>
                    </div>
                  </div>

                  <div
                    className="flex items-center justify-center gap-8 text-xs tracking-[0.3em]"
                    style={{
                      color: "#666",
                      fontWeight: 300,
                    }}
                  >
                    <span className={mode === "radio" ? "text-white" : ""}>FM STEREO</span>
                    <span>•</span>
                    <span>96kHz / 24bit</span>
                  </div>
                </div>

                <div className="mb-12 max-w-4xl mx-auto">
                  <Visualizer isPlaying={isPlaying && isPowerOn} analyser={analyser} />
                </div>

                <div className="flex items-center justify-center gap-6 md:gap-8">
                  <button
                    onClick={handlePrevious}
                    disabled={!isPowerOn}
                    className="p-3 rounded-full transition-all disabled:opacity-20"
                    style={{
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.02)",
                    }}
                  >
                    <SkipBack className="w-5 h-5" style={{ color: "#fff" }} />
                  </button>

                  <button
                    onClick={handlePlayPause}
                    disabled={!isPowerOn}
                    className="p-5 rounded-full transition-all disabled:opacity-20"
                    style={{
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: isPowerOn && isPlaying
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(255,255,255,0.02)",
                      boxShadow: isPowerOn && isPlaying
                        ? "0 0 30px rgba(255,255,255,0.1)"
                        : "none",
                    }}
                  >
                    {isPlaying ? (
                      <Pause className="w-7 h-7" style={{ color: "#fff" }} />
                    ) : (
                      <Play className="w-7 h-7 ml-1" style={{ color: "#fff" }} />
                    )}
                  </button>

                  <button
                    onClick={handleNext}
                    disabled={!isPowerOn}
                    className="p-3 rounded-full transition-all disabled:opacity-20"
                    style={{
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.02)",
                    }}
                  >
                    <SkipForward className="w-5 h-5" style={{ color: "#fff" }} />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
              <div className="lg:col-span-4 flex flex-col justify-center">
                <div className="mb-4">
                  <div
                    className="text-xs tracking-[0.3em] mb-4"
                    style={{
                      color: "#666",
                      fontWeight: 300,
                    }}
                  >
                    VOLUME
                  </div>
                  <div
                    className="relative h-1 rounded-full"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                    }}
                  >
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={(e) => handleVolumeChange(Number(e.target.value))}
                      disabled={!isPowerOn}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                    />
                    <div
                      className="absolute inset-y-0 left-0 rounded-full transition-all"
                      style={{
                        width: `${volume}%`,
                        background: "rgba(255,255,255,0.3)",
                      }}
                    ></div>
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
                      style={{
                        left: `${volume}%`,
                        transform: "translate(-50%, -50%)",
                        background: "#fff",
                        boxShadow: "0 0 10px rgba(255,255,255,0.5)",
                      }}
                    ></div>
                  </div>
                  <div
                    className="flex justify-between mt-2 text-[10px] tracking-wider"
                    style={{
                      color: "#666",
                    }}
                  >
                    <span>0</span>
                    <span className="font-mono" style={{ color: "#fff" }}>
                      {volume}
                    </span>
                    <span>100</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5">
                {currentStation ? (
                  <StationList
                    stations={stations}
                    selectedStation={currentStation}
                    onSelectStation={handleSelectStation}
                    isPowerOn={isPowerOn}
                  />
                ) : (
                  <div className="text-xs tracking-[0.3em]" style={{ color: "#666" }}>
                    LOADING PRESETS
                  </div>
                )}
              </div>

              <div className="lg:col-span-3 flex flex-row lg:flex-col justify-center items-center gap-10">
                <ControlKnob value={bass} onChange={handleBassChange} label="BASS" disabled={!isPowerOn} />
                <ControlKnob value={treble} onChange={handleTrebleChange} label="TREBLE" disabled={!isPowerOn} />
              </div>
            </div>
          </div>

          <div
            className="absolute bottom-0 left-0 right-0 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(0,0,0,0.5) 50%, transparent)",
            }}
          ></div>
        </div>
      </div>
    </div>
  );
};
