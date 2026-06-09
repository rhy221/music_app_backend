from __future__ import annotations
import asyncio
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import aio_pika
import redis.asyncio as aioredis
from fastapi import FastAPI
from neo4j import AsyncGraphDatabase

from .config import Settings
from .container import Container
from .application.recommendation_service import RecommendationService
from .infrastructure.neo4j_repository import Neo4jGraphRepository
from .infrastructure.redis_service import RedisService
from .infrastructure.messaging.consumers import CatalogConsumer, StreamingConsumer, UserConsumer
from .presentation.routers.recommendations import router as recommendations_router
from .presentation.routers.taste_profile import router as taste_profile_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    cfg = Settings()

    neo4j_driver = AsyncGraphDatabase.driver(
        cfg.neo4j_uri,
        auth=(cfg.neo4j_user, cfg.neo4j_password),
    )
    redis_client = aioredis.from_url(cfg.redis_url, decode_responses=True)
    rabbitmq_conn = await aio_pika.connect_robust(cfg.rabbitmq_url)

    graph_repo = Neo4jGraphRepository(neo4j_driver, cfg)
    cache_svc = RedisService(redis_client)
    rec_svc = RecommendationService(graph_repo, cache_svc, cfg)

    consumers = [
        StreamingConsumer(rabbitmq_conn, graph_repo),
        CatalogConsumer(rabbitmq_conn, graph_repo),
        UserConsumer(rabbitmq_conn, graph_repo),
    ]
    consumer_tasks = [asyncio.create_task(c.start()) for c in consumers]

    app.state.container = Container(
        neo4j_driver=neo4j_driver,
        redis_client=redis_client,
        rabbitmq_connection=rabbitmq_conn,
        graph_repo=graph_repo,
        cache_service=cache_svc,
        rec_service=rec_svc,
    )

    logger.info("Recommend service started on port %d", cfg.port)
    yield

    logger.info("Shutting down recommend service…")
    for task in consumer_tasks:
        task.cancel()
    await asyncio.gather(*consumer_tasks, return_exceptions=True)
    await rabbitmq_conn.close()
    await redis_client.aclose()
    await neo4j_driver.close()


app = FastAPI(
    title="Recommend Service",
    version="1.0.0",
    description="Graph-based music recommendation service",
    lifespan=lifespan,
)

app.include_router(recommendations_router)
app.include_router(taste_profile_router)
