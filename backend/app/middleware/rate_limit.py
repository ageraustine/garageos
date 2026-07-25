"""
Rate Limiting Middleware using Token Bucket algorithm.

Applies rate limiting to all incoming requests based on client IP.
Returns 429 Too Many Requests when rate limit is exceeded.
"""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from app.services.core.rate_limiter import get_rate_limiter
from app.config import settings


# Paths that should be exempt from rate limiting
EXEMPT_PATHS = {
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
    # M-Pesa callbacks are called by Safaricom, exempt them
    f"{settings.API_PREFIX}/mpesa/callback",
    f"{settings.API_PREFIX}/mpesa/timeout",
}


def get_client_ip(request: Request) -> str:
    """
    Extract client IP from request.
    Handles X-Forwarded-For header for proxied requests.
    """
    # Check X-Forwarded-For header (set by reverse proxies)
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        # Get the first IP (original client)
        return forwarded.split(",")[0].strip()

    # Check X-Real-IP (nginx)
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()

    # Fall back to direct client IP
    if request.client:
        return request.client.host

    return "unknown"


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware that applies token bucket rate limiting.

    Rate limit headers returned:
    - X-RateLimit-Limit: Maximum requests per minute
    - X-RateLimit-Remaining: Remaining tokens
    - X-RateLimit-Reset: Seconds until bucket refills
    - Retry-After: Seconds to wait before retrying (on 429)
    """

    async def dispatch(self, request: Request, call_next):
        # Skip if rate limiting is disabled
        if not settings.RATE_LIMIT_ENABLED:
            return await call_next(request)

        # Skip OPTIONS requests (CORS preflight)
        if request.method == "OPTIONS":
            return await call_next(request)

        # Skip exempt paths
        path = request.url.path
        if path in EXEMPT_PATHS:
            return await call_next(request)

        # Get client identifier
        client_ip = get_client_ip(request)

        # Use higher limits for callback endpoints
        rate_limiter = get_rate_limiter()

        # Check rate limit
        allowed, remaining = await rate_limiter.is_allowed(client_ip)

        if not allowed:
            # Calculate wait time
            wait_time = await rate_limiter.get_wait_time(client_ip)

            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Rate limit exceeded. Please slow down.",
                    "retry_after": round(wait_time, 1),
                },
                headers={
                    "X-RateLimit-Limit": str(settings.RATE_LIMIT_REQUESTS_PER_MINUTE),
                    "X-RateLimit-Remaining": "0",
                    "Retry-After": str(int(wait_time) + 1),
                },
            )

        # Proceed with request
        response = await call_next(request)

        # Add rate limit headers to response
        response.headers["X-RateLimit-Limit"] = str(settings.RATE_LIMIT_REQUESTS_PER_MINUTE)
        response.headers["X-RateLimit-Remaining"] = str(int(remaining))

        return response
