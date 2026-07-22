from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://garageos:garageos@localhost:5432/garageos"

    # Security
    SECRET_KEY: str = "dev-secret-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # MinIO / S3
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "garageos"
    MINIO_SECRET_KEY: str = "garageos-secret"
    MINIO_BUCKET: str = "garageos-media"
    MINIO_SECURE: bool = False
    MINIO_PRESIGNED_EXPIRY_SECONDS: int = 3600

    # App
    DEBUG: bool = False
    API_PREFIX: str = "/api/v1"

    # M-Pesa / Daraja
    MPESA_CONSUMER_KEY: str = ""
    MPESA_CONSUMER_SECRET: str = ""
    MPESA_PASSKEY: str = ""
    MPESA_SHORTCODE: str = ""  # Paybill or Till number
    MPESA_CALLBACK_URL: str = ""  # Public URL for callbacks
    MPESA_ENVIRONMENT: str = "sandbox"  # "sandbox" or "production"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
