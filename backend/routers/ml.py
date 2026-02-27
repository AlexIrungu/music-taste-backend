from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from services import spotify_client
from services import ml_engine

router = APIRouter()


def extract_token(request: Request) -> str:
    auth = request.headers.get("authorization")
    if not auth or not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    return auth[7:]


@router.get("/status")
def ml_status():
    return {"status": "ready"}


class CompatibilityRequest(BaseModel):
    """Genre vector of the other user, keyed by genre name."""
    other_genres: dict[str, int]


@router.post("/compatibility")
async def ml_compatibility(body: CompatibilityRequest, request: Request, time_range: str = "medium_term"):
    """
    Compare the current user's genre vector against a provided genre vector.
    Returns a cosine similarity score + label.
    """
    token = extract_token(request)

    try:
        tracks_data = await spotify_client.get_top_tracks(token, time_range=time_range)
        top_artists_data = await spotify_client.get_top_artists(token, time_range=time_range)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Spotify API error: {e}")

    my_vector = ml_engine.build_genre_vector(
        top_artists=top_artists_data.get("items", []),
        tracks=tracks_data.get("items", []),
    )

    return ml_engine.compatibility_score(my_vector, body.other_genres)


@router.get("/profile")
async def ml_profile(request: Request, time_range: str = "medium_term"):
    """
    Fetch the user's Spotify data and return a full ML music personality profile:
    archetype, mainstream score, era analysis, and diversity score.
    """
    token = extract_token(request)

    try:
        tracks_data = await spotify_client.get_top_tracks(token, time_range=time_range)
        top_artists_data = await spotify_client.get_top_artists(token, time_range=time_range)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Spotify API error: {e}")

    profile = ml_engine.build_profile(
        tracks=tracks_data.get("items", []),
        top_artists=top_artists_data.get("items", []),
    )

    return profile
