from __future__ import annotations
import json
import logging
from abc import ABC, abstractmethod
from typing import Any

import aio_pika
from aio_pika import ExchangeType, IncomingMessage

from music_events import TrackPlayedEvent, TrackPublishedEvent, UserFollowedEvent
from music_events.constants import Exchanges, RoutingKeys

from ..neo4j_repository import Neo4jGraphRepository

logger = logging.getLogger(__name__)

_DLX_SUFFIX = ".dlx"


class BaseConsumer(ABC):
    EXCHANGE: str
    ROUTING_KEY: str
    QUEUE_NAME: str

    def __init__(self, connection: aio_pika.abc.AbstractRobustConnection, repo: Neo4jGraphRepository) -> None:
        self._conn = connection
        self._repo = repo

    async def start(self) -> None:
        channel = await self._conn.channel()
        await channel.set_qos(prefetch_count=10)

        dlx_name = self.EXCHANGE + _DLX_SUFFIX
        await channel.declare_exchange(dlx_name, ExchangeType.TOPIC, durable=True)

        exchange = await channel.declare_exchange(self.EXCHANGE, ExchangeType.TOPIC, durable=True)
        queue = await channel.declare_queue(
            self.QUEUE_NAME,
            durable=True,
            arguments={"x-dead-letter-exchange": dlx_name},
        )
        await queue.bind(exchange, routing_key=self.ROUTING_KEY)

        logger.info("Consumer %s listening on %s", self.__class__.__name__, self.QUEUE_NAME)
        async with queue.iterator() as messages:
            async for message in messages:  # type: IncomingMessage
                async with message.process(requeue=True):
                    try:
                        await self._handle(json.loads(message.body))
                    except Exception:
                        logger.exception(
                            "Error processing message from %s", self.QUEUE_NAME
                        )
                        raise

    @abstractmethod
    async def _handle(self, payload: dict[str, Any]) -> None:
        ...


class StreamingConsumer(BaseConsumer):
    EXCHANGE = Exchanges.STREAMING
    ROUTING_KEY = RoutingKeys.TRACK_PLAYED
    QUEUE_NAME = "recommend-service.streaming"

    async def _handle(self, payload: dict[str, Any]) -> None:
        event_type = payload.get("header", {}).get("eventType")
        if event_type != "TRACK_PLAYED":
            return
        event = TrackPlayedEvent.model_validate(payload)
        await self._repo.merge_track_played(event.data)


class CatalogConsumer(BaseConsumer):
    EXCHANGE = Exchanges.CATALOG
    ROUTING_KEY = "events.track.#"
    QUEUE_NAME = "recommend-service.catalog"

    async def _handle(self, payload: dict[str, Any]) -> None:
        event_type = payload.get("header", {}).get("eventType")
        if event_type != "TRACK_PUBLISHED":
            return
        event = TrackPublishedEvent.model_validate(payload)
        await self._repo.merge_track_published(event.data)


class UserConsumer(BaseConsumer):
    EXCHANGE = Exchanges.USER
    ROUTING_KEY = RoutingKeys.USER_FOLLOWED
    QUEUE_NAME = "recommend-service.user"

    async def _handle(self, payload: dict[str, Any]) -> None:
        event_type = payload.get("header", {}).get("eventType")
        if event_type != "USER_FOLLOWED":
            return
        event = UserFollowedEvent.model_validate(payload)
        await self._repo.merge_user_followed(event.data)
