import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")


def _bool(value: str) -> bool:
    return str(value).strip().lower() in ("1", "true", "yes", "on")


class Settings:
    MONGO_URL: str = os.environ["MONGO_URL"]
    DB_NAME: str = os.environ["DB_NAME"]
    CORS_ORIGINS: list = [o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",") if o.strip()]
    FRONTEND_URL: str = os.environ.get("FRONTEND_URL", "").rstrip("/")

    EMAIL_PROVIDER: str = os.environ.get("EMAIL_PROVIDER", "console").lower()
    RESEND_API_KEY: str = os.environ.get("RESEND_API_KEY", "")
    SENDER_EMAIL: str = os.environ.get("SENDER_EMAIL", "")
    BUSINESS_NOTIFY_EMAIL: str = os.environ.get("BUSINESS_NOTIFY_EMAIL", "")

    CONTENT_PROVIDER: str = os.environ.get("CONTENT_PROVIDER", "auto").lower()
    GOOGLE_SHEET_ID_BUSINESS: str = os.environ.get("GOOGLE_SHEET_ID_BUSINESS", "")
    GOOGLE_SHEET_TAB_OWNER: str = os.environ.get("GOOGLE_SHEET_TAB_OWNER", "Owner_data")
    APPS_SCRIPT_URL: str = os.environ.get("APPS_SCRIPT_URL", "")
    APPS_SCRIPT_API_KEY: str = os.environ.get("APPS_SCRIPT_API_KEY", "")
    GOOGLE_SHEET_ID_CUSTOMER_MASTER: str = os.environ.get("GOOGLE_SHEET_ID_CUSTOMER_MASTER", "")
    GOOGLE_SHEET_TAB_CUSTOMER_MASTER: str = os.environ.get("GOOGLE_SHEET_TAB_CUSTOMER_MASTER", "customer_master")
    GOOGLE_SHEET_ID_CUSTOMER_SERIES: str = os.environ.get("GOOGLE_SHEET_ID_CUSTOMER_SERIES", "")
    GOOGLE_SHEET_TAB_CUSTOMER_SERIES: str = os.environ.get("GOOGLE_SHEET_TAB_CUSTOMER_SERIES", "customer_series_master")
    CUSTOMER_NO_PREFIX: str = os.environ.get("CUSTOMER_NO_PREFIX", "CUST-")
    CUSTOMER_NO_DIGITS: int = int(os.environ.get("CUSTOMER_NO_DIGITS", "6"))
    DEFAULT_COUNTRY_CODE: str = os.environ.get("DEFAULT_COUNTRY_CODE", "+91")
    APP_TIMEZONE: str = os.environ.get("APP_TIMEZONE", "Asia/Kolkata")
    APP_TIMEZONE_LABEL: str = os.environ.get("APP_TIMEZONE_LABEL", "IST")
    SESSION_IDLE_MINUTES: int = int(os.environ.get("SESSION_IDLE_MINUTES", "4"))
    CONTENT_CACHE_SECONDS: int = int(os.environ.get("CONTENT_CACHE_SECONDS", "300"))

    PINCODE_API_URL: str = os.environ.get("PINCODE_API_URL", "")
    EMERGENT_AUTH_SESSION_URL: str = os.environ.get("EMERGENT_AUTH_SESSION_URL", "")
    EXPOSE_DEV_LINKS: bool = _bool(os.environ.get("EXPOSE_DEV_LINKS", "false"))

    SEED_TEST_USER_EMAIL: str = os.environ.get("SEED_TEST_USER_EMAIL", "")
    SEED_TEST_USER_PASSWORD: str = os.environ.get("SEED_TEST_USER_PASSWORD", "")
    SEED_TEST_USER_NAME: str = os.environ.get("SEED_TEST_USER_NAME", "Test Customer")

    SESSION_DAYS: int = 7
    VERIFICATION_HOURS: int = 24
    RESET_HOURS: int = 1
    MAX_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_MINUTES: int = 15


settings = Settings()
