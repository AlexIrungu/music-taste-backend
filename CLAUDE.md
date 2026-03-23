# Music Taste DNA — Project Reference

## What This Project Is
A personalized music identity app powered by Spotify listening data.
Users get a genre-based "DNA" archetype, a taste map, a radar chart of their
genre fingerprint, a shareable Music Passport card, and a smart playlist creator.

---

## Project Structure (Monorepo)

```
public-apis/
├── frontend/                          # Next.js 16 + TypeScript
│   ├── app/
│   │   ├── page.tsx                   # Landing page — Spotify login
│   │   ├── layout.tsx                 # Root layout + metadata
│   │   ├── globals.css                # Tailwind + fadeIn animation
│   │   ├── dashboard/
│   │   │   └── page.tsx               # Server-rendered dashboard
│   │   ├── share/
│   │   │   └── page.tsx               # Public profile share page + OG metadata
│   │   ├── api/
│   │   │   ├── auth/callback/
│   │   │   │   └── route.ts           # OAuth callback — sets httpOnly cookies
│   │   │   ├── pipeline/route.ts      # Proxy → /spotify/data-pipeline
│   │   │   ├── ml-profile/route.ts    # Proxy → /ml/profile
│   │   │   ├── create-playlist/route.ts # Proxy → /spotify/create-playlist
│   │   │   └── og/route.tsx           # OG image generation (next/og)
│   │   └── components/
│   │       ├── Sidebar.tsx            # Vertical nav — sections, time range, profile
│   │       ├── DashboardClient.tsx    # Section-based dashboard with sidebar layout
│   │       ├── PlaylistCreator.tsx    # Smart playlist builder (genre/mood filters)
│   │       ├── ShareView.tsx          # Public share page UI + compatibility
│   │       ├── charts/
│   │       │   ├── RadarChart.tsx     # Genre DNA radar (Recharts)
│   │       │   └── TasteMap.tsx       # Artist scatter in PCA space (Recharts)
│   │       └── cards/
│   │           └── MusicPassport.tsx  # Shareable card + PNG download
│   ├── next.config.ts                 # allowedDevOrigins for 127.0.0.1
│   ├── .env.local                     # NEXT_PUBLIC_SPOTIFY_CLIENT_ID, BACKEND_URL
│   └── package.json
├── backend/                           # FastAPI (Python)
│   ├── main.py                        # App entry — CORS, router registration
│   ├── requirements.txt
│   ├── Procfile                       # Render start command
│   ├── routers/
│   │   ├── spotify.py                 # Auth + data pipeline + playlist creation
│   │   └── ml.py                      # ML profile + compatibility endpoints
│   ├── services/
│   │   ├── spotify_client.py          # Spotify API calls (httpx)
│   │   └── ml_engine.py              # Genre vectors, archetypes, PCA, scoring
│   ├── .env                           # SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET
│   └── venv/
├── CLAUDE.md
└── README.md
```

---

## Tech Stack (Decided)

| Layer      | Technology                            | Notes                                        |
|------------|---------------------------------------|----------------------------------------------|
| Frontend   | Next.js 16 + TypeScript + Tailwind CSS |                                             |
| Charts     | Recharts                              | Swapped from D3.js — lower complexity        |
| Backend    | FastAPI (Python)                      | Native ML library support                    |
| ML / Data  | scikit-learn + numpy                  | K-Means clustering on genre vectors          |
| Auth       | Spotify OAuth 2.0                     | scopes: user-top-read, user-read-recently-played, user-read-private, user-read-email, streaming, playlist-modify-public, playlist-modify-private |
| DB         | Supabase (Postgres + Auth)            | Deferred — not needed (session/cookie state)  |
| Hosting    | Vercel (frontend) + Render (backend)  |                                              |

---

## APIs Used

| API                | Purpose                                               | Status  |
|--------------------|-------------------------------------------------------|---------|
| Spotify Web API    | Top tracks, top artists (genres), user profile, playlist creation | ✅ |
| Spotify OAuth 2.0  | User authentication                                   | ✅ |
| Spotify Web Playback SDK | In-browser track playback                        | ✅ |
| Spotify audio-features | Audio dimensions (danceability, energy, etc.)     | DROPPED — restricted for new apps since Nov 2024 |
| Last.fm API        | Genre enrichment                                      | DROPPED — Spotify artist.genres is sufficient |

---

## Auth Flow (implemented)

```
1. page.tsx            → generates Spotify auth URL with scopes
2. Spotify             → redirects to /api/auth/callback?code=xxx
3. route.ts            → calls POST /spotify/auth/token on backend
4. backend             → exchanges code for tokens, returns JSON
5. route.ts            → returns 200 HTML with Set-Cookie headers + JS redirect
                          (NextResponse.redirect() drops Set-Cookie in Next.js 16 — 200 + meta redirect is the fix)
6. dashboard/page.tsx  → reads access_token cookie, calls GET /spotify/data-pipeline
                          with Authorization: Bearer <token> header
7. backend             → returns profile + tracks + top artists with genres
```

