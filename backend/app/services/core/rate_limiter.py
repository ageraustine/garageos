"""
Token Bucket Rate Limiter using Redis.

The token bucket algorithm:
1. Each client has a bucket with a maximum capacity (burst_size)
2. Tokens are added at a constant rate (requests_per_minute / 60 per second)
3. Each request consumes one token
4. If tokens available -> request proceeds
5. If bucket empty -> request rejected (429)

Advantages:
- Allows short bursts while enforcing average rate
- Smooth rate limiting without hard window boundaries
"""

import time
import redis.asyncio as redis
from typing import Optional
from app.config import settings


# Lua script for atomic token bucket operation
# This runs atomically on Redis, preventing race conditions
TOKEN_BUCKET_SCRIPT = """
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

-- Get current bucket state
local bucket = redis.call('HMGET', key, 'tokens', 'last_update')
local tokens = tonumber(bucket[1])
local last_update = tonumber(bucket[2])

-- Initialize bucket if it doesn't exist
if tokens == nil then
    tokens = capacity
    last_update = now
end

-- Calculate tokens to add based on elapsed time
local elapsed = now - last_update
local tokens_to_add = elapsed * refill_rate
tokens = math.min(capacity, tokens + tokens_to_add)

-- Check if we have enough tokens
if tokens >= requested then
    tokens = tokens - requested
    redis.call('HMSET', key, 'tokens', tokens, 'last_update', now)
    redis.call('EXPIRE', key, 3600)  -- Expire after 1 hour of inactivity
    return {1, tokens}  -- Allowed, remaining tokens
else
    redis.call('HMSET', key, 'tokens', tokens, 'last_update', now)
    redis.call('EXPIRE', key, 3600)
    return {0, tokens}  -- Denied, remaining tokens
end
"""


class RateLimiter:
    """Token bucket rate limiter backed by Redis."""

    def __init__(
        self,
        redis_url: str = settings.REDIS_URL,
        requests_per_minute: int = settings.RATE_LIMIT_REQUESTS_PER_MINUTE,
        burst_size: int = settings.RATE_LIMIT_BURST_SIZE,
    ):
        self.redis_url = redis_url
        self.requests_per_minute = requests_per_minute
        self.burst_size = burst_size
        self.refill_rate = requests_per_minute / 60.0  # tokens per second
        self._redis: Optional[redis.Redis] = None
        self._script_sha: Optional[str] = None

    async def _get_redis(self) -> redis.Redis:
        """Get or create Redis connection."""
        if self._redis is None:
            self._redis = redis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True,
            )
            # Load the Lua script
            self._script_sha = await self._redis.script_load(TOKEN_BUCKET_SCRIPT)
        return self._redis

    async def close(self):
        """Close Redis connection."""
        if self._redis is not None:
            await self._redis.close()
            self._redis = None
            self._script_sha = None

    def _make_key(self, identifier: str) -> str:
        """Create Redis key for the given identifier."""
        return f"rate_limit:{identifier}"

    async def is_allowed(
        self,
        identifier: str,
        tokens_requested: int = 1,
    ) -> tuple[bool, float]:
        """
        Check if request is allowed and consume tokens if so.

        Args:
            identifier: Unique identifier (e.g., IP address, user ID)
            tokens_requested: Number of tokens to consume (default 1)

        Returns:
            Tuple of (allowed: bool, remaining_tokens: float)
        """
        if not settings.RATE_LIMIT_ENABLED:
            return True, self.burst_size

        try:
            r = await self._get_redis()
            key = self._make_key(identifier)
            now = time.time()

            result = await r.evalsha(
                self._script_sha,
                1,  # number of keys
                key,
                self.burst_size,
                self.refill_rate,
                now,
                tokens_requested,
            )

            allowed = bool(int(result[0]))
            remaining = float(result[1])
            return allowed, remaining

        except redis.RedisError as e:
            # If Redis fails, allow the request (fail open)
            # Log this in production
            print(f"Rate limiter Redis error: {e}")
            return True, self.burst_size

    async def get_wait_time(self, identifier: str) -> float:
        """
        Get seconds until a token becomes available.

        Returns:
            Seconds to wait, or 0 if tokens available
        """
        if not settings.RATE_LIMIT_ENABLED:
            return 0.0

        try:
            r = await self._get_redis()
            key = self._make_key(identifier)
            bucket = await r.hgetall(key)

            if not bucket:
                return 0.0

            tokens = float(bucket.get("tokens", self.burst_size))
            if tokens >= 1:
                return 0.0

            # Calculate time until next token
            tokens_needed = 1 - tokens
            return tokens_needed / self.refill_rate

        except redis.RedisError:
            return 0.0

    async def reset(self, identifier: str):
        """Reset rate limit for an identifier (useful for testing)."""
        try:
            r = await self._get_redis()
            key = self._make_key(identifier)
            await r.delete(key)
        except redis.RedisError:
            pass


# Singleton instance
_rate_limiter: Optional[RateLimiter] = None


def get_rate_limiter() -> RateLimiter:
    """Get the global rate limiter instance."""
    global _rate_limiter
    if _rate_limiter is None:
        _rate_limiter = RateLimiter()
    return _rate_limiter


async def close_rate_limiter():
    """Close the global rate limiter (call on shutdown)."""
    global _rate_limiter
    if _rate_limiter is not None:
        await _rate_limiter.close()
        _rate_limiter = None
