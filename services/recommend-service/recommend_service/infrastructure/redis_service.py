from __future__ import annotations
from typing import Optional

import redis.asyncio as aioredis


class RedisService:
    def __init__(self, client: aioredis.Redis) -> None:
        self._client = client

    async def get(self, key: str) -> Optional[str]:
        return await self._client.get(key)

    async def set(self, key: str, value: str, ttl: int) -> None:
        await self._client.setex(key, ttl, value)

    async def delete(self, *keys: str) -> None:
        if keys:
            await self._client.delete(*keys)
