# Route modules - import routers from subfolders
from app.api.routes.core import router as core_router
from app.api.routes.jobs import router as jobs_router
from app.api.routes.crm import router as crm_router
from app.api.routes.catalog import router as catalog_router
from app.api.routes.payments import router as payments_router
from app.api.routes.public import router as public_router
from app.api.routes.analytics import router as analytics_router
from app.api.routes.finance import router as finance_router
from app.api.routes.hr import router as hr_router
from app.api.routes.marketplace import router as marketplace_router

__all__ = [
    "core_router",
    "jobs_router",
    "crm_router",
    "catalog_router",
    "payments_router",
    "public_router",
    "analytics_router",
    "finance_router",
    "hr_router",
    "marketplace_router",
]
