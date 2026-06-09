from __future__ import annotations
import logging
from datetime import datetime
from typing import Optional

from neo4j import AsyncDriver
from graphdatascience import GraphDataScience

from music_events.models import TrackPlayedData, TrackPublishedData, UserFollowedData

from ..config import Settings
from ..domain.entities import (
    ArtistWeight,
    FeedbackAction,
    GenreWeight,
    ProfileStrength,
    TasteProfile,
    TrackRec,
)

logger = logging.getLogger(__name__)

_FEEDBACK_QUERIES: dict[FeedbackAction, Optional[str]] = {
    FeedbackAction.LIKE: "MERGE (u)-[:SAVED]->(t)",
    FeedbackAction.SAVE_TO_PLAYLIST: "MERGE (u)-[:SAVED]->(t)",
    FeedbackAction.DISLIKE: "MERGE (u)-[:DISLIKED]->(t)",
    FeedbackAction.SKIP: None,
}


def _to_track_rec(record: dict, score: float = 0.0, reason: str = "") -> TrackRec:
    t = record.get("t") or record.get("rec") or record.get("similar") or record
    if hasattr(t, "items"):
        data = dict(t)
    else:
        data = t
    return TrackRec(
        id=data.get("id", ""),
        title=data.get("title", ""),
        genre=data.get("genre", ""),
        cover_url=data.get("coverUrl"),
        play_count=data.get("playCount", 0),
        score=score,
        reason=reason,
    )


