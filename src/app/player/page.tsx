import { SkinHost } from "@/components/skins/SkinHost";
import { RadioCatalog } from "@/components/radio/RadioCatalog";
import Link from "next/link";

export default function PlayerPage() {
  return (
    <main className="player-page">
      <header className="player-header">
        <Link href="/" className="back-link">
          ← Skins
        </Link>
        <h1>Vintage Player</h1>
        <p>Custom UI, dual sources, and a vintage skin system.</p>
      </header>
      <div className="player-layout">
        <SkinHost />
        <RadioCatalog />
      </div>
    </main>
  );
}
