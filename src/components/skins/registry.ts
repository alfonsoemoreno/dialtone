import type { SkinManifest } from "@/components/skins/types";
import { Receiver1978Skin } from "@/components/skins/skins/receiver-1978/Receiver1978Skin";
import { manifest as receiver1978 } from "@/components/skins/skins/receiver-1978/manifest";
import { PioneerED110Skin } from "@/components/skins/skins/pioneer-ed110/PioneerED110Skin";
import { manifest as pioneerED110 } from "@/components/skins/skins/pioneer-ed110/manifest";
import { PioneerClassicSkin } from "@/components/skins/skins/pioneer-classic/PioneerClassicSkin";
import { manifest as pioneerClassic } from "@/components/skins/skins/pioneer-classic/manifest";

export type SkinComponent = typeof Receiver1978Skin;

export const skins: Array<{ manifest: SkinManifest; Component: SkinComponent }> = [
  { manifest: receiver1978, Component: Receiver1978Skin },
  { manifest: pioneerED110, Component: PioneerED110Skin },
  { manifest: pioneerClassic, Component: PioneerClassicSkin },
];

export const getSkinById = (id: string) =>
  skins.find((skin) => skin.manifest.id === id) ?? skins[0];
