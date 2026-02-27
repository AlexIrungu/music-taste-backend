from __future__ import annotations

import re
from collections import Counter
from math import log2
from typing import Any


# ---------------------------------------------------------------------------
# Archetype definitions
# Each archetype has a set of genre keywords it claims.
# Matching is done by weighted overlap against the user's genre vector.
# ---------------------------------------------------------------------------

ARCHETYPES: list[dict] = [
    {
        "name": "The Drill Head",
        "emoji": "🔩",
        "description": "You live in the rhythmic pocket of trap and drill, drawn to raw energy and street narratives.",
        "genres": {
            "drill", "uk drill", "chicago drill", "trap", "rap", "hip hop",
            "gangster rap", "plugg", "pluggnb", "melodic rap", "pain rap",
        },
    },
    {
        "name": "The Sad Indie Kid",
        "emoji": "🌧️",
        "description": "Melancholy melodies and introspective lyrics are your comfort zone.",
        "genres": {
            "indie pop", "indie rock", "dream pop", "shoegaze", "bedroom pop",
            "lo-fi indie", "emo", "alternative", "slowcore", "sadcore",
        },
    },
    {
        "name": "The Afrobeats Devotee",
        "emoji": "🌍",
        "description": "The infectious rhythms of Africa and its diaspora move you like nothing else.",
        "genres": {
            "afrobeats", "afropop", "afroswing", "afro soul", "highlife",
            "gqom", "amapiano", "dancehall", "reggaeton", "afro r&b",
        },
    },
    {
        "name": "The Pop Maximalist",
        "emoji": "✨",
        "description": "Hooks, production, and pure feeling — you know a banger when you hear one.",
        "genres": {
            "pop", "dance pop", "electropop", "synth-pop", "teen pop",
            "k-pop", "j-pop", "power pop",
        },
    },
    {
        "name": "The R&B Romantic",
        "emoji": "💜",
        "description": "Soul and feeling come first. You gravitate toward intimate vocals and lush production.",
        "genres": {
            "r&b", "neo soul", "soul", "quiet storm", "contemporary r&b",
            "alternative r&b", "new jack swing", "funk", "motown",
        },
    },
    {
        "name": "The Alternative Explorer",
        "emoji": "🎸",
        "description": "You wander freely through rock, punk, and experimental spaces, always seeking the unexpected.",
        "genres": {
            "alternative rock", "post-punk", "art rock", "math rock",
            "noise rock", "experimental", "psychedelic rock", "prog rock",
        },
    },
]


# ---------------------------------------------------------------------------
# Core functions
# ---------------------------------------------------------------------------

def build_genre_vector(
    top_artists: list[dict],
    tracks: list[dict],
) -> dict[str, int]:
    """
    Build a weighted genre frequency map.
    Artist genres are weighted 2× — they are more authoritative than
    track-derived genre tags.
    Returns genres sorted by frequency (descending).
    """
    counts: Counter = Counter()

    for artist in top_artists:
        for genre in artist.get("genres", []):
            counts[genre.lower()] += 2

    for track in tracks:
        for genre in track.get("genres", []):
            counts[genre.lower()] += 1

    return dict(counts.most_common())


def _archetype_score(genre_vector: dict[str, int], archetype: dict) -> float:
    """
    Weighted overlap between the user's genre vector and an archetype's genre set.
    Partial string matches (e.g. "dark trap" containing "trap") count at half weight.
    """
    total = sum(genre_vector.values()) or 1
    score = 0.0
    for genre, count in genre_vector.items():
        if genre in archetype["genres"]:
            score += count
        else:
            for ag in archetype["genres"]:
                if ag in genre or genre in ag:
                    score += count * 0.5
                    break
    return score / total


def get_archetype(genre_vector: dict[str, int]) -> dict[str, Any]:
    """Return the best-matching archetype and confidence score (0–100)."""
    if not genre_vector:
        return {
            "name": "The Eclectic Wanderer",
            "emoji": "🌀",
            "description": "Your taste defies easy categorisation — you roam freely across the entire musical spectrum.",
            "top_genres": [],
            "confidence": 0.0,
        }

    scored = [
        (archetype, _archetype_score(genre_vector, archetype))
        for archetype in ARCHETYPES
    ]
    best, best_score = max(scored, key=lambda x: x[1])

    return {
        "name": best["name"],
        "emoji": best["emoji"],
        "description": best["description"],
        "top_genres": list(best["genres"])[:4],
        "confidence": round(min(best_score * 100, 100), 1),
    }


def mainstream_score(tracks: list[dict]) -> dict[str, Any]:
    """Average track popularity with a human-readable label."""
    pops = [t.get("popularity", 0) for t in tracks if t.get("popularity", 0) > 0]

    if not pops:
        return {"score": 0, "label": "Unknown", "description": "Not enough popularity data."}

    avg = round(sum(pops) / len(pops), 1)

    if avg >= 70:
        label, description = "Mainstream", "You're tuned into what the world is listening to right now."
    elif avg >= 45:
        label, description = "Mixed", "A blend of charting hits and deeper cuts — you know both worlds."
    else:
        label, description = "Underground", "You're ahead of the curve. Most of your picks fly under the radar."

    return {"score": avg, "label": label, "description": description}


