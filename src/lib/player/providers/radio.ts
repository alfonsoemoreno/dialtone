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
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private bassFilter: BiquadFilterNode | null = null;
  private trebleFilter: BiquadFilterNode | null = null;
  private meterRaf: number | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.audio = createAudio();
      this.bindEvents();
    }
  }

  getAnalyser() {
    return this.analyser;
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
    await this.ensureAnalyser();
    this.audio.volume = this.state.volume;
    await this.audio.play();
  }

  async pause() {
    this.audio?.pause();
    this.stopMeter();
  }

  async stop() {
    if (!this.audio) return;
    this.audio.pause();
    this.audio.currentTime = 0;
    this.stopMeter();
    this.setState({ status: "stopped" });
  }

  async setVolume(volume: number) {
    this.state.volume = volume;
    if (this.audio) {
      this.audio.volume = volume;
    }
    this.setState({ volume });
  }

  setTone(bass: number, treble: number) {
    const mapGain = (value: number) => (value - 50) / 50 * 12; // -12dB to +12dB
    if (this.bassFilter) {
      this.bassFilter.gain.value = mapGain(bass);
    }
    if (this.trebleFilter) {
      this.trebleFilter.gain.value = mapGain(treble);
    }
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

  private async ensureAnalyser() {
    if (!this.audio) return;
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    if (!this.analyser) {
      const source = this.audioContext.createMediaElementSource(this.audio);
      this.bassFilter = this.audioContext.createBiquadFilter();
      this.bassFilter.type = "lowshelf";
      this.bassFilter.frequency.value = 120;
      this.trebleFilter = this.audioContext.createBiquadFilter();
      this.trebleFilter.type = "highshelf";
      this.trebleFilter.frequency.value = 3000;

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;

      source.connect(this.bassFilter);
      this.bassFilter.connect(this.trebleFilter);
      this.trebleFilter.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
    }
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
    this.startMeter();
  }

  private startMeter() {
    if (!this.analyser) return;
    if (this.meterRaf) return;
    const data = new Uint8Array(this.analyser.fftSize);
    const tick = () => {
      if (!this.analyser) return;
      this.analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i += 1) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      const level = Math.min(1, Math.max(0, rms * 2.5));
      this.setState({ vuLevel: level });
      this.meterRaf = requestAnimationFrame(tick);
    };
    this.meterRaf = requestAnimationFrame(tick);
  }

  private stopMeter() {
    if (this.meterRaf) {
      cancelAnimationFrame(this.meterRaf);
      this.meterRaf = null;
    }
    this.setState({ vuLevel: 0 });
  }
}
