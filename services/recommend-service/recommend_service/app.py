from fastapi import FastAPI, Path, Query
from typing import Optional

app = FastAPI(
    title="Recommend Service",
    version="1.0.0",
    description="Music recommendation service mock",
)

MOCK_TRACKS = [
    {
        "trackId": "track-001",
        "title": "Starlight Serenade",
        "artist": {"artistId": "artist-001", "displayName": "Luna Echo"},
        "duration": 215,
        "genre": "POP",
        "score": 0.97,
        "reason": "Based on your listening history",
    },
    {
        "trackId": "track-002",
        "title": "Ocean Waves",
        "artist": {"artistId": "artist-002", "displayName": "Deep Blue"},
        "duration": 198,
        "genre": "AMBIENT",
        "score": 0.91,
        "reason": "Trending in your area",
    },
    {
        "trackId": "track-003",
        "title": "City Lights",
        "artist": {"artistId": "artist-003", "displayName": "Urban Sound"},
        "duration": 232,
        "genre": "ELECTRONIC",
        "score": 0.88,
        "reason": "Similar to songs you like",
    },
]


@app.get("/api/v1/recommendations")
def get_recommendations(
    limit: int = Query(20, ge=1, le=100),
    genre: Optional[str] = None,
):
    items = MOCK_TRACKS[:limit]
    if genre:
        items = [t for t in items if t["genre"] == genre.upper()]
    return {
        "items": items,
        "total": len(items),
        "generatedAt": "2024-06-05T08:00:00Z",
        "model": "collaborative-filtering-v2",
    }


@app.get("/api/v1/recommendations/discover-weekly")
def discover_weekly():
    return {
        "playlistId": "discover-weekly-user-001",
        "title": "Discover Weekly",
        "description": "Your personalized weekly playlist",
        "items": MOCK_TRACKS,
        "total": len(MOCK_TRACKS),
        "refreshesAt": "2024-06-10T00:00:00Z",
    }


@app.get("/api/v1/recommendations/similar/{track_id}")
def similar_tracks(
    track_id: str = Path(..., description="Track ID to find similar tracks for"),
    limit: int = Query(10, ge=1, le=50),
):
    similar = [t for t in MOCK_TRACKS if t["trackId"] != track_id][:limit]
    return {
        "sourceTrackId": track_id,
        "items": similar,
        "total": len(similar),
    }


@app.get("/api/v1/recommendations/radio/{track_id}")
def radio_mode(
    track_id: str = Path(..., description="Seed track for radio"),
    limit: int = Query(20, ge=1, le=50),
):
    return {
        "seedTrackId": track_id,
        "items": MOCK_TRACKS[:limit],
        "total": len(MOCK_TRACKS[:limit]),
    }


@app.get("/api/v1/taste-profile")
def get_taste_profile():
    return {
        "userId": "user-001",
        "topGenres": [
            {"genre": "POP", "weight": 0.45},
            {"genre": "ELECTRONIC", "weight": 0.30},
            {"genre": "AMBIENT", "weight": 0.25},
        ],
        "topArtists": [
            {"artistId": "artist-001", "displayName": "Luna Echo", "playCount": 142},
            {"artistId": "artist-002", "displayName": "Deep Blue", "playCount": 98},
        ],
        "updatedAt": "2024-06-04T00:00:00Z",
    }


@app.post("/api/v1/taste-profile/refresh")
def refresh_taste_profile():
    return {"success": True, "message": "Taste profile rebuild queued", "estimatedTime": "5 minutes"}


@app.post("/api/v1/recommendations/feedback")
def submit_feedback(feedback: dict):
    return {"success": True, "feedbackId": "feedback-" + feedback.get("trackId", "unknown")}
