from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.routes import (
    core_router,
    jobs_router,
    crm_router,
    catalog_router,
    payments_router,
    public_router,
    analytics_router,
    finance_router,
    hr_router,
    marketplace_router,
)
from app.middleware import RateLimitMiddleware
from app.services.core.rate_limiter import close_rate_limiter


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan (startup/shutdown)."""
    # Startup
    yield
    # Shutdown
    await close_rate_limiter()


app = FastAPI(
    title="GarageOS API",
    description="Trust-infrastructure platform for multi-branch auto-repair chains",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware - parse origins from config (comma-separated)
# Use "*" to allow all origins, or specify domains like:
# "http://localhost:3000,https://your-app.vercel.app"
cors_origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]

# Check if wildcard is used
allow_all_origins = "*" in cors_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all_origins else cors_origins,
    allow_credentials=not allow_all_origins,  # credentials not allowed with "*"
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting middleware (token bucket algorithm via Redis)
app.add_middleware(RateLimitMiddleware)

# Include routers by domain
app.include_router(core_router, prefix=settings.API_PREFIX)        # auth, employees, branches
app.include_router(jobs_router, prefix=settings.API_PREFIX)        # jobs, estimates, media
app.include_router(crm_router, prefix=settings.API_PREFIX)         # customers, vehicles
app.include_router(catalog_router, prefix=settings.API_PREFIX)     # services, quotation
app.include_router(payments_router, prefix=settings.API_PREFIX)    # payments, mpesa
app.include_router(public_router, prefix=settings.API_PREFIX)      # link, garages (public)
app.include_router(analytics_router, prefix=settings.API_PREFIX)   # analytics, trust_score
app.include_router(finance_router, prefix=settings.API_PREFIX)     # expenses
app.include_router(hr_router, prefix=settings.API_PREFIX)          # HR module
app.include_router(marketplace_router, prefix=settings.API_PREFIX) # marketplace


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
