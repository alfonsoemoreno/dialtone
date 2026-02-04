"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { skins } from "@/components/skins/registry";
import { storage } from "@/lib/storage";

export const SkinSelector = () => {
  const router = useRouter();
  const [selected, setSelected] = useState<string>("receiver-1978");

  useEffect(() => {
    const settings = storage.getSettings();
    setSelected(settings.skinId);
  }, []);

  const handleSelect = (id: string) => {
    setSelected(id);
    storage.saveSettings({ skinId: id });
  };

  const handleEnter = () => {
    storage.saveSettings({ skinId: selected });
    router.push("/player");
  };

  return (
    <div className="skin-selector">
      <h1>Choose Your Vintage Skin</h1>
      <p>Each receiver is a full UI skin with its own dials, VU, and vibe.</p>
      <div className="skin-grid">
        {skins.map((skin) => (
          <button
            key={skin.manifest.id}
            className={`skin-card ${selected === skin.manifest.id ? "active" : ""}`}
            onClick={() => handleSelect(skin.manifest.id)}
          >
            <img src={skin.manifest.preview} alt={skin.manifest.name} />
            <div className="skin-card-name">{skin.manifest.name}</div>
          </button>
        ))}
      </div>
      <button className="primary" onClick={handleEnter}>
        Enter Player
      </button>
    </div>
  );
};
