import type { PlayerSource } from "@/lib/player/types";

export type UserSettings = {
  skinId: string;
  lastSource: PlayerSource;
  volume: number;
  favorites: string[];
  lastStationId?: string;
};

export interface StorageDriver {
  getSettings: () => UserSettings;
  saveSettings: (settings: Partial<UserSettings>) => void;
  toggleFavorite: (stationId: string) => string[];
}

const DEFAULT_SETTINGS: UserSettings = {
  skinId: "receiver-1978",
  lastSource: "radio",
  volume: 0.8,
  favorites: [],
};

const STORAGE_KEY = "vintage.player.settings";

export const createLocalStorageDriver = (): StorageDriver => {
  const read = (): UserSettings => {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_SETTINGS;
      return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<UserSettings>) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  };

  const write = (settings: UserSettings) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  };

  return {
    getSettings: read,
    saveSettings: (patch) => {
      const next = { ...read(), ...patch };
      write(next);
    },
    toggleFavorite: (stationId) => {
      const current = read();
      const favorites = current.favorites.includes(stationId)
        ? current.favorites.filter((id) => id !== stationId)
        : [...current.favorites, stationId];
      const next = { ...current, favorites };
      write(next);
      return favorites;
    },
  };
};

export const storage = createLocalStorageDriver();
