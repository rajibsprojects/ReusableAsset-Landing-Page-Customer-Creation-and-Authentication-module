from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from core.config import settings

APP_TZ = ZoneInfo(settings.APP_TIMEZONE)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def to_app_tz(dt) -> datetime | None:
    if not dt:
        return None
    if isinstance(dt, str):
        dt = datetime.fromisoformat(dt)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(APP_TZ)


def format_app_time(dt) -> str:
    local = to_app_tz(dt)
    return f"{local.strftime('%Y-%m-%d %H:%M:%S')} {settings.APP_TIMEZONE_LABEL}" if local else ""
