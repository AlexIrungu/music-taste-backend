import os
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from services import spotify_client

router = APIRouter()

CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
REDIRECT_URI = os.getenv("SPOTIFY_REDIRECT_URI")


class TokenRequest(BaseModel):
    code: str


class RefreshRequest(BaseModel):
    refresh_token: str


def extract_token(request: Request) -> str:
    """Read Bearer token directly from request headers."""
    auth = request.headers.get("authorization")
    if not auth or not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    return auth[7:]


@router.post("/auth/token")
async def exchange_token(body: TokenRequest):
    """Exchange Spotify auth code for access + refresh tokens."""
    try:
        tokens = await spotify_client.exchange_code(
            code=body.code,
            redirect_uri=REDIRECT_URI,
            client_id=CLIENT_ID,
            client_secret=CLIENT_SECRET,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "access_token": tokens["access_token"],
        "refresh_token": tokens.get("refresh_token", ""),
        "expires_in": tokens.get("expires_in", 3600),
    }


@router.post("/auth/refresh")
async def refresh_token(body: RefreshRequest):
    """Refresh an expired access token."""
    try:
        tokens = await spotify_client.refresh_access_token(
            refresh_token=body.refresh_token,
            client_id=CLIENT_ID,
            client_secret=CLIENT_SECRET,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "access_token": tokens["access_token"],
        "expires_in": tokens.get("expires_in", 3600),
    }


@router.get("/profile")
async def get_profile(request: Request):
    token = extract_token(request)
    try:
        return await spotify_client.get_user_profile(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@router.get("/top-tracks")
async def get_top_tracks(
    request: Request,
    limit: int = 50,
    time_range: str = "medium_term",
):
    token = extract_token(request)
    try:
        return await spotify_client.get_top_tracks(token, limit, time_range)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@router.get("/data-pipeline")
async def data_pipeline(request: Request, time_range: str = "medium_term"):
    """Fetch top tracks + top artists (with genres) + profile in one call."""
    token = extract_token(request)

    try:
        tracks_data = await spotify_client.get_top_tracks(token, time_range=time_range)
        top_artists_data = await spotify_client.get_top_artists(token, time_range=time_range)
        profile = await spotify_client.get_user_profile(token)

        # Build artist_id → genres lookup from top 50 artists only.
        # The batch /v1/artists endpoint is restricted for new Spotify apps (post Nov 2024),
        # so we skip the extra fetch for artists not in the top 50.
        artist_genres: dict[str, list[str]] = {
            a["id"]: a.get("genres", [])
            for a in top_artists_data["items"]
        }

    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Spotify API error: {e}")

    enriched = []
    for track in tracks_data["items"]:
        # Collect all genres from all artists on the track
        genres: list[str] = []
        for a in track["artists"]:
            genres.extend(artist_genres.get(a["id"], []))
        genres = list(dict.fromkeys(genres))  # deduplicate, preserve order

        enriched.append({
            "id": track.get("id", ""),
            "name": track.get("name", ""),
            "artists": [a["name"] for a in track["artists"]],
            "album": track["album"]["name"],
            "release_date": track["album"].get("release_date", ""),
            "popularity": track.get("popularity", 0),
            "explicit": track.get("explicit", False),
            "preview_url": track.get("preview_url"),
            "image": track["album"]["images"][0]["url"] if track["album"].get("images") else None,
            "genres": genres,
        })

    return {
        "profile": profile,
        "tracks": enriched,
        "top_artists": [
            {
                "id": a.get("id", ""),
                "name": a.get("name", ""),
                "genres": a.get("genres", []),
                "popularity": a.get("popularity", 0),
                "image": a["images"][0]["url"] if a.get("images") else None,
            }
            for a in top_artists_data["items"]
        ],
    }
