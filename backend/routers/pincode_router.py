from fastapi import APIRouter, HTTPException
from services.pincode.service import pincode_service, PincodeServiceError

router = APIRouter(prefix="/pincode", tags=["pincode"])


@router.get("/{pin}")
async def lookup_pincode(pin: str):
    if not pincode_service.is_valid(pin):
        raise HTTPException(status_code=400, detail="Please enter a valid 6-digit PIN code")
    try:
        result = await pincode_service.lookup(pin)
    except PincodeServiceError:
        raise HTTPException(status_code=503, detail="PIN lookup service is unavailable. Please enter city and state manually.")
    if not result:
        raise HTTPException(status_code=404, detail="PIN code not found. Please enter city and state manually.")
    return result
