import httpx

SPOTIFY_API_BASE = "https://api.spotify.com/v1"
SPOTIFY_AUTH_BASE = "https://accounts.spotify.com"


async def exchange_code(code: str, redirect_uri: str, client_id: str, client_secret: str) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{SPOTIFY_AUTH_BASE}/api/token",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect_uri,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            auth=(client_id, client_secret),
        )
        response.raise_for_status()
        return response.json()


async def refresh_access_token(refresh_token: str, client_id: str, client_secret: str) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{SPOTIFY_AUTH_BASE}/api/token",
            data={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            auth=(client_id, client_secret),
        )
        response.raise_for_status()
        return response.json()


async def get_user_profile(access_token: str) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{SPOTIFY_API_BASE}/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        response.raise_for_status()
        return response.json()


async def get_top_tracks(access_token: str, limit: int = 50, time_range: str = "medium_term") -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{SPOTIFY_API_BASE}/me/top/tracks",
            params={"limit": limit, "time_range": time_range},
            headers={"Authorization": f"Bearer {access_token}"},
        )
        response.raise_for_status()
        return response.json()


async def get_top_artists(access_token: str, limit: int = 50, time_range: str = "medium_term") -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{SPOTIFY_API_BASE}/me/top/artists",
            params={"limit": limit, "time_range": time_range},
            headers={"Authorization": f"Bearer {access_token}"},
        )
        response.raise_for_status()
        return response.json()


async def get_artists(access_token: str, artist_ids: list[str]) -> dict:
    """Fetch full artist objects (with genres) for a batch of IDs."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{SPOTIFY_API_BASE}/artists",
            params={"ids": ",".join(artist_ids[:50])},  # max 50 per request
            headers={"Authorization": f"Bearer {access_token}"},
        )
        response.raise_for_status()
        return response.json()
