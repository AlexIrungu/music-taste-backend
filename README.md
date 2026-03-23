# Music Taste DNA

Turn Spotify's listening data into a personalized musical identity — genre-based personality profiling, ML archetype labeling, interactive visualizations, a shareable Music Passport, and smart playlist creation.

## What it does

Music Taste DNA analyses your top tracks and artists on Spotify to surface a complete genre fingerprint: who you are as a listener, what your music says about you, and how you compare to others.

**You get:**
- An **archetype** — e.g. "The Drill Head", "The Sad Indie Kid", "The R&B Romantic"
- A **Mainstream Score** — where you sit on the underground ↔ mainstream spectrum
- An **Era Profile** — which decades dominate your listening
- A **Taste Diversity** score — focused devotee vs. eclectic wanderer
- A **Genre DNA Radar** — your fingerprint as a Recharts radar chart
- A **2D Taste Map** — your top artists plotted via PCA in genre space
- A **Music Passport** — downloadable PNG identity card
- A **shareable link** — public `/share` page with OG image for Twitter/Instagram
- A **compatibility score** — visitors compare their genre vector with yours
- A **Playlist Creator** — build Spotify playlists filtered by genre, popularity, or era
- **Spotify playback** — click any track to play it via the Web Playback SDK

> **Note on Spotify API:** The `/audio-features` and `/recommendations` endpoints are restricted for apps created after November 2024. This project uses artist genre tags + popularity as the primary ML signal — a more interpretable alternative. Playlist creation uses smart filtering on the user's own top tracks instead of the recommendations API.

---

## Tech Stack

| Layer      | Technology                              | Notes                              |
|------------|-----------------------------------------|------------------------------------|
| Frontend   | Next.js 16 + TypeScript + Tailwind CSS  |                                    |
| Charts     | Recharts 3                              | Radar + Scatter                    |
| Backend    | FastAPI (Python 3.11+)                  |                                    |
| ML / Data  | scikit-learn + numpy                    | PCA, cosine similarity, genre vectors |
| Auth       | Spotify OAuth 2.0                       | httpOnly cookies                   |
| Playback   | Spotify Web Playback SDK                | Requires Premium                   |
| Hosting    | Vercel (frontend) + Render (backend)    |                                    |

---

## Getting Started (Local)

