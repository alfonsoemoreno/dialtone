"use client";

import { useEffect, useMemo, useState } from "react";
import { usePlayerHub } from "@/lib/player/usePlayerHub";
import { SpotifyProvider } from "@/lib/player/providers/spotify";

type TrackResult = {
  id: string;
  name: string;
  uri: string;
  artists: string;
  album: string;
  image: string | null;
};

type PlaylistResult = {
  id: string;
  name: string;
  uri: string;
  owner: string;
  image: string | null;
};

type AlbumResult = {
  id: string;
  name: string;
  uri: string;
  artists: string;
  image: string | null;
};

type TrackLite = {
  id: string;
  name: string;
  uri: string;
  artists: string;
};

export const SpotifyBrowser = () => {
  const hub = usePlayerHub();
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<TrackResult[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistResult[]>([]);
  const [albums, setAlbums] = useState<AlbumResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<{ type: "album" | "playlist"; id: string } | null>(
    null
  );
  const [expandedTracks, setExpandedTracks] = useState<TrackLite[]>([]);

  useEffect(() => {
    const provider = hub.getProvider("spotify") as SpotifyProvider | undefined;
    if (provider) {
      setDeviceId(provider.getDeviceId());
    }
    const interval = setInterval(() => {
      const next = provider?.getDeviceId() ?? null;
      setDeviceId(next);
    }, 1500);
    return () => clearInterval(interval);
  }, [hub]);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ q: query.trim(), limit: "10" });
      const res = await fetch(`/api/spotify/search?${params.toString()}`);
      const data = (await res.json()) as {
        tracks: TrackResult[];
        playlists: PlaylistResult[];
        albums: AlbumResult[];
      };
      setTracks(data.tracks ?? []);
      setPlaylists(data.playlists ?? []);
      setAlbums(data.albums ?? []);
    } catch {
      setTracks([]);
      setPlaylists([]);
      setAlbums([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = async (uri: string, type: "track" | "context") => {
    await fetch("/api/spotify/play", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uri, type, deviceId }),
    });
  };

  const handleQueue = async (uri: string) => {
    await fetch("/api/spotify/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uri, deviceId }),
    });
  };

  const handleNext = async () => {
    await fetch("/api/spotify/next", { method: "POST" });
  };

  const handlePrev = async () => {
    await fetch("/api/spotify/previous", { method: "POST" });
  };

  const handleExpand = async (type: "album" | "playlist", id: string) => {
    if (expanded?.id === id) {
      setExpanded(null);
      setExpandedTracks([]);
      return;
    }

    setExpanded({ type, id });
    try {
      const res = await fetch(`/api/spotify/${type}/${id}`);
      const data = (await res.json()) as { tracks: TrackLite[] };
      setExpandedTracks(data.tracks ?? []);
    } catch {
      setExpandedTracks([]);
    }
  };

  const hasResults = tracks.length > 0 || playlists.length > 0 || albums.length > 0;

  return (
    <div className="spotify-browser">
      <div className="spotify-header">
        <div>
          <div className="spotify-title">Spotify Control</div>
          <div className="spotify-sub">Search tracks, albums, and playlists.</div>
        </div>
        <div className="spotify-controls">
          <button onClick={handlePrev}>Prev</button>
          <button onClick={handleNext}>Next</button>
        </div>
      </div>
      <div className="spotify-search">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search tracks, albums, or playlists"
        />
        <button onClick={search}>{loading ? "..." : "Search"}</button>
      </div>
      {hasResults ? (
        <div className="spotify-results">
          <div className="spotify-section">
            <div className="spotify-section-title">Tracks</div>
            {tracks.map((track) => (
              <div key={track.id} className="spotify-item">
                {track.image && <img src={track.image} alt={track.name} />}
                <div>
                  <div className="spotify-name">{track.name}</div>
                  <div className="spotify-meta">{track.artists}</div>
                </div>
                <div className="spotify-actions">
                  <button onClick={() => handlePlay(track.uri, "track")}>Play</button>
                  <button onClick={() => handleQueue(track.uri)}>Queue</button>
                </div>
              </div>
            ))}
          </div>
          <div className="spotify-section">
            <div className="spotify-section-title">Playlists</div>
            {playlists.map((playlist) => (
              <div key={playlist.id} className="spotify-item">
                {playlist.image && <img src={playlist.image} alt={playlist.name} />}
                <div>
                  <div className="spotify-name">{playlist.name}</div>
                  <div className="spotify-meta">by {playlist.owner}</div>
                </div>
                <div className="spotify-actions">
                  <button onClick={() => handlePlay(playlist.uri, "context")}>
                    Play
                  </button>
                  <button onClick={() => handleExpand("playlist", playlist.id)}>
                    {expanded?.id === playlist.id ? "Hide" : "Tracks"}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="spotify-section">
            <div className="spotify-section-title">Albums</div>
            {albums.map((album) => (
              <div key={album.id} className="spotify-item">
                {album.image && <img src={album.image} alt={album.name} />}
                <div>
                  <div className="spotify-name">{album.name}</div>
                  <div className="spotify-meta">{album.artists}</div>
                </div>
                <div className="spotify-actions">
                  <button onClick={() => handlePlay(album.uri, "context")}>Play</button>
                  <button onClick={() => handleExpand("album", album.id)}>
                    {expanded?.id === album.id ? "Hide" : "Tracks"}
                  </button>
                </div>
              </div>
            ))}
          </div>
          {expanded && expandedTracks.length > 0 && (
            <div className="spotify-section">
              <div className="spotify-section-title">Tracks in selection</div>
              {expandedTracks.map((track) => (
                <div key={track.id} className="spotify-item spotify-track">
                  <div>
                    <div className="spotify-name">{track.name}</div>
                    <div className="spotify-meta">{track.artists}</div>
                  </div>
                  <div className="spotify-actions">
                    <button onClick={() => handlePlay(track.uri, "track")}>Play</button>
                    <button onClick={() => handleQueue(track.uri)}>Queue</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="spotify-empty">Search Spotify to load tracks.</div>
      )}
      <div className="spotify-footer">
        Device: {deviceId ? "Web Playback active" : "Waiting for device"}
      </div>
    </div>
  );
};