def era_analysis(tracks: list[dict]) -> dict[str, Any]:
    """Decade distribution of top tracks by release year."""
    decade_counts: Counter = Counter()

    for track in tracks:
        match = re.match(r"(\d{4})", track.get("release_date", ""))
        if match:
            year = int(match.group(1))
            decade_counts[f"{(year // 10) * 10}s"] += 1

    if not decade_counts:
        return {
            "dominant_decade": "Unknown",
            "distribution": {},
            "description": "Not enough release date data.",
        }

    total = sum(decade_counts.values())
    distribution = {
        decade: round((count / total) * 100)
        for decade, count in sorted(decade_counts.items())
    }
    dominant = decade_counts.most_common(1)[0][0]

    return {
        "dominant_decade": dominant,
        "distribution": distribution,
        "description": f"Most of your listening lives in the {dominant}.",
    }


def diversity_score(genre_vector: dict[str, int]) -> dict[str, Any]:
    """
    Composite diversity score (0–1) combining:
    - unique genre ratio (scaled to 30 genres = 1.0)
    - Shannon entropy evenness across genres
    """
    if not genre_vector:
        return {"score": 0.0, "label": "Unknown", "description": "No genre data available."}

    total = sum(genre_vector.values())
    unique = len(genre_vector)

    breadth = min(unique / 30, 1.0)

    entropy = -sum((c / total) * log2(c / total) for c in genre_vector.values() if c > 0)
    max_entropy = log2(unique) if unique > 1 else 1
    evenness = entropy / max_entropy if max_entropy > 0 else 0

    score = round(breadth * 0.5 + evenness * 0.5, 2)

    if score >= 0.7:
        label, description = "Eclectic", "You roam widely — no single genre owns you."
    elif score >= 0.4:
        label, description = "Balanced", "A solid core sound with meaningful detours elsewhere."
    else:
        label, description = "Focused", "You know what you like and you stick to it."

    return {"score": score, "label": label, "description": description}


def taste_map(top_artists: list[dict]) -> list[dict]:
    """
    PCA reduction of artist genre vectors to 2D for scatter plot visualisation.
    Returns a list of {name, x, y, image, genres} dicts.
    Falls back to empty list if there is insufficient data.
    """
    import numpy as np
    from sklearn.decomposition import PCA

    artists_with_genres = [a for a in top_artists if a.get("genres")]
    if len(artists_with_genres) < 2:
        return []

    all_genres = sorted({g for a in artists_with_genres for g in a["genres"]})
    if len(all_genres) < 2:
        return []

    # Build binary genre matrix: rows = artists, cols = genres
    matrix = np.array(
        [[1 if g in a["genres"] else 0 for g in all_genres] for a in artists_with_genres],
        dtype=float,
    )

    n_components = min(2, matrix.shape[0] - 1, matrix.shape[1])
    if n_components < 1:
        return []

    try:
        coords = PCA(n_components=n_components).fit_transform(matrix)
    except Exception:
        return []

    result = []
    for i, artist in enumerate(artists_with_genres):
        result.append({
            "name": artist.get("name", ""),
            "x": round(float(coords[i, 0]), 3),
            "y": round(float(coords[i, 1]) if coords.shape[1] > 1 else 0.0, 3),
            "image": artist.get("image"),
            "genres": artist.get("genres", [])[:2],
        })
    return result


def compatibility_score(vector_a: dict[str, int], vector_b: dict[str, int]) -> dict[str, Any]:
    """
    Cosine similarity between two genre vectors, expressed as a 0–100 score.
    """
    all_genres = set(vector_a) | set(vector_b)
    if not all_genres:
        return {"score": 0, "label": "Incomparable", "description": "Not enough genre data to compare."}

    dot = sum(vector_a.get(g, 0) * vector_b.get(g, 0) for g in all_genres)
    mag_a = sum(v ** 2 for v in vector_a.values()) ** 0.5
    mag_b = sum(v ** 2 for v in vector_b.values()) ** 0.5

    if mag_a == 0 or mag_b == 0:
        return {"score": 0, "label": "Incomparable", "description": "Not enough genre data to compare."}

    score = round((dot / (mag_a * mag_b)) * 100, 1)

    if score >= 75:
        label = "Musical Soulmates"
        description = "You're practically listening to the same playlist. Uncanny."
    elif score >= 50:
        label = "Overlapping Tastes"
        description = "Solid common ground — you'd have a great time sharing music."
    elif score >= 25:
        label = "Different but Curious"
        description = "Your sounds don't fully overlap, but there's interesting crossover."
    else:
        label = "Musical Opposites"
        description = "You live on opposite ends of the genre map. That can be a good thing."

    return {"score": score, "label": label, "description": description}


def build_profile(tracks: list[dict], top_artists: list[dict]) -> dict[str, Any]:
    """Run the full ML profile pipeline for a single user."""
    genre_vector = build_genre_vector(top_artists, tracks)
    total_genre_weight = sum(genre_vector.values()) or 1

    top_genres_list = [
        {
            "genre": genre,
            "count": count,
            "pct": round(count / total_genre_weight * 100, 1),
        }
        for genre, count in list(genre_vector.items())[:12]
    ]

    return {
        "archetype": get_archetype(genre_vector),
        "mainstream": mainstream_score(tracks),
        "era": era_analysis(tracks),
        "diversity": diversity_score(genre_vector),
        "top_genres": top_genres_list,
        "taste_map": taste_map(top_artists),
    }
