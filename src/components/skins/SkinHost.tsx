"use client";

import { useEffect, useMemo, useState } from "react";
import { getPlayerHub } from "@/lib/player/PlayerHub";
import type { PlayerState, PlayerSource } from "@/lib/player/types";
import { RadioProvider } from "@/lib/player/providers/radio";
import { SpotifyProvider } from "@/lib/player/providers/spotify";
import { getSkinById } from "@/components/skins/registry";
import { storage } from "@/lib/storage";

const defaultState: PlayerState = {
  source: "radio",
  activeSource: "radio",
  status: "idle",
  volume: 0.8,
};

type SpotifyStatus = {
  connected: boolean;
};

const fetchSpotifyStatus = async (): Promise<SpotifyStatus> => {
  try {
    const res = await fetch("/api/auth/spotify/status", { cache: "no-store" });
    if (!res.ok) return { connected: false };
    return (await res.json()) as SpotifyStatus;
  } catch {
    return { connected: false };
  }
};

export const SkinHost = () => {
  const hub = useMemo(() => getPlayerHub(), []);
  const [state, setState] = useState<PlayerState>(defaultState);
  const [skinId, setSkinId] = useState("receiver-1978");
  const [spotifyStatus, setSpotifyStatus] = useState<SpotifyStatus>({
    connected: false,
  });
  const skin = getSkinById(skinId);

  useEffect(() => {
    const settings = storage.getSettings();
    setSkinId(settings.skinId);
    const radio = new RadioProvider();
    const spotify = new SpotifyProvider();
    hub.register(radio);
    hub.register(spotify);
    hub.setActive(settings.lastSource);
    hub.setVolume(settings.volume);
    const unsubscribe = hub.onStateChange((next) => {
      setState(next);
      storage.saveSettings({ lastSource: next.activeSource, volume: next.volume });
    });

    fetchSpotifyStatus().then(setSpotifyStatus);

    return () => {
      unsubscribe();
    };
  }, [hub]);

  const handlePlayPause = async () => {
    if (state.status === "playing") {
      await hub.pause();
    } else {
      await hub.play();
    }
  };

  const handleSourceChange = async (source: PlayerSource) => {
    await hub.setActive(source);
    if (source === "spotify") {
      const status = await fetchSpotifyStatus();
      setSpotifyStatus(status);
    }
  };

  const handleVolumeChange = (volume: number) => {
    hub.setVolume(volume);
  };

  const handleConnectSpotify = () => {
    window.location.href = "/api/auth/spotify/login";
  };

  const handleDisconnectSpotify = async () => {
    await fetch("/api/auth/spotify/logout", { method: "POST" });
    const status = await fetchSpotifyStatus();
    setSpotifyStatus(status);
  };

  return (
    <div className="skin-host">
      <div className="skin-meta">
        <div>
          <div className="skin-title">{skin.manifest.name}</div>
          <div className="skin-sub">Vintage Audio System</div>
        </div>
        <div className="spotify-status">
          <span>{spotifyStatus.connected ? "Spotify Connected" : "Spotify Off"}</span>
          {spotifyStatus.connected ? (
            <button onClick={handleDisconnectSpotify}>Disconnect</button>
          ) : (
            <button onClick={handleConnectSpotify}>Connect Spotify</button>
          )}
        </div>
      </div>
      <skin.Component
        state={state}
        onPlayPause={handlePlayPause}
        onSourceChange={handleSourceChange}
        onVolumeChange={handleVolumeChange}
      />
    </div>
  );
};
