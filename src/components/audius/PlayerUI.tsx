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
  Search,
} from "lucide-react";
import { VUMeter } from "@/components/audius/VUMeter";
import { ControlKnob } from "@/components/audius/ControlKnob";
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
  bitrate?: number;
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
  const [radioModalOpen, setRadioModalOpen] = useState(false);
  const [radioQuery, setRadioQuery] = useState("");
  const [radioResults, setRadioResults] = useState<Station[]>([]);
  const [radioLoading, setRadioLoading] = useState(false);
  const [spotifyModalOpen, setSpotifyModalOpen] = useState(false);
  const [spotifyQuery, setSpotifyQuery] = useState("");
  const [spotifyLoading, setSpotifyLoading] = useState(false);
  const [spotifyView, setSpotifyView] = useState<"search" | "playlist" | "album">("search");
  const [spotifyDetailTitle, setSpotifyDetailTitle] = useState("");
  const [spotifyDetailUri, setSpotifyDetailUri] = useState<string | null>(null);
  const [spotifyDeviceId, setSpotifyDeviceId] = useState<string | null>(null);
  const [spotifyTracks, setSpotifyTracks] = useState<
    { id: string; name: string; artists: string; uri: string }[]
  >([]);
  const [spotifyPlaylists, setSpotifyPlaylists] = useState<
    { id: string; name: string; owner: string; uri: string }[]
  >([]);
  const [spotifyAlbums, setSpotifyAlbums] = useState<
    { id: string; name: string; artists: string; uri: string }[]
  >([]);
  const [spotifyDetailTracks, setSpotifyDetailTracks] = useState<
    { id: string; name: string; artists: string; uri: string }[]
  >([]);

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
    const interval = setInterval(() => {
      const provider = hub.getProvider("spotify") as SpotifyProvider | undefined;
      const deviceId = provider?.getDeviceId() ?? null;
      setSpotifyDeviceId((prev) => (prev === deviceId ? prev : deviceId));
    }, 1000);
    return () => clearInterval(interval);
  }, [hub]);

  const ensureSpotifyDevice = async () => {
    const provider = hub.getProvider("spotify") as SpotifyProvider | undefined;
    if (provider) {
      await provider.ensurePlayer();
    }
    const start = Date.now();
    while (Date.now() - start < 5000) {
      const id = provider?.getDeviceId() ?? null;
      if (id) {
        setSpotifyDeviceId(id);
        return id;
      }
      await new Promise((r) => setTimeout(r, 300));
    }
    return null;
  };

  useEffect(() => {
    const fetchStations = async () => {
      const params = new URLSearchParams({ country: "Chile", limit: "6", cors: "1" });
      const res = await fetch(`/api/radios/search?${params.toString()}`);
      const data = (await res.json()) as { stations: RadioBrowserStation[] };
      const mapped = (data.stations ?? []).map(mapRadioBrowserStation);
      const nextStations = mapped.slice(0, 6).map((station) => ({
        id: station.id,
        name: station.name,
        genre: station.genre,
        frequency: "",
        streamUrl: station.streamUrl,
        bitrate: station.bitrate,
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
    setRadioModalOpen(false);
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

  const handleSourceKnobChange = (next: number) => {
    if (!isPowerOn) return;
    if (mode === "radio" && next > 5) {
      handleMode("music").catch(() => undefined);
    } else if (mode === "music" && next < 95) {
      handleMode("radio").catch(() => undefined);
    }
  };

  const handleMode = async (next: "radio" | "music") => {
    setMode(next);
    await hub.setActive(next === "music" ? "spotify" : "radio");
  };

  const handleOpenSearch = () => {
    if (!isPowerOn) return;
    if (mode === "radio") {
      setRadioModalOpen(true);
    } else {
      setSpotifyModalOpen(true);
      setSpotifyView("search");
    }
  };

  const handleConnectSpotify = () => {
    window.location.href = "/api/auth/spotify/login";
  };

  const currentStation = selectedStation ?? stations[0];
  const leftLevel = playerState.vuLevel ?? 0;
  const rightLevel = playerState.vuLevel ?? 0;
  const analyser = playerState.activeSource === "radio" ? radioAnalyser : null;
  const sourceKnobValue = mode === "music" ? 100 : 0;
  const qualityLabel =
    mode === "radio"
      ? currentStation?.bitrate
        ? `${currentStation.bitrate} kbps`
        : "Quality: unknown"
      : playerState.album
        ? `Album: ${playerState.album}`
        : "Album: unknown";

  useEffect(() => {
    if (!radioModalOpen) return;
    const timeout = window.setTimeout(() => {
      if (radioQuery.trim().length > 1) searchRadios();
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [radioQuery, radioModalOpen]);

  const searchSpotify = async () => {
    setSpotifyLoading(true);
    try {
      const query = spotifyQuery.trim();
      const params = new URLSearchParams({ q: query, limit: "10" });
      const res = await fetch(`/api/spotify/search?${params.toString()}`);
      const data = (await res.json()) as {
        tracks: { id: string; name: string; uri: string; artists: string }[];
        playlists: { id: string; name: string; uri: string; owner: string }[];
        albums: { id: string; name: string; uri: string; artists: string }[];
      };

      let tracks = data.tracks ?? [];
      let playlists = data.playlists ?? [];
      let albums = data.albums ?? [];

      // Fallback: if nothing found, search as artist or track terms
      if (query && tracks.length === 0 && playlists.length === 0 && albums.length === 0) {
        const fallbackParams = new URLSearchParams({
          q: `artist:${query} OR track:${query}`,
          limit: "10",
        });
        const fallbackRes = await fetch(`/api/spotify/search?${fallbackParams.toString()}`);
        const fallbackData = (await fallbackRes.json()) as {
          tracks: { id: string; name: string; uri: string; artists: string }[];
          playlists: { id: string; name: string; uri: string; owner: string }[];
          albums: { id: string; name: string; uri: string; artists: string }[];
        };
        tracks = fallbackData.tracks ?? [];
        playlists = fallbackData.playlists ?? [];
        albums = fallbackData.albums ?? [];
      }

      setSpotifyTracks(tracks);
      setSpotifyPlaylists(playlists);
      setSpotifyAlbums(albums);
    } catch {
      setSpotifyTracks([]);
      setSpotifyPlaylists([]);
      setSpotifyAlbums([]);
    } finally {
      setSpotifyLoading(false);
    }
  };

  useEffect(() => {
    if (!spotifyModalOpen) return;
    const timeout = window.setTimeout(() => {
      if (spotifyQuery.trim().length > 1) searchSpotify();
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [spotifyQuery, spotifyModalOpen]);

  const openPlaylistDetail = async (id: string, name: string, uri: string) => {
    setSpotifyView("playlist");
    setSpotifyDetailTitle(name);
    setSpotifyDetailUri(uri);
    setSpotifyDetailTracks([]);
    const res = await fetch(`/api/spotify/playlist/${id}`);
    const data = (await res.json()) as {
      tracks: { id: string; name: string; artists: string; uri: string }[];
    };
    setSpotifyDetailTracks(data.tracks ?? []);
  };

  const openAlbumDetail = async (id: string, name: string, uri: string) => {
    setSpotifyView("album");
    setSpotifyDetailTitle(name);
    setSpotifyDetailUri(uri);
    setSpotifyDetailTracks([]);
    const res = await fetch(`/api/spotify/album/${id}`);
    const data = (await res.json()) as {
      tracks: { id: string; name: string; artists: string; uri: string }[];
    };
    setSpotifyDetailTracks(data.tracks ?? []);
  };

  const searchRadios = async () => {
    setRadioLoading(true);
    try {
      const query = radioQuery.trim();
      const makeList = (stations: RadioBrowserStation[]) =>
        stations.map(mapRadioBrowserStation).map((station) => ({
          id: station.id,
          name: station.name,
          genre: station.genre,
          frequency: "",
          streamUrl: station.streamUrl,
          bitrate: station.bitrate,
        }));

      const params = new URLSearchParams({ q: query, country: "Chile", limit: "20", cors: "1" });
      const res = await fetch(`/api/radios/search?${params.toString()}`);
      const data = (await res.json()) as { stations: RadioBrowserStation[] };
      let list = makeList(data.stations ?? []);

      if (query && list.length === 0) {
        const fallbackParams = new URLSearchParams({ q: query, limit: "20", cors: "1" });
        const fallbackRes = await fetch(`/api/radios/search?${fallbackParams.toString()}`);
        const fallbackData = (await fallbackRes.json()) as { stations: RadioBrowserStation[] };
        list = makeList(fallbackData.stations ?? []);
      }

      setRadioResults(list);
    } catch {
      setRadioResults([]);
    } finally {
      setRadioLoading(false);
    }
  };

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
            <div className="flex flex-col items-center text-center gap-6 mb-12 lg:mb-16 sm:flex-row sm:items-center sm:justify-between sm:text-left">
              <div className="text-center sm:text-left">
                <h1
                  className="text-xl md:text-2xl lg:text-3xl font-light tracking-[0.5em]"
                  style={{
                    color: "#fff",
                    textShadow: "0 0 20px rgba(255,255,255,0.1)",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                  }}
                >
                  HIICHO
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

              <div className="flex items-center justify-center gap-4 w-full sm:w-auto sm:justify-end">
                <button
                  onClick={handleConnectSpotify}
                  aria-label={spotifyConnected ? "Spotify connected" : "Connect Spotify"}
                  className="relative p-3 rounded-full transition-all"
                  style={{
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  <svg
                    viewBox="0 0 168 168"
                    className="w-5 h-5"
                    aria-hidden="true"
                    style={{ fill: spotifyConnected ? "#1DB954" : "#777" }}
                  >
                    <path d="M84 0C37.6 0 0 37.6 0 84s37.6 84 84 84 84-37.6 84-84S130.4 0 84 0zm38.3 121.5c-1.6 2.6-4.9 3.4-7.5 1.8-20.6-12.6-46.6-15.5-77.2-8.6-3 .7-6-1.2-6.7-4.2-.7-3 1.2-6 4.2-6.7 33.5-7.5 62.2-4.2 85.5 10 2.6 1.6 3.4 4.9 1.7 7.7zm10.7-23.7c-2 3.2-6.2 4.1-9.4 2.1-23.6-14.5-59.5-18.7-87.3-10.4-3.6 1.1-7.4-1-8.4-4.6-1.1-3.6 1-7.4 4.6-8.4 31.8-9.6 71.3-5 98.7 11.8 3.2 2 4.1 6.2 2.2 9.5zm.9-24.7C108.6 58.1 62.5 57 37.6 64.6c-4.2 1.3-8.7-1.1-10-5.3-1.3-4.2 1.1-8.7 5.3-10 28.6-8.7 79-7.4 109.8 13.2 3.8 2.2 5.1 7.1 2.8 10.9-2.1 3.8-7 5-10.8 2.7z" />
                  </svg>
                  <span
                    className="absolute -right-0.5 -top-0.5 w-2.5 h-2.5 rounded-full"
                    style={{
                      background: spotifyConnected ? "#1DB954" : "#f4c94f",
                      boxShadow: spotifyConnected
                        ? "0 0 6px rgba(29,185,84,0.8)"
                        : "0 0 6px rgba(244,201,79,0.8)",
                    }}
                  ></span>
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
                <div className="max-w-6xl mx-auto mb-16 lg:mb-20">
                  <div className="flex flex-col items-center justify-center gap-8 md:gap-10 lg:flex-row lg:items-center">
                    <ControlKnob
                      value={sourceKnobValue}
                      onChange={handleSourceKnobChange}
                      label="SOURCE"
                      valueLabel={mode === "music" ? "SPOTIFY" : "RADIO"}
                      onClick={() => handleMode(mode === "music" ? "radio" : "music")}
                      disabled={!isPowerOn}
                    />
                    <ControlKnob
                      value={bass}
                      onChange={handleBassChange}
                      label="BASS"
                      disabled={!isPowerOn}
                    />
                    <ControlKnob
                      value={treble}
                      onChange={handleTrebleChange}
                      label="TREBLE"
                      disabled={!isPowerOn}
                    />
                    <div className="w-48 md:w-56 flex items-center justify-center lg:ml-6">
                      <VUMeter
                        level={leftLevel}
                        channel="L"
                        isPlaying={isPlaying && isPowerOn}
                        isPowered={isPowerOn}
                      />
                    </div>
                    <div className="w-48 md:w-56 flex items-center justify-center">
                      <VUMeter
                        level={rightLevel}
                        channel="R"
                        isPlaying={isPlaying && isPowerOn}
                        isPowered={isPowerOn}
                      />
                    </div>
                    <div className="lg:pl-6">
                      <ControlKnob
                        value={volume}
                        onChange={handleVolumeChange}
                        label="VOLUME"
                        disabled={!isPowerOn}
                        size="xl"
                      />
                    </div>
                  </div>
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
                    {mode === "music" && playerState.artist ? (
                      <p
                        className="text-base md:text-lg lg:text-xl tracking-wider"
                        style={{
                          color: "#999",
                          fontWeight: 300,
                        }}
                      >
                        {playerState.artist}
                      </p>
                    ) : null}
                  </div>

                  <div
                    className="flex items-center justify-center gap-3 text-xs tracking-[0.2em]"
                    style={{
                      color: "#666",
                      fontWeight: 300,
                    }}
                  >
                    <span className={mode === "radio" ? "text-white" : ""}>
                      {mode === "radio" ? "RADIO" : "SPOTIFY"}
                    </span>
                    <span>•</span>
                    <span>{qualityLabel}</span>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center gap-4 md:flex-row md:flex-wrap md:gap-8">
                  <div className="flex items-center justify-center gap-6 md:contents">
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

                  <div className="flex items-center justify-center gap-6 md:contents">
                    <button
                      onClick={handleTogglePower}
                      className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all disabled:opacity-20"
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
                    </button>

                    <button
                      onClick={handleOpenSearch}
                      disabled={!isPowerOn}
                      className="p-3 rounded-full transition-all disabled:opacity-20"
                      style={{
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: "rgba(255,255,255,0.02)",
                      }}
                    >
                      <Search className="w-5 h-5" style={{ color: "#fff" }} />
                    </button>
                  </div>
                </div>
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

      {radioModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={() => setRadioModalOpen(false)}
          />
          <div
            className="relative w-full max-w-2xl rounded-lg p-6"
            style={{
              background: "#0e0e0e",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs tracking-[0.3em]" style={{ color: "#777" }}>
                SEARCH RADIO STATIONS
              </div>
              <button
                onClick={() => setRadioModalOpen(false)}
                className="text-xs tracking-[0.2em]"
                style={{ color: "#777" }}
              >
                CLOSE
              </button>
            </div>
            <div className="flex gap-3 mb-4">
              <input
                value={radioQuery}
                onChange={(e) => setRadioQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") searchRadios();
                }}
                placeholder="Search stations..."
                className="flex-1 px-4 py-2 rounded-md bg-black/40 text-sm"
                style={{ border: "1px solid rgba(255,255,255,0.08)", color: "#ddd" }}
              />
              <button
                onClick={searchRadios}
                className="px-4 py-2 rounded-md text-xs tracking-[0.2em]"
                style={{
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#ddd",
                }}
              >
                SEARCH
              </button>
            </div>
            <div className="max-h-[360px] overflow-auto space-y-2">
              {radioLoading ? (
                <div className="text-xs tracking-[0.3em]" style={{ color: "#666" }}>
                  LOADING...
                </div>
              ) : radioResults.length > 0 ? (
                radioResults.map((station) => (
                  <button
                    key={station.id}
                    onClick={() => handleSelectStation(station)}
                    className="w-full text-left px-4 py-3 rounded-md"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <div className="text-sm" style={{ color: "#fff" }}>
                      {station.name}
                    </div>
                    <div className="text-xs" style={{ color: "#888" }}>
                      {station.genre}
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-xs tracking-[0.3em]" style={{ color: "#666" }}>
                  NO RESULTS
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {spotifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={() => setSpotifyModalOpen(false)}
          />
          <div
            className="relative w-full max-w-2xl rounded-lg p-6"
            style={{
              background: "#0e0e0e",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs tracking-[0.3em]" style={{ color: "#777" }}>
                {spotifyView === "search" ? "SEARCH SPOTIFY" : "SPOTIFY DETAILS"}
              </div>
              <button
                onClick={() => setSpotifyModalOpen(false)}
                className="text-xs tracking-[0.2em]"
                style={{ color: "#777" }}
              >
                CLOSE
              </button>
            </div>
            {spotifyView === "search" ? (
              <>
                <div className="flex gap-3 mb-4">
                  <input
                    value={spotifyQuery}
                    onChange={(e) => setSpotifyQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") searchSpotify();
                    }}
                    placeholder="Search tracks, playlists, or albums..."
                    className="flex-1 px-4 py-2 rounded-md bg-black/40 text-sm"
                    style={{ border: "1px solid rgba(255,255,255,0.08)", color: "#ddd" }}
                  />
                  <button
                    onClick={searchSpotify}
                    className="px-4 py-2 rounded-md text-xs tracking-[0.2em]"
                    style={{
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#ddd",
                    }}
                  >
                    SEARCH
                  </button>
                </div>
                {!spotifyConnected && (
                  <div className="text-xs tracking-[0.2em] mb-3" style={{ color: "#777" }}>
                    CONNECT SPOTIFY TO SEARCH
                  </div>
                )}
                <div className="max-h-[360px] overflow-auto space-y-3">
                  {spotifyLoading ? (
                    <div className="text-xs tracking-[0.3em]" style={{ color: "#666" }}>
                      LOADING...
                    </div>
                  ) : (
                    <>
                      {spotifyTracks.length > 0 && (
                        <div>
                          <div className="text-xs tracking-[0.3em] mb-2" style={{ color: "#666" }}>
                            TRACKS
                          </div>
                          <div className="space-y-2">
                            {spotifyTracks.map((track) => (
                              <button
                                key={track.id}
                                onClick={async () => {
                                  const deviceId = await ensureSpotifyDevice();
                                  if (!deviceId) {
                                    alert("Spotify device not ready. Try again in a second.");
                                    return;
                                  }
                                  await fetch("/api/spotify/transfer", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ deviceId, play: false }),
                                  });
                                  await fetch("/api/spotify/play", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      uri: track.uri,
                                      type: "track",
                                      deviceId,
                                    }),
                                  });
                                }}
                                className="w-full text-left px-4 py-3 rounded-md"
                                style={{
                                  background: "rgba(255,255,255,0.03)",
                                  border: "1px solid rgba(255,255,255,0.05)",
                                }}
                              >
                                <div className="text-sm" style={{ color: "#fff" }}>
                                  {track.name}
                                </div>
                                <div className="text-xs" style={{ color: "#888" }}>
                                  {track.artists}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {spotifyPlaylists.length > 0 && (
                        <div>
                          <div className="text-xs tracking-[0.3em] mb-2" style={{ color: "#666" }}>
                            PLAYLISTS
                          </div>
                          <div className="space-y-2">
                            {spotifyPlaylists.map((playlist) => (
                              <button
                                key={playlist.id}
                                onClick={() =>
                                  openPlaylistDetail(playlist.id, playlist.name, playlist.uri)
                                }
                                className="w-full text-left px-4 py-3 rounded-md"
                                style={{
                                  background: "rgba(255,255,255,0.03)",
                                  border: "1px solid rgba(255,255,255,0.05)",
                                }}
                              >
                                <div className="text-sm" style={{ color: "#fff" }}>
                                  {playlist.name}
                                </div>
                                <div className="text-xs" style={{ color: "#888" }}>
                                  by {playlist.owner}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {spotifyAlbums.length > 0 && (
                        <div>
                          <div className="text-xs tracking-[0.3em] mb-2" style={{ color: "#666" }}>
                            ALBUMS
                          </div>
                          <div className="space-y-2">
                            {spotifyAlbums.map((album) => (
                              <button
                                key={album.id}
                                onClick={() => openAlbumDetail(album.id, album.name, album.uri)}
                                className="w-full text-left px-4 py-3 rounded-md"
                                style={{
                                  background: "rgba(255,255,255,0.03)",
                                  border: "1px solid rgba(255,255,255,0.05)",
                                }}
                              >
                                <div className="text-sm" style={{ color: "#fff" }}>
                                  {album.name}
                                </div>
                                <div className="text-xs" style={{ color: "#888" }}>
                                  {album.artists}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {!spotifyTracks.length && !spotifyPlaylists.length && !spotifyAlbums.length && (
                        <div className="text-xs tracking-[0.3em]" style={{ color: "#666" }}>
                          NO RESULTS
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={() => setSpotifyView("search")}
                  className="text-xs tracking-[0.2em]"
                  style={{ color: "#777" }}
                >
                  ← BACK
                </button>
                <div className="text-sm" style={{ color: "#fff" }}>
                  {spotifyDetailTitle}
                </div>
                {spotifyDetailUri && (
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        const deviceId = await ensureSpotifyDevice();
                        if (!deviceId) {
                          alert("Spotify device not ready. Try again in a second.");
                          return;
                        }
                        await fetch("/api/spotify/transfer", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ deviceId, play: false }),
                        });
                        await fetch("/api/spotify/play", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            uri: spotifyDetailUri,
                            type: "context",
                            deviceId,
                          }),
                        });
                      }}
                      className="px-3 py-2 rounded-md text-xs tracking-[0.2em]"
                      style={{
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "#ddd",
                      }}
                    >
                      PLAY ALL
                    </button>
                    <button
                      onClick={async () => {
                        const deviceId = await ensureSpotifyDevice();
                        if (!deviceId) {
                          alert("Spotify device not ready. Try again in a second.");
                          return;
                        }
                        fetch("/api/spotify/queue", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ uri: spotifyDetailUri, deviceId }),
                        });
                      }}
                      className="px-3 py-2 rounded-md text-xs tracking-[0.2em]"
                      style={{
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "#ddd",
                      }}
                    >
                      QUEUE ALL
                    </button>
                  </div>
                )}
                <div className="max-h-[360px] overflow-auto space-y-2">
                  {spotifyDetailTracks.map((track) => (
                    <button
                      key={track.id}
                      onClick={async () => {
                        const deviceId = await ensureSpotifyDevice();
                        if (!deviceId) {
                          alert("Spotify device not ready. Try again in a second.");
                          return;
                        }
                        await fetch("/api/spotify/transfer", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ deviceId, play: false }),
                        });
                        await fetch("/api/spotify/play", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            uri: track.uri,
                            type: "track",
                            deviceId,
                          }),
                        });
                      }}
                      className="w-full text-left px-4 py-3 rounded-md"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.05)",
                      }}
                    >
                      <div className="text-sm" style={{ color: "#fff" }}>
                        {track.name}
                      </div>
                      <div className="text-xs" style={{ color: "#888" }}>
                        {track.artists}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            const deviceId = await ensureSpotifyDevice();
                            if (!deviceId) {
                              alert("Spotify device not ready. Try again in a second.");
                              return;
                            }
                            fetch("/api/spotify/queue", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ uri: track.uri, deviceId }),
                            });
                          }}
                          className="px-2 py-1 rounded text-[10px] tracking-[0.2em]"
                          style={{ border: "1px solid rgba(255,255,255,0.08)", color: "#aaa" }}
                        >
                          QUEUE
                        </button>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
