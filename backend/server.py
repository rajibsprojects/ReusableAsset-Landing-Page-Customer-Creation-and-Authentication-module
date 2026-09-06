from core.config import settings  # noqa: F401  (loads .env first)
import logging
from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware

from core.database import client
from auth.router import router as auth_router
from auth.service import auth_service
from routers.content_router import router as content_router
from routers.pincode_router import router as pincode_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="Madam Boutique & Madam Fashions API", version="1.0.0")
api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"service": "Madam Boutique API", "module": 1, "status": "ok"}


@api_router.get("/health")
async def health():
    return {"status": "ok"}


api_router.include_router(auth_router)
api_router.include_router(content_router)
api_router.include_router(pincode_router)
app.include_router(api_router)

cors_kwargs = {"allow_credentials": True, "allow_methods": ["*"], "allow_headers": ["*"]}
if "*" in settings.CORS_ORIGINS:
    cors_kwargs["allow_origin_regex"] = ".*"
else:
    cors_kwargs["allow_origins"] = settings.CORS_ORIGINS
app.add_middleware(CORSMiddleware, **cors_kwargs)


@app.on_event("startup")
async def on_startup():
    await auth_service.ensure_indexes()
    await auth_service.seed_test_user()
    logger.info("Startup complete")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
