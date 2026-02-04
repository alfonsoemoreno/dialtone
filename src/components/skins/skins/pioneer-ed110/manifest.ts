import type { SkinManifest } from "@/components/skins/types";

export const manifest: SkinManifest = {
  id: "pioneer-ed110",
  name: "Pioneer ED-110",
  preview: "/skins/pioneer-ed110/preview.svg",
  assets: ["/skins/pioneer-ed110/preview.svg"],
  mapping: {
    playPause: "toggle",
    volume: "setVolume",
    sourceSelector: ["radio", "spotify"],
  },
};
