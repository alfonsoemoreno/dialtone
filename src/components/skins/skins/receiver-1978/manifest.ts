import type { SkinManifest } from "@/components/skins/types";

export const manifest: SkinManifest = {
  id: "receiver-1978",
  name: "Receiver 1978",
  preview: "/skins/receiver-1978/preview.svg",
  assets: ["/skins/receiver-1978/preview.svg"],
  mapping: {
    playPause: "toggle",
    volume: "setVolume",
    sourceSelector: ["radio", "spotify"],
  },
};
