export type RadioBrowserStation = {
  stationuuid: string;
  name: string;
  url_resolved: string;
  country: string;
  tags: string;
  favicon: string | null;
  bitrate?: number;
};

const DEFAULT_BASE = "https://de1.api.radio-browser.info";

export const getRadioBrowserBase = () =>
  process.env.RADIO_BROWSER_BASE_URL ?? DEFAULT_BASE;

export const mapRadioBrowserStation = (station: RadioBrowserStation) => ({
  id: `rb_${station.stationuuid}`,
  name: station.name,
  streamUrl: station.url_resolved,
  country: station.country || "Unknown",
  genre: station.tags || "Unknown",
  favicon: station.favicon || undefined,
  bitrate: station.bitrate ?? undefined,
});
