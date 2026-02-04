import type {
  IProvider,
  ProviderState,
  ProviderStateListener,
} from "@/lib/player/types";

const createAudio = () => {
  const audio = new Audio();
  audio.preload = "none";
  audio.crossOrigin = "anonymous";
  return audio;
};

export class RadioProvider implements IProvider {
  id = "radio" as const;
  name = "Radio";
  capabilities = {
    canPlay: true,
    canPause: true,
    canStop: true,
    canSetVolume: true,
    canSelectSource: true,
  };

  private audio: HTMLAudioElement | null = null;
  private state: ProviderState = {
    source: "radio",
    status: "idle",
    volume: 0.8,
  };
  private listeners = new Set<ProviderStateListener>();
  private stationName?: string;
  private stationUrl?: string;

  constructor() {
    if (typeof window !== "undefined") {
      this.audio = createAudio();
      this.bindEvents();
    }
  }

  private bindEvents() {
    if (!this.audio) return;
    this.audio.addEventListener("playing", () =>
      this.setState({ status: "playing" })
    );
    this.audio.addEventListener("pause", () =>
      this.setState({ status: "paused" })
    );
    this.audio.addEventListener("ended", () =>
      this.setState({ status: "stopped" })
    );
    this.audio.addEventListener("error", () =>
      this.setState({ status: "error", error: "Stream error" })
    );
  }

  setStation(name: string, url: string) {
    this.stationName = name;
    this.stationUrl = url;
    this.setState({ stationName: name });
    if (this.audio) {
      this.audio.src = url;
    }
  }

  async play() {
    if (!this.audio) return;
    if (!this.stationUrl) {
      this.setState({ status: "error", error: "No station selected" });
      return;
    }
    this.audio.volume = this.state.volume;
    await this.audio.play();
  }

  async pause() {
    this.audio?.pause();
  }

  async stop() {
    if (!this.audio) return;
    this.audio.pause();
    this.audio.currentTime = 0;
    this.setState({ status: "stopped" });
  }

  async setVolume(volume: number) {
    this.state.volume = volume;
    if (this.audio) {
      this.audio.volume = volume;
    }
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
    this.state = {
      ...this.state,
      ...patch,
      source: "radio",
      stationName: this.stationName ?? this.state.stationName,
    };
    this.listeners.forEach((listener) => listener(this.state));
  }
}
