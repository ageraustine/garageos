from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.routes import auth, customers, vehicles, jobs, estimates, media, payments, link, services, employees, mpesa_callback, quotation, branches, trust_score, analytics, expenses
from app.api.routes.hr import router as hr_router

app = FastAPI(
    title="GarageOS API",
    description="Trust-infrastructure platform for multi-branch auto-repair chains",
    version="0.1.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(customers.router, prefix=settings.API_PREFIX)
app.include_router(vehicles.router, prefix=settings.API_PREFIX)
app.include_router(jobs.router, prefix=settings.API_PREFIX)
app.include_router(estimates.router, prefix=settings.API_PREFIX)
app.include_router(media.router, prefix=settings.API_PREFIX)
app.include_router(payments.router, prefix=settings.API_PREFIX)
app.include_router(link.router, prefix=settings.API_PREFIX)
app.include_router(services.router, prefix=settings.API_PREFIX)
app.include_router(employees.router, prefix=settings.API_PREFIX)
app.include_router(mpesa_callback.router, prefix=settings.API_PREFIX)
app.include_router(quotation.router, prefix=settings.API_PREFIX)
app.include_router(branches.router, prefix=settings.API_PREFIX)
app.include_router(trust_score.router, prefix=settings.API_PREFIX)
app.include_router(analytics.router, prefix=settings.API_PREFIX)
app.include_router(expenses.router, prefix=settings.API_PREFIX)
app.include_router(hr_router, prefix=settings.API_PREFIX)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