class Neo4jGraphRepository:
    def __init__(self, driver: AsyncDriver, cfg: Settings) -> None:
        self._driver = driver
        self._cfg = cfg

    async def count_user_listens(self, user_id: str) -> int:
        async with self._driver.session() as session:
            result = await session.run(
                "MATCH (u:User {id: $userId})-[:LISTENED]->() RETURN COUNT(*) AS cnt",
                userId=user_id,
            )
            record = await result.single()
            return record["cnt"] if record else 0

    async def get_popular_tracks(self, limit: int) -> list[TrackRec]:
        async with self._driver.session() as session:
            result = await session.run(
                "MATCH (t:Track) RETURN t ORDER BY t.playCount DESC LIMIT $limit",
                limit=limit,
            )
            records = await result.data()
            return [_to_track_rec(r, reason="Popular track") for r in records]

    async def get_collaborative_recs(self, user_id: str, limit: int) -> list[TrackRec]:
        async with self._driver.session() as session:
            result = await session.run(
                """
                MATCH (me:User {id: $userId})-[:LISTENED]->(t)<-[:LISTENED]-(other:User)
                      -[:LISTENED]->(rec:Track)
                WHERE NOT (me)-[:LISTENED]->(rec)
                  AND NOT (me)-[:DISLIKED]->(rec)
                  AND me <> other
                WITH rec, COUNT(DISTINCT other) AS score
                ORDER BY score DESC LIMIT $limit
                RETURN rec {.id, .title, .genre, .coverUrl, .playCount}, score
                """,
                userId=user_id,
                limit=limit,
            )
            records = await result.data()
            return [
                _to_track_rec(r, score=r.get("score", 0.0), reason="Based on listeners like you")
                for r in records
            ]

    async def get_discover_weekly(self, user_id: str, limit: int) -> list[TrackRec]:
        try:
            return await self._get_discover_weekly_gds(user_id, limit)
        except Exception as exc:
            logger.warning("GDS nodeSimilarity failed, falling back to Cypher: %s", exc)
            return await self._get_discover_weekly_cypher(user_id, limit)

    async def _get_discover_weekly_gds(self, user_id: str, limit: int) -> list[TrackRec]:
        # GDS requires a synchronous bolt connection — use the underlying URI/creds
        gds = GraphDataScience(
            self._cfg.neo4j_uri,
            auth=(self._cfg.neo4j_user, self._cfg.neo4j_password),
        )
        try:
            graph_name = "music-graph"
            exists_result = gds.graph.exists(graph_name)
            if not exists_result["exists"]:
                gds.graph.project(
                    graph_name,
                    ["User", "Track"],
                    {"LISTENED": {"orientation": "UNDIRECTED"}},
                )

            similarity_df = gds.nodeSimilarity.stream(graph_name, topK=10)
            # similarity_df columns: node1, node2, similarity
            # Resolve user's node id
            async with self._driver.session() as session:
                res = await session.run(
                    "MATCH (u:User {id: $userId}) RETURN id(u) AS nid", userId=user_id
                )
                rec = await res.single()
                if not rec:
                    return []
                user_node_id = rec["nid"]

            similar_node_ids = (
                similarity_df[similarity_df["node1"] == user_node_id]["node2"]
                .head(10)
                .tolist()
            )
            if not similar_node_ids:
                return []

            async with self._driver.session() as session:
                result = await session.run(
                    """
                    UNWIND $nodeIds AS nid
                    MATCH (other) WHERE id(other) = nid
                    MATCH (other)-[:LISTENED]->(rec:Track)
                    WHERE NOT (:User {id: $userId})-[:LISTENED]->(rec)
                      AND NOT (:User {id: $userId})-[:DISLIKED]->(rec)
                    WITH rec, COUNT(DISTINCT other) AS score
                    ORDER BY score DESC LIMIT $limit
                    RETURN rec {.id, .title, .genre, .coverUrl, .playCount}, score
                    """,
                    nodeIds=similar_node_ids,
                    userId=user_id,
                    limit=limit,
                )
                records = await result.data()
                return [
                    _to_track_rec(r, score=r.get("score", 0.0), reason="Discover Weekly")
                    for r in records
                ]
        finally:
            gds.close()

    async def _get_discover_weekly_cypher(self, user_id: str, limit: int) -> list[TrackRec]:
        async with self._driver.session() as session:
            result = await session.run(
                """
                MATCH (me:User {id: $userId})-[:LISTENED]->(common:Track)<-[:LISTENED]-(other:User)
                MATCH (other)-[:LISTENED]->(rec:Track)
                WHERE NOT (me)-[:LISTENED]->(rec)
                  AND NOT (me)-[:DISLIKED]->(rec)
                  AND me <> other
                WITH rec, COUNT(DISTINCT other) AS score
                ORDER BY score DESC LIMIT $limit
                RETURN rec {.id, .title, .genre, .coverUrl, .playCount}, score
                """,
                userId=user_id,
                limit=limit,
            )
            records = await result.data()
            return [
                _to_track_rec(r, score=r.get("score", 0.0), reason="Discover Weekly")
                for r in records
            ]

    async def get_similar_tracks(self, track_id: str, limit: int) -> list[TrackRec]:
        async with self._driver.session() as session:
            result = await session.run(
                """
                MATCH (seed:Track {id: $trackId})<-[:LISTENED]-(u:User)-[:LISTENED]->(similar:Track)
                WHERE seed <> similar
                WITH similar, COUNT(DISTINCT u) AS coListenScore
                OPTIONAL MATCH (seed)-[:IN_GENRE]->(g:Genre)<-[:IN_GENRE]-(similar)
                WITH similar, coListenScore, COUNT(g) AS genreMatch
                RETURN similar {.id, .title, .genre, .coverUrl, .playCount},
                       coListenScore + genreMatch * 2 AS score
                ORDER BY score DESC LIMIT $limit
                """,
                trackId=track_id,
                limit=limit,
            )
            records = await result.data()
            return [
                _to_track_rec(
                    {"t": r["similar"]}, score=r.get("score", 0.0), reason="Similar to this track"
                )
                for r in records
            ]

    async def get_radio_tracks(self, track_id: str, limit: int) -> list[TrackRec]:
        async with self._driver.session() as session:
            result = await session.run(
                """
                MATCH (seed:Track {id: $trackId})-[:IN_GENRE]->(g:Genre)<-[:IN_GENRE]-(t:Track)
                WHERE seed <> t
                WITH t, COUNT(DISTINCT g) AS genreOverlap
                OPTIONAL MATCH (seed)<-[:LISTENED]-(u:User)-[:LISTENED]->(t)
                WITH t, genreOverlap, COUNT(DISTINCT u) AS coListeners
                RETURN t {.id, .title, .genre, .coverUrl, .playCount},
                       genreOverlap * 2 + coListeners AS score
                ORDER BY rand() LIMIT $limit
                """,
                trackId=track_id,
                limit=limit,
            )
            records = await result.data()
            return [_to_track_rec(r, score=r.get("score", 0.0), reason="Radio") for r in records]

    async def get_taste_profile(self, user_id: str) -> TasteProfile:
        async with self._driver.session() as session:
            genre_result = await session.run(
                """
                MATCH (me:User {id: $userId})-[r:LISTENED]->(t:Track)-[:IN_GENRE]->(g:Genre)
                RETURN g.name AS genre, SUM(r.times) AS cnt
                ORDER BY cnt DESC
                """,
                userId=user_id,
            )
            genre_records = await genre_result.data()

            artist_result = await session.run(
                """
                MATCH (me:User {id: $userId})-[r:LISTENED]->(t:Track)-[:BY]->(a:Artist)
                RETURN a.id AS artistId, a.name AS artistName, SUM(r.times) AS cnt
                ORDER BY cnt DESC LIMIT 10
                """,
                userId=user_id,
            )
            artist_records = await artist_result.data()

            stats_result = await session.run(
                """
                MATCH (me:User {id: $userId})-[r:LISTENED]->()
                RETURN SUM(r.times) AS totalPlays, SUM(r.totalMs) AS totalMs
                """,
                userId=user_id,
            )
            stats = await stats_result.single()

        total_plays = int(stats["totalPlays"] or 0) if stats else 0
        total_ms = int(stats["totalMs"] or 0) if stats else 0

        total_genre_cnt = sum(r["cnt"] for r in genre_records) or 1
        genre_weights = [
            GenreWeight(genre=r["genre"], weight=round(r["cnt"] / total_genre_cnt, 4))
            for r in genre_records
        ]
        top_artists = [
            ArtistWeight(artist_id=r["artistId"], name=r["artistName"], play_count=r["cnt"])
            for r in artist_records
        ]

        if total_plays < 20:
            strength = ProfileStrength.WEAK
        elif total_plays <= 100:
            strength = ProfileStrength.MODERATE
        else:
            strength = ProfileStrength.STRONG

        return TasteProfile(
            user_id=user_id,
            genre_weights=genre_weights,
            top_artists=top_artists,
            total_plays=total_plays,
            total_listening_ms=total_ms,
            profile_strength=strength,
            updated_at=datetime.utcnow(),
        )

    async def record_feedback(self, user_id: str, track_id: str, action: FeedbackAction) -> None:
        cypher = _FEEDBACK_QUERIES.get(action)
        if not cypher:
            return
        async with self._driver.session() as session:
            await session.run(
                f"""
                MERGE (u:User {{id: $userId}})
                MERGE (t:Track {{id: $trackId}})
                {cypher}
                """,
                userId=user_id,
                trackId=track_id,
            )

    async def merge_track_played(self, data: TrackPlayedData) -> None:
        async with self._driver.session() as session:
            await session.run(
                """
                MERGE (u:User {id: $userId})
                MERGE (t:Track {id: $trackId})
                ON CREATE SET t.title = $title, t.genre = $genre,
                              t.coverUrl = $coverUrl, t.playCount = 0
                MERGE (u)-[r:LISTENED]->(t)
                ON CREATE SET r.times = 1, r.totalMs = $durationMs,
                              r.lastPlayedAt = datetime()
                ON MATCH SET r.times = r.times + 1,
                             r.totalMs = r.totalMs + $durationMs,
                             r.lastPlayedAt = datetime()
                WITH t
                MERGE (g:Genre {name: $genre})
                MERGE (t)-[:IN_GENRE]->(g)
                WITH t, g
                MERGE (a:Artist {id: $artistId})
                ON CREATE SET a.name = $artistName
                MERGE (t)-[:BY]->(a)
                MERGE (a)-[:IN_GENRE]->(g)
                """,
                userId=data.user_id,
                trackId=data.track_id,
                title=data.track_id,  # title not in TrackPlayedData; use trackId as placeholder
                genre=data.genre,
                coverUrl=None,
                durationMs=data.duration_ms,
                artistId=data.artist_id,
                artistName=data.artist_id,
            )

    async def merge_track_published(self, data: TrackPublishedData) -> None:
        async with self._driver.session() as session:
            await session.run(
                """
                MERGE (t:Track {id: $trackId})
                SET t.title = $title, t.genre = $genre,
                    t.coverUrl = $coverUrl, t.playCount = 0
                WITH t
                MERGE (g:Genre {name: $genre})
                MERGE (t)-[:IN_GENRE]->(g)
                WITH t, g
                MERGE (a:Artist {id: $artistId})
                ON CREATE SET a.name = $artistName
                MERGE (t)-[:BY]->(a)
                MERGE (a)-[:IN_GENRE]->(g)
                """,
                trackId=data.track_id,
                title=data.title,
                genre=data.genre,
                coverUrl=data.cover_url,
                artistId=data.artist_id,
                artistName=data.artist_name,
            )

    async def merge_user_followed(self, data: UserFollowedData) -> None:
        async with self._driver.session() as session:
            await session.run(
                """
                MERGE (a:User {id: $followerId})
                MERGE (b:User {id: $followingId})
                MERGE (a)-[:FOLLOWS]->(b)
                """,
                followerId=data.follower_id,
                followingId=data.following_id,
            )
