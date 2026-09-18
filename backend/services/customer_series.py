import logging
from fastapi import HTTPException
from core.config import settings
from services.content.sheets_writer import sheets_writer
from services.customer_master import to_row

logger = logging.getLogger(__name__)
UNAVAILABLE = "Registration is temporarily unavailable. Please try again shortly."


class CustomerSeriesService:
    """Customer creation = one Apps Script transaction (LockService): read series -> write customer_master -> increment.
    The series number is consumed only when the customer_master row has been written successfully."""

    @property
    def configured(self) -> bool:
        return sheets_writer.configured and bool(settings.GOOGLE_SHEET_ID_CUSTOMER_SERIES) and bool(settings.GOOGLE_SHEET_ID_CUSTOMER_MASTER)

    @staticmethod
    def format_number(number: int) -> str:
        return f"{settings.CUSTOMER_NO_PREFIX}{number:0{settings.CUSTOMER_NO_DIGITS}d}"

    async def create_customer(self, user: dict) -> str:
        if not self.configured:
            logger.error("Customer creation not configured (APPS_SCRIPT_URL / GOOGLE_SHEET_ID_CUSTOMER_SERIES / GOOGLE_SHEET_ID_CUSTOMER_MASTER)")
            raise HTTPException(status_code=503, detail=UNAVAILABLE)
        row = to_row(user)
        row.pop("customer_no", None)
        try:
            data = await sheets_writer.call({
                "action": "createCustomer",
                "seriesSheetId": settings.GOOGLE_SHEET_ID_CUSTOMER_SERIES, "seriesTab": settings.GOOGLE_SHEET_TAB_CUSTOMER_SERIES,
                "prefix": settings.CUSTOMER_NO_PREFIX, "digits": settings.CUSTOMER_NO_DIGITS,
                "sheetId": settings.GOOGLE_SHEET_ID_CUSTOMER_MASTER, "tab": settings.GOOGLE_SHEET_TAB_CUSTOMER_MASTER,
                "keyColumn": "customer_no", "row": row,
            })
        except Exception as exc:  # noqa: BLE001
            logger.error("Transactional customer creation failed: %s", exc)
            raise HTTPException(status_code=503, detail=UNAVAILABLE)
        customer_no = data.get("customerNumber")
        if not customer_no:
            raise HTTPException(status_code=503, detail=UNAVAILABLE)
        logger.info("Created customer %s in customer_master (next series number %s)", customer_no, data.get("nextNumber"))
        return customer_no


customer_series_service = CustomerSeriesService()