### Prerequisites
- Node.js 18+
- Python 3.11+
- A [Spotify Developer App](https://developer.spotify.com/dashboard)
- Spotify Premium (for Web Playback SDK)

### 1. Clone and install

```bash
# Frontend
cd frontend
npm install

# Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure Spotify app

In your [Spotify Developer Dashboard](https://developer.spotify.com/dashboard):
1. Create an app with **Web API** and **Web Playback SDK** checked
2. Add redirect URIs:
   - `http://127.0.0.1:3000/api/auth/callback` (development)
   - `https://your-vercel-domain.vercel.app/api/auth/callback` (production)
3. Under **User Management**, add your Spotify account email (required in Development mode, max 5 users)

### 3. Environment variables

**`backend/.env`**
```
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/auth/callback
FRONTEND_URL=http://127.0.0.1:3000
ALLOWED_ORIGINS=http://127.0.0.1:3000,http://localhost:3000
```

**`frontend/.env.local`**
```
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_client_id
NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/auth/callback
BACKEND_URL=http://127.0.0.1:8000
NEXT_PUBLIC_BASE_URL=http://127.0.0.1:3000
```

> **Note:** Local `.env` files use `127.0.0.1` URLs. Production env vars are set separately in Vercel/Render dashboards.

### 4. Run

```bash
# Terminal 1 — Backend
cd backend && source venv/bin/activate
uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Open `http://127.0.0.1:3000` — must use `127.0.0.1`, not `localhost` (Spotify redirect URI restriction).

---

## Project Structure

```
├── frontend/
│   ├── app/
│   │   ├── page.tsx                        # Landing page — Spotify login
│   │   ├── layout.tsx                      # Root layout + metadata
│   │   ├── globals.css                     # Tailwind + fadeIn animation
│   │   ├── dashboard/page.tsx              # Server-rendered dashboard
│   │   ├── share/page.tsx                  # Public profile share page + OG metadata
│   │   ├── api/
│   │   │   ├── auth/callback/route.ts      # OAuth callback — sets httpOnly cookies
│   │   │   ├── pipeline/route.ts           # Proxy → /spotify/data-pipeline
│   │   │   ├── ml-profile/route.ts         # Proxy → /ml/profile
│   │   │   ├── create-playlist/route.ts    # Proxy → /spotify/create-playlist
│   │   │   └── og/route.tsx                # OG image generation (next/og)
│   │   └── components/
│   │       ├── Sidebar.tsx                 # Vertical nav — sections, time range, profile
│   │       ├── DashboardClient.tsx         # Section-based dashboard with sidebar layout
│   │       ├── PlaylistCreator.tsx         # Smart playlist builder (genre/mood filters)
│   │       ├── ShareView.tsx               # Public share page UI + compatibility
│   │       ├── charts/
│   │       │   ├── RadarChart.tsx          # Genre DNA radar (Recharts)
│   │       │   └── TasteMap.tsx            # Artist scatter in PCA space (Recharts)
│   │       └── cards/
│   │           └── MusicPassport.tsx       # Shareable card + PNG download
│   ├── next.config.ts
│   └── package.json
│
├── backend/
│   ├── main.py                             # FastAPI app — CORS, routers
│   ├── requirements.txt
│   ├── Procfile                            # Render start command
│   ├── routers/
│   │   ├── spotify.py                      # Auth + data pipeline + playlist creation
│   │   └── ml.py                           # ML profile + compatibility endpoints
│   └── services/
│       ├── spotify_client.py               # Spotify API calls (httpx)
│       └── ml_engine.py                    # Genre vectors, archetypes, PCA, scoring
│
└── CLAUDE.md                               # Full developer reference
```

---

## Dashboard

The dashboard uses a **vertical sidebar navigation** with 7 sections:

| Section    | Content                                              |
|------------|------------------------------------------------------|
| Overview   | Archetype card + mainstream/era/diversity stat cards |
| Top Tracks | Full 50-track list with playback, album, popularity  |
| Top Artists| Card grid with genres + popularity bars               |
| Genre DNA  | Fingerprint bars + radar chart side by side          |
| Taste Map  | Full-width PCA scatter plot of artists               |
| Passport   | Music Passport card + share link + PNG download      |
| Playlist   | Smart playlist creator with 6 filter modes           |

The sidebar includes a time range selector (4 weeks / 6 months / All time) and collapses to a hamburger menu on mobile.

---

## Playlist Creator

Build Spotify playlists from your top tracks using smart filters:

| Filter          | What it picks                 |
|-----------------|-------------------------------|
| All Tracks      | Full top 50                   |
| By Genre        | User picks genres from tag cloud |
| Deep Cuts       | Popularity < 40               |
| Mainstream Hits | Popularity > 70               |
| Throwbacks      | Released before 2010          |
| Recent Finds    | Released in last 2 years      |

Pick a filter → preview matching tracks → name the playlist → create it on your Spotify account.

---

## API Reference

### Spotify endpoints (`/spotify`)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/spotify/auth/token` | Exchange auth code for tokens |
| `POST` | `/spotify/auth/refresh` | Refresh expired access token |
| `GET`  | `/spotify/profile` | Authenticated user profile |
| `GET`  | `/spotify/top-tracks` | Top 50 tracks (`time_range`, `limit` params) |
| `GET`  | `/spotify/data-pipeline` | Profile + tracks + artists merged (`time_range` param) |
| `POST` | `/spotify/create-playlist` | Create Spotify playlist + add tracks |

### ML endpoints (`/ml`)

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/ml/profile` | Full ML profile — archetype, scores, taste map (`time_range` param) |
| `POST` | `/ml/compatibility` | Cosine similarity against a provided genre vector |
| `GET`  | `/ml/status` | Health check |

All protected endpoints require `Authorization: Bearer <token>` header.

**Time range values:** `short_term` (4 weeks) · `medium_term` (6 months, default) · `long_term` (all time)

---

## Deployment

### Backend → Render

1. Push the repo to GitHub
2. Go to [render.com](https://render.com) → **New → Web Service**
3. Connect your GitHub repo and set **Root Directory** to `backend`
4. Render auto-detects Python. Confirm these settings:
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Python version:** 3.11+
5. Add environment variables under **Environment**:

```
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=https://your-vercel-domain.vercel.app/api/auth/callback
FRONTEND_URL=https://your-vercel-domain.vercel.app
ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app
```

6. Click **Deploy**. Copy the Render URL (e.g. `https://music-dna-api.onrender.com`)

> **Free tier note:** Render's free tier spins down after 15 minutes of inactivity. The first request after idle takes ~30–60 seconds to cold-start. Upgrade to a paid instance ($7/mo) to keep it always-on.

### Frontend → Vercel

1. Push `frontend/` to GitHub
2. In Vercel: **New Project → Import from GitHub**
3. Set root directory to `frontend/`
4. Add environment variables in Vercel dashboard:

```
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=
NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=https://your-vercel-domain.vercel.app/api/auth/callback
BACKEND_URL=https://your-render-service.onrender.com
NEXT_PUBLIC_BASE_URL=https://your-vercel-domain.vercel.app
```

5. Deploy

### Post-deployment checklist

- [ ] Add production redirect URI to Spotify Developer Dashboard
- [ ] Add your Spotify email under User Management (until app is approved for public access)
- [ ] Verify `ALLOWED_ORIGINS` on Render matches your exact Vercel domain
- [ ] Test the full OAuth flow end-to-end on the production URL
- [ ] To open the app beyond 5 users: apply for Spotify Extended Quota Mode

---

## Spotify API Notes

**Restricted endpoints (new apps, post Nov 2024) — not used:**
- `GET /audio-features` / `GET /audio-analysis` → returns 403
- `GET /recommendations` → returns 403
- `GET /artists` (batch) → returns 403

**Endpoints used:**
- `GET /me/top/tracks` ✅
- `GET /me/top/artists` ✅
- `GET /me` ✅
- `POST /users/{id}/playlists` ✅
- `POST /playlists/{id}/tracks` ✅

---

## Roadmap

- **Phase 1** — Auth + data pipeline ✅
- **Phase 2** — Genre vectors, archetype labeling, mainstream/era/diversity scores ✅
- **Phase 3** — Radar chart, taste map (PCA), Music Passport (PNG export) ✅
- **Phase 4** — Shareable profiles, OG image generation, compatibility score ✅
- **Phase 5** — Dashboard redesign (sidebar nav) + Playlist Creator ✅
