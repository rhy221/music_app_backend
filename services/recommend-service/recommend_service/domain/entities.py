from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional


class FeedbackAction(str, Enum):
    LIKE = "LIKE"
    DISLIKE = "DISLIKE"
    SKIP = "SKIP"
    SAVE_TO_PLAYLIST = "SAVE_TO_PLAYLIST"


class ProfileStrength(str, Enum):
    WEAK = "WEAK"
    MODERATE = "MODERATE"
    STRONG = "STRONG"


@dataclass
class TrackRec:
    id: str
    title: str
    genre: str
    cover_url: Optional[str]
    play_count: int
    score: float
    reason: str = ""


@dataclass
class GenreWeight:
    genre: str
    weight: float


@dataclass
class ArtistWeight:
    artist_id: str
    name: str
    play_count: int


@dataclass
class TasteProfile:
    user_id: str
    genre_weights: list[GenreWeight] = field(default_factory=list)
    top_artists: list[ArtistWeight] = field(default_factory=list)
    total_plays: int = 0
    total_listening_ms: int = 0
    profile_strength: ProfileStrength = ProfileStrength.WEAK
    updated_at: datetime = field(default_factory=datetime.utcnow)
