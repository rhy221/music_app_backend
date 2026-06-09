from __future__ import annotations
from typing import Annotated

from fastapi import APIRouter, Depends

from ...application.recommendation_service import RecommendationService
from ...dependencies import get_rec_service, require_user_id
from ..schemas import ArtistWeightItem, GenreWeightItem, TasteProfileResponse

router = APIRouter(prefix="/api/v1/taste-profile", tags=["taste-profile"])


@router.get("", response_model=TasteProfileResponse)
async def get_taste_profile(
    user_id: Annotated[str, Depends(require_user_id)],
    svc: Annotated[RecommendationService, Depends(get_rec_service)],
):
    profile = await svc.get_taste_profile(user_id)
    return TasteProfileResponse(
        userId=profile.user_id,
        genreWeights=[
            GenreWeightItem(genre=gw.genre, weight=gw.weight)
            for gw in profile.genre_weights
        ],
        topArtists=[
            ArtistWeightItem(
                artistId=aw.artist_id,
                name=aw.name,
                playCount=aw.play_count,
            )
            for aw in profile.top_artists
        ],
        totalPlays=profile.total_plays,
        totalListeningMs=profile.total_listening_ms,
        profileStrength=profile.profile_strength,
        updatedAt=profile.updated_at,
    )


@router.post("/refresh", status_code=202)
async def refresh_taste_profile(
    user_id: Annotated[str, Depends(require_user_id)],
    svc: Annotated[RecommendationService, Depends(get_rec_service)],
):
    await svc.refresh_taste_profile(user_id)
    return {"message": "Taste profile refresh queued", "estimatedMs": 5000}