---

## Dashboard UI (Sidebar Navigation)

The dashboard uses a vertical sidebar layout instead of a single scrolling page.
Sections are rendered one at a time based on active nav selection.

| Section    | Content                                              | Component(s)                    |
|------------|------------------------------------------------------|---------------------------------|
| Overview   | Archetype card, mainstream/era/diversity stat cards  | DashboardClient (inline)        |
| Top Tracks | Full 50-track list with playback, album, popularity  | DashboardClient (inline)        |
| Top Artists| Card grid (2–3 cols) with genres + popularity bars   | DashboardClient (inline)        |
| Genre DNA  | Fingerprint bars + radar chart side by side          | RadarChart.tsx                  |
| Taste Map  | Full-width PCA scatter plot                          | TasteMap.tsx                    |
| Passport   | Music Passport card + share/download                 | MusicPassport.tsx               |
| Playlist   | Smart playlist creator with 6 filters                | PlaylistCreator.tsx             |

**Sidebar features:**
- Profile avatar + display name
- Time range selector (4 weeks / 6 months / All time)
- Section navigation with active indicator
- Sign out link
- Mobile: hamburger toggle + slide-in overlay (hidden on `lg:` breakpoints)
- Mini player fixed at bottom, offset for sidebar (`lg:left-60`)

---

## Playlist Creator

Creates Spotify playlists from the user's top tracks with smart filters:

| Filter          | Logic                                 |
|-----------------|---------------------------------------|
| All Tracks      | Full top 50                           |
| By Genre        | User picks genres from tag cloud      |
| Deep Cuts       | Popularity < 40                       |
| Mainstream Hits | Popularity > 70                       |
| Throwbacks      | Released before 2010                  |
| Recent Finds    | Released in last 2 years              |

**Flow:** Filter → preview matching tracks → name playlist → "Create Playlist" → created on user's Spotify account with "Open in Spotify" link.

**Requires scopes:** `playlist-modify-public`, `playlist-modify-private` (added to auth URL).
Users must re-authenticate after scope changes to grant new permissions.

---

## Backend Endpoints

| Method | Path                       | Description                                          |
|--------|----------------------------|------------------------------------------------------|
| GET    | /health                    | Health check                                         |
| POST   | /spotify/auth/token        | Exchange auth code for tokens                        |
| POST   | /spotify/auth/refresh      | Refresh expired access token                         |
| GET    | /spotify/profile           | Authenticated user profile                           |
| GET    | /spotify/top-tracks        | Top 50 tracks (limit, time_range params)             |
| GET    | /spotify/data-pipeline     | Profile + tracks + top artists with genres merged    |
| POST   | /spotify/create-playlist   | Create Spotify playlist + add tracks                 |
| GET    | /ml/profile                | Full ML profile — archetype, scores, taste map       |
| POST   | /ml/compatibility          | Cosine similarity against a provided genre vector    |
| GET    | /ml/status                 | ML engine status                                     |

All protected endpoints read the token via `Authorization: Bearer` header
(using `request.headers.get("authorization")` directly — FastAPI `Header(None)` dependency had reliability issues).

---

## Frontend Proxy Routes

| Method | Path                  | Backend Target                  |
|--------|-----------------------|---------------------------------|
| GET    | /api/pipeline         | /spotify/data-pipeline          |
| GET    | /api/ml-profile       | /ml/profile                     |
| POST   | /api/create-playlist  | /spotify/create-playlist        |

Proxy routes keep the access token server-side (read from httpOnly cookies).

---

## Data Model (Pipeline Response)

```json
{
  "profile": { "display_name": "", "images": [] },
  "tracks": [
    {
      "id": "", "name": "", "artists": [], "album": "",
      "release_date": "", "popularity": 0, "explicit": false,
      "preview_url": "", "image": "", "genres": []
    }
  ],
  "top_artists": [
    { "id": "", "name": "", "genres": [], "popularity": 0, "image": "" }
  ]
}
```

---

## Build Phases

### Phase 1 — Auth + Data Pipeline ✅
- [x] Spotify OAuth flow (auth URL → callback → token exchange → httpOnly cookies)
- [x] Fetch user's top 50 tracks
- [x] Fetch user's top 50 artists with genres
- [x] Genre enrichment for tracks via artist lookup
- [x] Data pipeline endpoint — merged track + artist + genre response
- [x] Basic dashboard — top tracks, top artists, genre fingerprint bars
- [ ] Token refresh handling (on 401 response)

