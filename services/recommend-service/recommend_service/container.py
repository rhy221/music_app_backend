from __future__ import annotations
from dataclasses import dataclass

import aio_pika
from neo4j import AsyncDriver
import redis.asyncio as aioredis

from .application.recommendation_service import RecommendationService
from .infrastructure.neo4j_repository import Neo4jGraphRepository
from .infrastructure.redis_service import RedisService


@dataclass
class Container:
    neo4j_driver: AsyncDriver
    redis_client: aioredis.Redis
    rabbitmq_connection: aio_pika.abc.AbstractRobustConnection
    graph_repo: Neo4jGraphRepository
    cache_service: RedisService
    rec_service: RecommendationService
