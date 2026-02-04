import type { PlayerSource } from "@/lib/player/types";

export type SkinControlMapping = {
  playPause: "play" | "pause" | "toggle";
  volume: "setVolume";
  sourceSelector: PlayerSource[];
};

export type SkinManifest = {
  id: string;
  name: string;
  preview: string;
  assets: string[];
  mapping: SkinControlMapping;
};
