from __future__ import annotations
from dataclasses import asdict
from datetime import datetime
from typing import Optional
import json

from ..config import Settings
from ..domain.entities import FeedbackAction, TasteProfile, TrackRec
from ..domain.ports import ICacheService, IGraphRepository


class RecommendationService:
    def __init__(
        self,
        repo: IGraphRepository,
        cache: ICacheService,
        cfg: Settings,
    ) -> None:
        self._repo = repo
        self._cache = cache
        self._cfg = cfg

    # ── Recommendations ────────────────────────────────────────────────────────

    async def get_recommendations(
        self,
        user_id: str,
        limit: int,
        genre: Optional[str],
    ) -> dict:
        cache_key = f"recs:{user_id}"
        cached = await self._cache.get(cache_key)
        if cached:
            return json.loads(cached)

        listen_count = await self._repo.count_user_listens(user_id)
        if listen_count < self._cfg.cold_start_threshold:
            tracks = await self._repo.get_popular_tracks(limit)
            model = "popular-fallback"
        else:
            tracks = await self._repo.get_collaborative_recs(user_id, limit)
            model = "collaborative-filtering-v2"

        if genre:
            tracks = [t for t in tracks if t.genre.upper() == genre.upper()]

        result = {
            "items": [_track_to_dict(t) for t in tracks],
            "total": len(tracks),
            "generatedAt": datetime.utcnow().isoformat() + "Z",
            "expiresAt": _expires_iso(self._cfg.rec_cache_ttl),
            "algorithm": model,
        }
        await self._cache.set(cache_key, json.dumps(result), self._cfg.rec_cache_ttl)
        return result

    async def get_discover_weekly(self, user_id: str) -> dict:
        cache_key = f"discover-weekly:{user_id}"
        cached = await self._cache.get(cache_key)
        if cached:
            return json.loads(cached)

        tracks = await self._repo.get_discover_weekly(user_id, limit=30)
        result = {
            "playlistId": f"discover-weekly-{user_id}",
            "title": "Discover Weekly",
            "description": "Your personalized weekly playlist",
            "items": [_track_to_dict(t) for t in tracks],
            "total": len(tracks),
            "generatedAt": datetime.utcnow().isoformat() + "Z",
            "refreshesAt": _expires_iso(self._cfg.discover_cache_ttl),
        }
        await self._cache.set(cache_key, json.dumps(result), self._cfg.discover_cache_ttl)
        return result

    async def get_similar_tracks(self, track_id: str, limit: int) -> dict:
        tracks = await self._repo.get_similar_tracks(track_id, limit)
        return {
            "sourceTrackId": track_id,
            "items": [_track_to_dict(t) for t in tracks],
            "total": len(tracks),
        }

    async def get_radio(self, track_id: str, limit: int) -> dict:
        tracks = await self._repo.get_radio_tracks(track_id, limit)
        return {
            "seedTrackId": track_id,
            "items": [_track_to_dict(t) for t in tracks],
            "total": len(tracks),
        }

    # ── Taste profile ──────────────────────────────────────────────────────────

    async def get_taste_profile(self, user_id: str) -> TasteProfile:
        return await self._repo.get_taste_profile(user_id)

    async def refresh_taste_profile(self, user_id: str) -> None:
        await self._cache.delete(f"recs:{user_id}", f"discover-weekly:{user_id}")

    # ── Feedback ───────────────────────────────────────────────────────────────

    async def record_feedback(
        self, user_id: str, track_id: str, action: FeedbackAction
    ) -> None:
        await self._repo.record_feedback(user_id, track_id, action)
        # Invalidate personal recommendations so next request reflects the feedback
        await self._cache.delete(f"recs:{user_id}")


# ── Helpers ────────────────────────────────────────────────────────────────────

def _track_to_dict(t: TrackRec) -> dict:
    return {
        "trackId": t.id,
        "title": t.title,
        "genre": t.genre,
        "coverUrl": t.cover_url,
        "playCount": t.play_count,
        "score": t.score,
        "reason": t.reason,
    }


def _expires_iso(ttl_seconds: int) -> str:
    from datetime import timedelta
    return (datetime.utcnow() + timedelta(seconds=ttl_seconds)).isoformat() + "Z"
