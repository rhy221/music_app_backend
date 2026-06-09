"""HTTP-level integration tests using TestClient with mocked DI container."""
import json
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from recommend_service.domain.entities import FeedbackAction, TrackRec
from recommend_service.application.recommendation_service import RecommendationService


USER_HEADER = {"X-User-Id": "user-1"}


class TestGetRecommendations:
    def test_requires_user_id_header(self, client: TestClient):
        resp = client.get("/api/v1/recommendations")
        assert resp.status_code == 422

    def test_returns_200_with_header(self, client: TestClient):
        resp = client.get("/api/v1/recommendations", headers=USER_HEADER)
        assert resp.status_code == 200
        body = resp.json()
        assert "items" in body
        assert body["algorithm"] == "collaborative-filtering-v2"

    def test_cold_start_uses_popular_fallback(
        self,
        mock_graph_repo: AsyncMock,
        mock_cache: AsyncMock,
        rec_service: RecommendationService,
        client: TestClient,
    ):
        mock_graph_repo.count_user_listens.return_value = 3  # below threshold=10
        resp = client.get("/api/v1/recommendations", headers=USER_HEADER)
        assert resp.status_code == 200
        assert resp.json()["algorithm"] == "popular-fallback"
        mock_graph_repo.get_popular_tracks.assert_called_once()
        mock_graph_repo.get_collaborative_recs.assert_not_called()

    def test_cache_hit_skips_neo4j(
        self,
        mock_graph_repo: AsyncMock,
        mock_cache: AsyncMock,
        client: TestClient,
    ):
        cached_payload = json.dumps({
            "items": [],
            "total": 0,
            "generatedAt": "2025-01-01T00:00:00Z",
            "expiresAt": "2025-01-01T00:30:00Z",
            "algorithm": "collaborative-filtering-v2",
        })
        mock_cache.get.return_value = cached_payload
        resp = client.get("/api/v1/recommendations", headers=USER_HEADER)
        assert resp.status_code == 200
        mock_graph_repo.count_user_listens.assert_not_called()
        mock_graph_repo.get_collaborative_recs.assert_not_called()

    def test_genre_filter_applied(
        self,
        mock_graph_repo: AsyncMock,
        client: TestClient,
    ):
        resp = client.get("/api/v1/recommendations?genre=POP", headers=USER_HEADER)
        assert resp.status_code == 200
        for item in resp.json()["items"]:
            assert item["genre"] == "POP"


class TestDiscoverWeekly:
    def test_requires_user_id(self, client: TestClient):
        resp = client.get("/api/v1/recommendations/discover-weekly")
        assert resp.status_code == 422

    def test_returns_playlist(self, client: TestClient):
        resp = client.get("/api/v1/recommendations/discover-weekly", headers=USER_HEADER)
        assert resp.status_code == 200
        body = resp.json()
        assert "playlistId" in body
        assert "refreshesAt" in body


class TestSimilarTracks:
    def test_public_no_auth_required(self, client: TestClient):
        resp = client.get("/api/v1/recommendations/similar/track-abc")
        assert resp.status_code == 200

    def test_returns_similar(self, client: TestClient):
        resp = client.get("/api/v1/recommendations/similar/track-abc")
        body = resp.json()
        assert body["sourceTrackId"] == "track-abc"
        assert "items" in body


class TestRadioMode:
    def test_requires_user_id(self, client: TestClient):
        resp = client.get("/api/v1/recommendations/radio/track-abc")
        assert resp.status_code == 422

    def test_returns_radio_tracks(self, client: TestClient):
        resp = client.get("/api/v1/recommendations/radio/track-abc", headers=USER_HEADER)
        assert resp.status_code == 200
        body = resp.json()
        assert body["seedTrackId"] == "track-abc"


class TestFeedback:
    def test_requires_user_id(self, client: TestClient):
        resp = client.post("/api/v1/recommendations/feedback", json={"trackId": "t1", "action": "LIKE"})
        assert resp.status_code == 422

    def test_feedback_invalidates_cache(
        self,
        mock_graph_repo: AsyncMock,
        mock_cache: AsyncMock,
        client: TestClient,
    ):
        resp = client.post(
            "/api/v1/recommendations/feedback",
            headers=USER_HEADER,
            json={"trackId": "t1", "action": "LIKE"},
        )
        assert resp.status_code == 202
        mock_graph_repo.record_feedback.assert_called_once_with(
            "user-1", "t1", FeedbackAction.LIKE
        )
        mock_cache.delete.assert_called()

    def test_feedback_dislike(self, mock_graph_repo: AsyncMock, client: TestClient):
        resp = client.post(
            "/api/v1/recommendations/feedback",
            headers=USER_HEADER,
            json={"trackId": "t1", "action": "DISLIKE"},
        )
        assert resp.status_code == 202
        mock_graph_repo.record_feedback.assert_called_once_with(
            "user-1", "t1", FeedbackAction.DISLIKE
        )


class TestTasteProfile:
    def test_requires_user_id(self, client: TestClient):
        resp = client.get("/api/v1/taste-profile")
        assert resp.status_code == 422

    def test_returns_profile(self, client: TestClient):
        resp = client.get("/api/v1/taste-profile", headers=USER_HEADER)
        assert resp.status_code == 200
        body = resp.json()
        assert body["userId"] == "user-1"
        assert "genreWeights" in body
        assert "topArtists" in body
        assert "profileStrength" in body

    def test_refresh_returns_202(self, mock_cache: AsyncMock, client: TestClient):
        resp = client.post("/api/v1/taste-profile/refresh", headers=USER_HEADER)
        assert resp.status_code == 202
        mock_cache.delete.assert_called_once_with("recs:user-1", "discover-weekly:user-1")
