import asyncio
import logging
from datetime import datetime, timezone
from core.config import settings
from core.database import db
from core.timezone import format_app_time
from services.content.sheets_writer import sheets_writer

logger = logging.getLogger(__name__)

# Column order follows the functional spec "customer_master" table. Password is NEVER written.
COLUMNS = {
    "customer_no": "customer_no", "customer_name": "name", "customer_email": "email",
    "customer_contact_mbl_cntry": "contact_mobile_cntry", "customer_contact_mbl": "contact_mobile",
    "customer_contact_other_cntry": "contact_other_cntry", "customer_contact_other": "contact_other",
    "customer_address1": "address1", "customer_address2": "address2", "customer_city": "city",
    "customer_state": "state", "customer_pin": "pin", "customer_category": "category",
}


def to_row(user: dict) -> dict:
    row = {col: (user.get(field) or "") for col, field in COLUMNS.items()}
    row["auth_provider"] = user.get("auth_provider", "")
    row["created_at"] = format_app_time(user.get("registered_at") or user.get("created_at"))
    row["updated_at"] = format_app_time(user.get("updated_at") or datetime.now(timezone.utc))
    return row


class CustomerMasterService:
    """Mirrors customer records into the customer_master Google Sheet. Never blocks or fails auth flows."""

    @property
    def enabled(self) -> bool:
        return sheets_writer.configured and bool(settings.GOOGLE_SHEET_ID_CUSTOMER_MASTER)

    async def sync_user(self, user_id: str) -> bool:
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        if not user:
            return False
        if not user.get("customer_no") or not user.get("registration_complete", bool(user.get("customer_no"))):
            logger.info("customer_master sync skipped for %s (registration incomplete)", user_id)
            return False
        if not self.enabled:
            await db.users.update_one({"user_id": user_id}, {"$set": {"sheet_sync_pending": True}})
            logger.warning("customer_master sync skipped for %s (Apps Script / sheet not configured)", user.get("customer_no"))
            return False
        try:
            await sheets_writer.upsert_row(
                settings.GOOGLE_SHEET_ID_CUSTOMER_MASTER, settings.GOOGLE_SHEET_TAB_CUSTOMER_MASTER, "customer_no", to_row(user)
            )
            await db.users.update_one({"user_id": user_id}, {"$set": {"sheet_sync_pending": False, "sheet_synced_at": datetime.now(timezone.utc)}})
            logger.info("customer_master synced %s", user.get("customer_no"))
            return True
        except Exception as exc:  # noqa: BLE001
            await db.users.update_one({"user_id": user_id}, {"$set": {"sheet_sync_pending": True, "sheet_sync_error": type(exc).__name__}})
            logger.error("customer_master sync failed for %s: %s", user.get("customer_no"), exc)
            return False

    def sync_in_background(self, user_id: str) -> None:
        asyncio.create_task(self.sync_user(user_id))

    async def sync_pending(self, force: bool = False) -> dict:
        query = {"customer_no": {"$ne": None}} if force else {"customer_no": {"$ne": None}, "$or": [{"sheet_sync_pending": True}, {"sheet_synced_at": {"$exists": False}}]}
        pending = await db.users.find(query, {"_id": 0, "user_id": 1}).to_list(length=1000)
        results = [await self.sync_user(u["user_id"]) for u in pending]
        summary = {"total": len(results), "synced": sum(results), "failed": len(results) - sum(results), "enabled": self.enabled}
        logger.info("customer_master pending sync: %s", summary)
        return summary


customer_master_service = CustomerMasterService()
