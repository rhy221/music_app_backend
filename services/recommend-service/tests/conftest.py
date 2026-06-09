"""Unit test configuration and shared fixtures."""
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from recommend_service.app import app
from recommend_service.config import Settings
from recommend_service.application.recommendation_service import RecommendationService
from recommend_service.infrastructure.neo4j_repository import Neo4jGraphRepository
from recommend_service.infrastructure.redis_service import RedisService
from recommend_service.domain.entities import (
    ArtistWeight,
    GenreWeight,
    ProfileStrength,
    TasteProfile,
    TrackRec,
)

SAMPLE_TRACKS = [
    TrackRec(id="t1", title="Song A", genre="POP", cover_url=None, play_count=100, score=0.9, reason="Test"),
    TrackRec(id="t2", title="Song B", genre="ROCK", cover_url=None, play_count=80, score=0.7, reason="Test"),
]

SAMPLE_PROFILE = TasteProfile(
    user_id="user-1",
    genre_weights=[GenreWeight(genre="POP", weight=0.6), GenreWeight(genre="ROCK", weight=0.4)],
    top_artists=[ArtistWeight(artist_id="a1", name="Artist A", play_count=50)],
    total_plays=150,
    total_listening_ms=3600000,
    profile_strength=ProfileStrength.STRONG,
)


@pytest.fixture
def mock_graph_repo() -> AsyncMock:
    repo = AsyncMock(spec=Neo4jGraphRepository)
    repo.count_user_listens.return_value = 50
    repo.get_collaborative_recs.return_value = SAMPLE_TRACKS
    repo.get_popular_tracks.return_value = SAMPLE_TRACKS
    repo.get_discover_weekly.return_value = SAMPLE_TRACKS
    repo.get_similar_tracks.return_value = SAMPLE_TRACKS
    repo.get_radio_tracks.return_value = SAMPLE_TRACKS
    repo.get_taste_profile.return_value = SAMPLE_PROFILE
    repo.record_feedback.return_value = None
    return repo


@pytest.fixture
def mock_cache() -> AsyncMock:
    cache = AsyncMock(spec=RedisService)
    cache.get.return_value = None
    cache.set.return_value = None
    cache.delete.return_value = None
    return cache


@pytest.fixture
def rec_service(mock_graph_repo: AsyncMock, mock_cache: AsyncMock) -> RecommendationService:
    return RecommendationService(mock_graph_repo, mock_cache, Settings())


@pytest.fixture
def client(rec_service: RecommendationService) -> TestClient:
    container = MagicMock()
    container.rec_service = rec_service
    app.state.container = container
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
