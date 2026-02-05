import type {
  IProvider,
  ProviderState,
  ProviderStateListener,
} from "@/lib/player/types";
import Meyda from "meyda";

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
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private bassFilter: BiquadFilterNode | null = null;
  private trebleFilter: BiquadFilterNode | null = null;
  private meydaAnalyzer: ReturnType<typeof Meyda.createMeydaAnalyzer> | null = null;
  private meydaActive = false;
  private meterState = { avgDb: null as number | null, current: 0 };
  private toneState = { bass: 50, treble: 50 };

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
    this.audio.addEventListener("playing", () => {
      this.setState({ status: "playing" });
      this.startMeter();
    });
    this.audio.addEventListener("pause", () => {
      this.setState({ status: "paused" });
      this.stopMeter();
    });
    this.audio.addEventListener("ended", () => {
      this.setState({ status: "stopped" });
      this.stopMeter();
    });
    this.audio.addEventListener("error", () => {
      this.setState({ status: "error", error: "Stream error" });
      this.stopMeter();
    });
    this.audio.addEventListener("stalled", () => this.stopMeter());
    this.audio.addEventListener("waiting", () => this.stopMeter());
    this.audio.addEventListener("suspend", () => this.stopMeter());
    this.audio.addEventListener("emptied", () => this.stopMeter());
    this.audio.addEventListener("canplay", () => {
      if (!this.audio?.paused) this.startMeter();
    });
  }

  setStation(name: string, url: string) {
    const shouldRebuild = this.stationUrl !== url;
    this.stationName = name;
    this.stationUrl = url;
    this.setState({ stationName: name });
    if (shouldRebuild) {
      this.rebuildAudio();
    } else if (!this.audio && typeof window !== "undefined") {
      this.audio = createAudio();
      this.bindEvents();
    }
    if (this.audio) {
      this.audio.src = url;
      this.audio.load();
      this.stopMeter();
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
    if (this.gainNode) {
      this.gainNode.gain.value = volume;
    } else if (this.audio) {
      this.audio.volume = volume;
    }
    this.setState({ volume });
  }

  setTone(bass: number, treble: number) {
    this.toneState = { bass, treble };
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

  private rebuildAudio() {
    this.stopMeter();
    if (this.audio) {
      this.audio.pause();
      this.audio.src = "";
      this.audio.load();
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => undefined);
    }
    this.audioContext = null;
    this.sourceNode = null;
    this.analyser = null;
    this.gainNode = null;
    this.bassFilter = null;
    this.trebleFilter = null;
    this.meydaAnalyzer = null;
    this.meydaActive = false;
    this.meterState = { avgDb: null, current: 0 };
    if (typeof window !== "undefined") {
      this.audio = createAudio();
      this.audio.volume = this.state.volume;
      this.bindEvents();
    } else {
      this.audio = null;
    }
  }

  private async ensureAnalyser() {
    if (!this.audio) return;
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    if (!this.analyser || !this.sourceNode) {
      const source = this.audioContext.createMediaElementSource(this.audio);
      this.sourceNode = source;
      this.bassFilter = this.audioContext.createBiquadFilter();
      this.bassFilter.type = "lowshelf";
      this.bassFilter.frequency.value = 120;
      this.trebleFilter = this.audioContext.createBiquadFilter();
      this.trebleFilter.type = "highshelf";
      this.trebleFilter.frequency.value = 3000;

      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.state.volume;

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;

      source.connect(this.bassFilter);
      this.bassFilter.connect(this.trebleFilter);
      this.trebleFilter.connect(this.gainNode);
      this.gainNode.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      this.applyTone();
      if (this.audio) {
        this.audio.volume = 1;
      }

      this.ensureMeyda(this.trebleFilter);
    }
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
    this.startMeter();
  }

  private startMeter() {
    if (!this.meydaAnalyzer || this.meydaActive) return;
    this.meydaActive = true;
    this.meydaAnalyzer.start();
  }

  private stopMeter() {
    this.meydaActive = false;
    this.meydaAnalyzer?.stop();
    this.meterState = { avgDb: null, current: 0 };
    this.setState({ vuLevel: 0 });
  }

  private ensureMeyda(source: AudioNode) {
    if (!this.audioContext || this.meydaAnalyzer) return;
    this.meydaAnalyzer = Meyda.createMeydaAnalyzer({
      audioContext: this.audioContext,
      source,
      bufferSize: 512,
      featureExtractors: ["rms"],
      callback: (features?: { rms?: number }) => {
        if (!this.meydaActive) return;
        const rms = Number.isFinite(features?.rms) ? (features?.rms ?? 0) : 0;
        const db = rms > 0 ? 20 * Math.log10(rms) : -100;

        let { avgDb, current } = this.meterState;
        if (avgDb === null) {
          if (db < -80) {
            this.setState({ vuLevel: 0 });
            return;
          }
          avgDb = db;
        } else {
          const coeff = db > avgDb ? 0.08 : 0.02;
          avgDb += (db - avgDb) * coeff;
        }

        const rangeDb = 22;
        const minDb = avgDb - rangeDb / 2;
        const maxDb = avgDb + rangeDb / 2;
        const linear = Math.min(1, Math.max(0, (db - minDb) / (maxDb - minDb)));
        const normalized = Math.pow(linear, 0.6);
        const attack = 0.7;
        const release = 0.08;
        if (normalized > current) {
          current += (normalized - current) * attack;
        } else {
          current += (normalized - current) * release;
        }
        this.meterState = { avgDb, current };
        this.setState({ vuLevel: current });
      },
    });
  }

  private applyTone() {
    if (!this.bassFilter || !this.trebleFilter) return;
    const mapGain = (value: number) => (value - 50) / 50 * 12;
    this.bassFilter.gain.value = mapGain(this.toneState.bass);
    this.trebleFilter.gain.value = mapGain(this.toneState.treble);
  }
}
