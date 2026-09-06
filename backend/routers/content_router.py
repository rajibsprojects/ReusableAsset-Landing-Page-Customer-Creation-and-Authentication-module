from fastapi import APIRouter
from services.content.service import content_service

router = APIRouter(prefix="/content", tags=["content"])


@router.get("/business")
async def business_content(refresh: bool = False):
    return await content_service.get_business_content(force=refresh)
