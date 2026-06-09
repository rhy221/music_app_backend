from __future__ import annotations
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query

from ...application.recommendation_service import RecommendationService
from ...dependencies import get_rec_service, require_user_id
from ...domain.entities import FeedbackAction
from ..schemas import (
    DiscoverWeeklyResponse,
    FeedbackRequest,
    RadioResponse,
    RecommendationsResponse,
    SimilarTracksResponse,
    TrackRecItem,
)

router = APIRouter(prefix="/api/v1/recommendations", tags=["recommendations"])


@router.get("", response_model=RecommendationsResponse)
async def get_recommendations(
    user_id: Annotated[str, Depends(require_user_id)],
    svc: Annotated[RecommendationService, Depends(get_rec_service)],
    limit: int = Query(20, ge=1, le=100),
    genre: Optional[str] = None,
    seed: Optional[str] = None,
):
    data = await svc.get_recommendations(user_id, limit, genre)
    return RecommendationsResponse(
        items=[TrackRecItem(**_remap(item)) for item in data["items"]],
        total=data["total"],
        generatedAt=data["generatedAt"],
        expiresAt=data["expiresAt"],
        algorithm=data["algorithm"],
    )


@router.get("/discover-weekly", response_model=DiscoverWeeklyResponse)
async def discover_weekly(
    user_id: Annotated[str, Depends(require_user_id)],
    svc: Annotated[RecommendationService, Depends(get_rec_service)],
):
    data = await svc.get_discover_weekly(user_id)
    return DiscoverWeeklyResponse(
        playlistId=data["playlistId"],
        title=data["title"],
        description=data["description"],
        items=[TrackRecItem(**_remap(item)) for item in data["items"]],
        total=data["total"],
        generatedAt=data["generatedAt"],
        refreshesAt=data["refreshesAt"],
    )


@router.get("/similar/{track_id}", response_model=SimilarTracksResponse)
async def similar_tracks(
    track_id: str,
    svc: Annotated[RecommendationService, Depends(get_rec_service)],
    limit: int = Query(10, ge=1, le=50),
):
    data = await svc.get_similar_tracks(track_id, limit)
    return SimilarTracksResponse(
        sourceTrackId=data["sourceTrackId"],
        items=[TrackRecItem(**_remap(item)) for item in data["items"]],
        total=data["total"],
    )


@router.get("/radio/{track_id}", response_model=RadioResponse)
async def radio_mode(
    track_id: str,
    user_id: Annotated[str, Depends(require_user_id)],
    svc: Annotated[RecommendationService, Depends(get_rec_service)],
    limit: int = Query(25, ge=1, le=50),
):
    data = await svc.get_radio(track_id, limit)
    return RadioResponse(
        seedTrackId=data["seedTrackId"],
        items=[TrackRecItem(**_remap(item)) for item in data["items"]],
        total=data["total"],
    )


@router.post("/feedback", status_code=202)
async def submit_feedback(
    body: FeedbackRequest,
    user_id: Annotated[str, Depends(require_user_id)],
    svc: Annotated[RecommendationService, Depends(get_rec_service)],
):
    action = FeedbackAction(body.action)
    await svc.record_feedback(user_id, body.track_id, action)
    return {"success": True, "feedbackId": f"feedback-{body.track_id}"}


def _remap(item: dict) -> dict:
    return {
        "trackId": item["trackId"],
        "title": item["title"],
        "genre": item["genre"],
        "coverUrl": item.get("coverUrl"),
        "playCount": item["playCount"],
        "score": item["score"],
        "reason": item.get("reason", ""),
    }
