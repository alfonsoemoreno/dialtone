import type { SkinManifest } from "@/components/skins/types";

export const manifest: SkinManifest = {
  id: "pioneer-classic",
  name: "Pioneer ED-110 Classic",
  preview: "/skins/pioneer-ed110/preview.svg",
  assets: [],
  mapping: {
    playPause: "toggle",
    volume: "setVolume",
    sourceSelector: ["radio", "spotify"],
  },
};
