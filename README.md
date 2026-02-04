# Vintage Audio Player (Next.js 16)

A vintage-themed web audio player with pluggable skins, radio streaming, and Spotify Web Playback SDK (no iframe embeds). Built with Next.js 16, App Router, TypeScript, ESLint, and Tailwind.

## Local setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Spotify setup (PKCE)

1. Create a Spotify app in the Spotify Developer Dashboard.
2. Add the redirect URI you will use locally:
   - Example: `http://localhost:3000/api/auth/spotify/callback`
3. Create `.env.local` in the project root with:

```bash
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/spotify/callback
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

Notes:
- Tokens are stored in `httpOnly` cookies for the session. Refresh tokens are handled server-side.
- The Web Playback SDK requires the user to have a Spotify Premium account.

## Routes

- `/` skin selection
- `/player` player UI

## Radio catalog

Radio stations are defined in `src/data/radios.json`. If a stream fails, replace its `streamUrl` with a working URL.

### Radio Browser (open directory)

This project also integrates Radio Browser (no API key), via `/api/radios/search`. It queries the public Radio Browser network and returns station lists without proxying audio streams (stream URLs play directly in the browser).

Optional env:

```bash
RADIO_BROWSER_BASE_URL=https://de1.api.radio-browser.info
```

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import in Vercel.
3. Add env vars in Vercel:
   - `SPOTIFY_CLIENT_ID`
   - `SPOTIFY_REDIRECT_URI` (must match your Vercel domain)
   - `NEXT_PUBLIC_BASE_URL`
4. Deploy.

## Architecture

- `src/lib/player/types.ts` provider contract
- `src/lib/player/PlayerHub.ts` orchestration (only one active source)
- `src/lib/player/providers/radio.ts` HTMLAudioElement provider
- `src/lib/player/providers/spotify.ts` Spotify Web Playback SDK provider
- `src/lib/storage.ts` MVP persistence (localStorage) with interfaces ready for DB migration

## Spotify control

- Search and play tracks/playlists from the Spotify panel in `/player`.
- Playback is transferred automatically to the Web Playback SDK device.
- Basic controls: next/prev and queue.

## TODOs

- Add Neon/Postgres storage driver and migrate `storage.ts`.
- Expand skin catalog.
