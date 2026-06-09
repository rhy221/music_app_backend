from __future__ import annotations
from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

from ..domain.entities import FeedbackAction, ProfileStrength


class TrackRecItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    track_id: str = Field(alias="trackId")
    title: str
    genre: str
    cover_url: Optional[str] = Field(None, alias="coverUrl")
    play_count: int = Field(alias="playCount")
    score: float
    reason: str = ""


class RecommendationsResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    items: List[TrackRecItem]
    total: int
    generated_at: str = Field(alias="generatedAt")
    expires_at: str = Field(alias="expiresAt")
    algorithm: str


class DiscoverWeeklyResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    playlist_id: str = Field(alias="playlistId")
    title: str
    description: str
    items: List[TrackRecItem]
    total: int
    generated_at: str = Field(alias="generatedAt")
    refreshes_at: str = Field(alias="refreshesAt")


class SimilarTracksResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    source_track_id: str = Field(alias="sourceTrackId")
    items: List[TrackRecItem]
    total: int


class RadioResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    seed_track_id: str = Field(alias="seedTrackId")
    items: List[TrackRecItem]
    total: int


class FeedbackRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    track_id: str = Field(alias="trackId")
    action: Literal["LIKE", "DISLIKE", "SKIP", "SAVE_TO_PLAYLIST"]
    context: Optional[str] = None


class GenreWeightItem(BaseModel):
    genre: str
    weight: float


class ArtistWeightItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    artist_id: str = Field(alias="artistId")
    name: str
    play_count: int = Field(alias="playCount")


class TasteProfileResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    user_id: str = Field(alias="userId")
    genre_weights: List[GenreWeightItem] = Field(alias="genreWeights")
    top_artists: List[ArtistWeightItem] = Field(alias="topArtists")
    total_plays: int = Field(alias="totalPlays")
    total_listening_ms: int = Field(alias="totalListeningMs")
    profile_strength: ProfileStrength = Field(alias="profileStrength")
    updated_at: datetime = Field(alias="updatedAt")
