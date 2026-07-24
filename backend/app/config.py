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

    # Africa's Talking SMS
    AT_USERNAME: str = ""  # Africa's Talking username
    AT_API_KEY: str = ""  # Africa's Talking API key
    AT_SENDER_ID: str = ""  # Optional: Alphanumeric sender ID (e.g., "GarageOS")
    AT_ENVIRONMENT: str = "sandbox"  # "sandbox" or "production"

    # Frontend URL (for magic links in SMS)
    FRONTEND_URL: str = "http://localhost:3000"

    # CORS - comma-separated list of allowed origins
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Email (SMTP) - Zoho Mail
    SMTP_HOST: str = "smtp.zoho.com"
    SMTP_PORT: int = 587  # Use 587 with TLS or 465 with SSL
    SMTP_USER: str = "platform@garageos.africa"
    SMTP_PASSWORD: str = ""  # Set in .env
    SMTP_FROM_EMAIL: str = "platform@garageos.africa"
    SMTP_FROM_NAME: str = "GarageOS"
    SMTP_TLS: bool = True  # TLS for port 587
    SMTP_SSL: bool = False  # Set True if using port 465
    EMAIL_VERIFICATION_EXPIRE_HOURS: int = 24

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
