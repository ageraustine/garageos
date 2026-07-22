from pydantic import BaseModel
from typing import Optional


class TrustSignalsResponse(BaseModel):
    """Individual trust score signal values (0-1 scale)."""

    estimate_accuracy: float
    verification_rate: float
    timeliness: float
    quality: float


class TrustScoreResponse(BaseModel):
    """
    Trust score computation result.

    When is_building=True, score is None and the UI should show
    "Building trust - N/20 jobs" instead of a number.
    """

    score: Optional[float]  # 0-100 scale, None if building
    signals: TrustSignalsResponse
    job_count: int
    minimum_jobs: int
    is_building: bool

    class Config:
        json_schema_extra = {
            "examples": [
                {
                    "score": 87.5,
                    "signals": {
                        "estimate_accuracy": 0.95,
                        "verification_rate": 0.82,
                        "timeliness": 0.88,
                        "quality": 0.91,
                    },
                    "job_count": 45,
                    "minimum_jobs": 20,
                    "is_building": False,
                },
                {
                    "score": None,
                    "signals": {
                        "estimate_accuracy": 1.0,
                        "verification_rate": 0.75,
                        "timeliness": 1.0,
                        "quality": 1.0,
                    },
                    "job_count": 8,
                    "minimum_jobs": 20,
                    "is_building": True,
                },
            ]
        }
