export {};

declare global {
  interface Window {
    Spotify: typeof Spotify;
    onSpotifyWebPlaybackSDKReady?: () => void;
  }

  namespace Spotify {
    interface PlaybackState {
      paused: boolean;
      track_window: {
        current_track: {
          name: string;
          artists: { name: string }[];
        };
      };
    }

    interface PlayerInit {
      name: string;
      getOAuthToken: (callback: (token: string) => void) => void;
      volume?: number;
    }

    interface Player {
      connect: () => Promise<boolean>;
      disconnect: () => void;
      resume: () => Promise<void>;
      pause: () => Promise<void>;
      setVolume: (volume: number) => Promise<void>;
      addListener: (
        event: "ready" | "not_ready" | "player_state_changed",
        cb: (state: any) => void
      ) => boolean;
    }

    const Player: new (init: PlayerInit) => Player;
  }
}
