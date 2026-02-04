export type PlayerSource = "radio" | "spotify";

export type PlaybackStatus = "idle" | "playing" | "paused" | "stopped" | "error";

export type ProviderCapabilities = {
  canPlay: boolean;
  canPause: boolean;
  canStop: boolean;
  canSetVolume: boolean;
  canSelectSource: boolean;
};

export type ProviderState = {
  source: PlayerSource;
  status: PlaybackStatus;
  volume: number;
  title?: string;
  artist?: string;
  stationName?: string;
  error?: string;
};

export type PlayerState = ProviderState & {
  activeSource: PlayerSource;
};

export type ProviderStateListener = (state: ProviderState) => void;

export interface IProvider {
  id: PlayerSource;
  name: string;
  capabilities: ProviderCapabilities;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  getState: () => ProviderState;
  onStateChange: (listener: ProviderStateListener) => () => void;
}
