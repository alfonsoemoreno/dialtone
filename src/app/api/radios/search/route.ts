import { NextResponse } from "next/server";
import { getRadioBrowserBase } from "@/lib/radioBrowser";

type CorsCacheEntry = {
  ok: boolean;
  at: number;
};

const corsCache = new Map<string, CorsCacheEntry>();
const CORS_CACHE_TTL_MS = 30 * 60 * 1000;
const CORS_TIMEOUT_MS = 3500;

const getCachedCors = (url: string) => {
  const entry = corsCache.get(url);
  if (!entry) return null;
  if (Date.now() - entry.at > CORS_CACHE_TTL_MS) {
    corsCache.delete(url);
    return null;
  }
  return entry.ok;
};

const setCachedCors = (url: string, ok: boolean) => {
  corsCache.set(url, { ok, at: Date.now() });
};

const fetchWithTimeout = async (url: string, init: RequestInit, ms: number) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return res;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const isCorsAllowed = (allowOrigin: string | null, origin: string | null) => {
  if (!allowOrigin) return false;
  if (allowOrigin === "*") return true;
  if (!origin) return false;
  return allowOrigin.split(/\s*,\s*/).includes(origin);
};

const checkCors = async (url: string, origin: string | null) => {
  const cached = getCachedCors(url);
  if (cached !== null) return cached;

  const headers: Record<string, string> = {};
  if (origin) headers["Origin"] = origin;

  const headRes = await fetchWithTimeout(
    url,
    { method: "HEAD", redirect: "follow", headers, cache: "no-store" },
    CORS_TIMEOUT_MS
  );
  if (headRes) {
    const allow = headRes.headers.get("access-control-allow-origin");
    if (isCorsAllowed(allow, origin)) {
      headRes.body?.cancel?.();
      setCachedCors(url, true);
      return true;
    }
    headRes.body?.cancel?.();
  }

  const getRes = await fetchWithTimeout(
    url,
    {
      method: "GET",
      redirect: "follow",
      headers: { ...headers, Range: "bytes=0-0" },
      cache: "no-store",
    },
    CORS_TIMEOUT_MS
  );
  if (getRes) {
    const allow = getRes.headers.get("access-control-allow-origin");
    const ok = isCorsAllowed(allow, origin);
    getRes.body?.cancel?.();
    setCachedCors(url, ok);
    return ok;
  }

  setCachedCors(url, false);
  return false;
};

const filterByCors = async (stations: any[], origin: string | null, limit: number) => {
  const results: any[] = [];
  const queue = stations.map((station, index) => ({ station, index }));
  const concurrency = 4;

  const workers = Array.from({ length: concurrency }).map(async () => {
    while (queue.length > 0) {
      if (results.length >= limit) return;
      const next = queue.shift();
      if (!next) return;
      const url = next.station?.url_resolved;
      if (!url) continue;
      try {
        const ok = await checkCors(url, origin);
        if (ok) {
          results.push(next.station);
        }
      } catch {
        // Ignore failed checks
      }
    }
  });

  await Promise.all(workers);
  return results.slice(0, limit);
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const country = searchParams.get("country")?.trim();
  const limit = Number(searchParams.get("limit") ?? "20");
  const corsOnly = searchParams.get("cors") === "1";

  const params = new URLSearchParams({
    hidebroken: "true",
    order: "clickcount",
    reverse: "true",
    limit: String(
      Math.min(
        Math.max(corsOnly ? limit * 3 : limit, 5),
        50
      )
    ),
  });

  if (query) params.set("name", query);
  if (country) params.set("country", country);

  const base = getRadioBrowserBase();
  const url = `${base}/json/stations/search?${params.toString()}`;

  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) {
      return NextResponse.json({ stations: [] }, { status: 200 });
    }
    const data = (await res.json()) as any[];
    if (!corsOnly) {
      return NextResponse.json({ stations: data });
    }
    const origin =
      request.headers.get("origin") ??
      (() => {
        const host = request.headers.get("host");
        if (!host) return null;
        const proto = request.headers.get("x-forwarded-proto") ?? "http";
        return `${proto}://${host}`;
      })();
    const filtered = await filterByCors(data, origin, Math.min(Math.max(limit, 5), 50));
    return NextResponse.json({ stations: filtered });
  } catch {
    return NextResponse.json({ stations: [] }, { status: 200 });
  }
}
