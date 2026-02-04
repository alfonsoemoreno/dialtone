import type {
  IProvider,
  ProviderState,
  ProviderStateListener,
} from "@/lib/player/types";

const SDK_URL = "https://sdk.scdn.co/spotify-player.js";

type DeviceState = {
  paused: boolean;
  track_window: { current_track: { name: string; artists: { name: string }[] } };
};

const loadSpotifySdk = () =>
  new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") return reject();
    if ((window as Window).Spotify) return resolve();
    const existing = document.querySelector(`script[src="${SDK_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Spotify SDK failed to load"));
    document.body.appendChild(script);
  });

export class SpotifyProvider implements IProvider {
  id = "spotify" as const;
  name = "Spotify";
  capabilities = {
    canPlay: true,
    canPause: true,
    canStop: true,
    canSetVolume: true,
    canSelectSource: true,
  };

  private player: Spotify.Player | null = null;
  private deviceId: string | null = null;
  private state: ProviderState = {
    source: "spotify",
    status: "idle",
    volume: 0.8,
  };
  private listeners = new Set<ProviderStateListener>();
  private accessToken: string | null = null;

  async ensurePlayer() {
    if (this.player) return;
    await loadSpotifySdk();
    this.accessToken = await this.fetchAccessToken();

    if (!this.accessToken) {
      this.setState({ status: "error", error: "Spotify not connected" });
      return;
    }

    this.player = new window.Spotify.Player({
      name: "Vintage Receiver",
      getOAuthToken: (cb) => {
        if (this.accessToken) cb(this.accessToken);
      },
      volume: this.state.volume,
    });

    this.player.addListener("ready", ({ device_id }) => {
      this.deviceId = device_id;
      this.setState({ status: "paused" });
      // TODO: Transfer playback to this device using Spotify Web API.
    });

    this.player.addListener("player_state_changed", (state: DeviceState | null) => {
      if (!state) return;
      const track = state.track_window.current_track;
      this.setState({
        status: state.paused ? "paused" : "playing",
        title: track?.name,
        artist: track?.artists?.map((a) => a.name).join(", "),
      });
    });

    this.player.addListener("not_ready", () => {
      this.setState({ status: "error", error: "Spotify device offline" });
    });

    const connected = await this.player.connect();
    if (!connected) {
      this.setState({ status: "error", error: "Spotify connect failed" });
    }
  }

  async play() {
    await this.ensurePlayer();
    await this.player?.resume();
  }

  async pause() {
    await this.player?.pause();
  }

  async stop() {
    await this.player?.pause();
    this.setState({ status: "stopped" });
  }

  async setVolume(volume: number) {
    this.state.volume = volume;
    await this.player?.setVolume(volume);
    this.setState({ volume });
  }

  getState() {
    return this.state;
  }

  onStateChange(listener: ProviderStateListener) {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private setState(patch: Partial<ProviderState>) {
    this.state = { ...this.state, ...patch, source: "spotify" };
    this.listeners.forEach((listener) => listener(this.state));
  }

  private async fetchAccessToken(): Promise<string | null> {
    try {
      const res = await fetch("/api/auth/spotify/token", { cache: "no-store" });
      if (!res.ok) return null;
      const data = (await res.json()) as { accessToken?: string };
      return data.accessToken ?? null;
    } catch {
      return null;
    }
  }
}
