import type { IProvider, PlayerState, PlayerSource, ProviderState } from "@/lib/player/types";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

type HubListener = (state: PlayerState) => void;

export class PlayerHub {
  private providers = new Map<PlayerSource, IProvider>();
  private activeSource: PlayerSource = "radio";
  private listeners = new Set<HubListener>();
  private lastKnownState: PlayerState = {
    source: "radio",
    activeSource: "radio",
    status: "idle",
    volume: 0.8,
  };

  register(provider: IProvider) {
    this.providers.set(provider.id, provider);
    provider.onStateChange((state) => {
      if (provider.id !== this.activeSource) return;
      this.updateState({ ...state, activeSource: this.activeSource });
    });
  }

  getProvider(source: PlayerSource) {
    return this.providers.get(source);
  }

  getState(): PlayerState {
    return this.lastKnownState;
  }

  onStateChange(listener: HubListener) {
    this.listeners.add(listener);
    listener(this.lastKnownState);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async setActive(source: PlayerSource) {
    if (this.activeSource === source) return;
    const previousProvider = this.providers.get(this.activeSource);
    if (previousProvider) {
      await previousProvider.pause();
    }
    this.activeSource = source;
    const nextProvider = this.providers.get(source);
    if (nextProvider) {
      const nextState = nextProvider.getState();
      this.updateState({ ...nextState, activeSource: source });
    }
  }

  async play() {
    const provider = this.providers.get(this.activeSource);
    if (!provider) return;
    await provider.play();
  }

  async pause() {
    const provider = this.providers.get(this.activeSource);
    if (!provider) return;
    await provider.pause();
  }

  async stop() {
    const provider = this.providers.get(this.activeSource);
    if (!provider) return;
    await provider.stop();
  }

  async setVolume(volume: number) {
    const provider = this.providers.get(this.activeSource);
    if (!provider) return;
    const safeVolume = clamp(volume, 0, 1);
    await provider.setVolume(safeVolume);
  }

  private updateState(state: PlayerState | ProviderState) {
    const normalized = {
      ...state,
      activeSource: "activeSource" in state ? state.activeSource : this.activeSource,
    } as PlayerState;
    this.lastKnownState = normalized;
    this.listeners.forEach((listener) => listener(this.lastKnownState));
  }
}

let singleton: PlayerHub | null = null;

export const getPlayerHub = () => {
  if (!singleton) {
    singleton = new PlayerHub();
  }
  return singleton;
};