### Phase 2 — ML Profiling Engine ✅
- [x] Genre vector encoding (count vector on genre tags)
- [x] K-Means clustering on genre + popularity dimensions
- [x] PCA reduction to 2D for taste map visualization
- [x] Personality archetype labeling per cluster (6 archetypes)
- [x] Mainstream vs niche score (based on popularity distribution)
- [x] Era analysis (release year distribution)

### Phase 3 — UI + Visualization ✅
- [x] Radar chart — genre DNA shape (Recharts)
- [x] Taste map scatter plot — artists in 2D PCA space (Recharts)
- [x] Shareable Music Passport card (PNG export via Canvas API)
- [x] Time range selector (short/medium/long_term) with loading overlay

### Phase 4 — Social Layer + Polish ✅
- [x] Compatibility score between two users' genre profiles
- [x] Public profile page with shareable URL
- [x] OG image generation for Twitter/Instagram sharing
- [x] Shareable link via base64url-encoded JSON (no DB needed)

### Phase 5 — Dashboard Redesign + Playlist Creator ✅
- [x] Vertical sidebar navigation (desktop + mobile responsive)
- [x] Section-based layout (Overview, Tracks, Artists, Genre DNA, Taste Map, Passport, Playlist)
- [x] Expanded track list (all 50) with album column
- [x] Artist card grid with popularity bars
- [x] Smart playlist creator with 6 filter modes
- [x] Spotify playlist creation via API (create + add tracks)
- [x] Frontend proxy route for playlist creation
- [x] Fade-in animation on section transitions

---

## Key Decisions & Rationale

- **Dropped audio-features**: Spotify restricted this endpoint for new apps in November 2024. Returns 403 for any app created after that date. Genre + popularity is a viable alternative.
- **Genre-based ML pivot**: Artist genre tags (e.g. "sad indie pop", "afrobeats", "drill") are more human-readable for archetype labeling than raw audio dimensions. Clustering on genre vectors gives more interpretable archetypes.
- **Dropped Last.fm**: Spotify `artist.genres` is sufficient after the audio-features pivot.
- **Recharts over D3.js**: D3 has a steep learning curve. Recharts handles radar + scatter with React-native components.
- **K-Means cluster count**: 6 archetypes, tuned from real user data.
- **Supabase deferred**: Session/cookie state is sufficient. No DB needed.
- **Cookie strategy**: Tokens stored as httpOnly cookies set via raw `Set-Cookie` headers on a 200 HTML response. `NextResponse.redirect()` drops `Set-Cookie` in Next.js 16 — the 200 + `window.location.replace()` pattern is the fix.
- **Auth header over Cookie header**: Dashboard passes token to backend via `Authorization: Bearer` header. Server-side fetch with manual `Cookie:` header was not being parsed by FastAPI.
- **Spotify dev mode user allowlist**: In development mode, users must be explicitly added under Settings → User Management in the Spotify developer dashboard (max 5 users).
- **Redirect URI**: Must use `http://127.0.0.1:PORT` not `http://localhost:PORT`. Spotify rejects localhost.
- **Sidebar over single-page scroll**: Dashboard split into 7 navigable sections for better UX. Client-side section switching (no route changes) keeps state intact.
- **Playlist creation without /recommendations**: The `/recommendations` endpoint is restricted (403) for new apps. Instead, we filter the user's own top tracks by genre, popularity, and release date to build playlists.

---

## Spotify API Restrictions (new apps, post Nov 2024)

The following endpoints return 403 for apps without extended access:
- `GET /audio-features` / `GET /audio-features/{id}`
- `GET /audio-analysis/{id}`
- `GET /recommendations`
- `GET /artists` (batch)

Available endpoints we use:
- `GET /me/top/tracks` ✅
- `GET /me/top/artists` ✅
- `GET /me` ✅
- `POST /users/{id}/playlists` ✅
- `POST /playlists/{id}/tracks` ✅

---

## Environment Variables

### backend/.env
```
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/auth/callback
FRONTEND_URL=http://127.0.0.1:3000
ALLOWED_ORIGINS=http://127.0.0.1:3000,http://localhost:3000
```

### frontend/.env.local
```
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=
NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/auth/callback
BACKEND_URL=http://127.0.0.1:8000
NEXT_PUBLIC_BASE_URL=http://127.0.0.1:3000
```

> **Note:** Local `.env` files use `127.0.0.1` URLs. Production env vars are set separately in Vercel/Render dashboards and override these values.

---

## Running Locally

```bash
# Backend
cd backend && source venv/bin/activate
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm run dev
```

Open `http://127.0.0.1:3000` (not localhost — Spotify redirect URI uses 127.0.0.1).

---

## Workflow Notes
- User runs all terminal commands and builds manually
- Claude writes code; user executes
- Commits are manual — Claude does not auto-push or auto-commit
