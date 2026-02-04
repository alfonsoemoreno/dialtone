"use client";

import { useEffect, useMemo, useState } from "react";
import radios from "@/data/radios.json";
import { usePlayerHub } from "@/lib/player/usePlayerHub";
import type { PlayerState } from "@/lib/player/types";
import { RadioProvider } from "@/lib/player/providers/radio";
import { storage } from "@/lib/storage";
import type { RadioBrowserStation } from "@/lib/radioBrowser";
import { mapRadioBrowserStation } from "@/lib/radioBrowser";

type Station = {
  id: string;
  name: string;
  streamUrl: string;
  country: string;
  genre: string;
  favicon?: string;
};

const defaultState: PlayerState = {
  source: "radio",
  activeSource: "radio",
  status: "idle",
  volume: 0.8,
};

export const RadioCatalog = () => {
  const hub = usePlayerHub();
  const [query, setQuery] = useState("");
  const [state, setState] = useState<PlayerState>(defaultState);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [source, setSource] = useState<"curated" | "radioBrowser">("curated");
  const [results, setResults] = useState<Station[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [country, setCountry] = useState("Chile");

  useEffect(() => {
    const settings = storage.getSettings();
    setFavorites(settings.favorites);
    const lastStation = (radios as Station[]).find(
      (station) => station.id === settings.lastStationId
    );
    if (lastStation) {
      const provider = hub.getProvider("radio") as RadioProvider | undefined;
      provider?.setStation(lastStation.name, lastStation.streamUrl);
    }
    const unsubscribe = hub.onStateChange((next) => setState(next));
    return () => unsubscribe();
  }, [hub]);

  const filtered = useMemo(() => {
    if (source === "radioBrowser") return results;
    const term = query.trim().toLowerCase();
    if (!term) return radios as Station[];
    return (radios as Station[]).filter(
      (station) =>
        station.name.toLowerCase().includes(term) ||
        station.genre.toLowerCase().includes(term)
    );
  }, [query, results, source]);

  useEffect(() => {
    if (source !== "radioBrowser") return;
    const controller = new AbortController();
    const run = async () => {
      setIsSearching(true);
      try {
        const params = new URLSearchParams({
          q: query.trim(),
          country: country.trim(),
          limit: "20",
        });
        const res = await fetch(`/api/radios/search?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as { stations: RadioBrowserStation[] };
        const mapped = (data.stations ?? []).map(mapRadioBrowserStation);
        setResults(mapped);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeout = setTimeout(run, 300);
    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [query, country, source]);

  const handleSelect = async (station: Station) => {
    const provider = hub.getProvider("radio") as RadioProvider | undefined;
    provider?.setStation(station.name, station.streamUrl);
    storage.saveSettings({ lastStationId: station.id });
    if (state.activeSource === "radio") {
      await hub.play();
    }
  };

  const handleFavorite = (stationId: string) => {
    const next = storage.toggleFavorite(stationId);
    setFavorites(next);
  };

  return (
    <div className="radio-catalog">
      <div className="radio-source-toggle">
        <button
          className={source === "curated" ? "active" : ""}
          onClick={() => setSource("curated")}
        >
          Curated
        </button>
        <button
          className={source === "radioBrowser" ? "active" : ""}
          onClick={() => setSource("radioBrowser")}
        >
          Radio Browser
        </button>
      </div>
      <div className="radio-search">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or genre"
        />
      </div>
      {source === "radioBrowser" && (
        <div className="radio-filters">
          <input
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            placeholder="Country (e.g. Chile)"
          />
          <span className="radio-status">
            {isSearching ? "Searching..." : `${filtered.length} stations`}
          </span>
        </div>
      )}
      <div className="radio-list">
        {filtered.map((station) => (
          <div key={station.id} className="radio-item">
            <div>
              <div className="radio-name">{station.name}</div>
              <div className="radio-meta">
                {station.genre} · {station.country}
              </div>
            </div>
            <div className="radio-actions">
              <button onClick={() => handleSelect(station)}>Tune</button>
              <button
                className={favorites.includes(station.id) ? "active" : ""}
                onClick={() => handleFavorite(station.id)}
              >
                {favorites.includes(station.id) ? "★" : "☆"}
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="radio-note">
        If a stream fails, replace `streamUrl` entries in `src/data/radios.json`.
      </div>
    </div>
  );
};
