import type { SkinManifest } from "@/components/skins/types";
import { Receiver1978Skin } from "@/components/skins/skins/receiver-1978/Receiver1978Skin";
import { manifest as receiver1978 } from "@/components/skins/skins/receiver-1978/manifest";

export type SkinComponent = typeof Receiver1978Skin;

export const skins: Array<{ manifest: SkinManifest; Component: SkinComponent }> = [
  { manifest: receiver1978, Component: Receiver1978Skin },
];

export const getSkinById = (id: string) =>
  skins.find((skin) => skin.manifest.id === id) ?? skins[0];
