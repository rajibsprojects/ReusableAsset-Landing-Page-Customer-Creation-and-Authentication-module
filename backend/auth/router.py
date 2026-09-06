from fastapi import APIRouter, Depends, Request, Response
from core.config import settings
from auth.dependencies import get_current_user, extract_token, SESSION_COOKIE
from auth.models import (
    UserPublic, EmailVerificationRequest, RegisterRequest, LoginRequest, ForgotPasswordRequest,
    ResetPasswordRequest, GoogleSessionRequest, ProfileUpdateRequest,
)
from auth.service import auth_service, public_user

router = APIRouter(prefix="/auth", tags=["auth"])


def set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=SESSION_COOKIE, value=token, httponly=True, secure=True, samesite="none",
        max_age=settings.SESSION_DAYS * 86400, path="/",
    )


def request_origin(request: Request) -> str:
    return settings.FRONTEND_URL or request.headers.get("origin") or str(request.base_url).rstrip("/")


@router.post("/verify-email/request")
async def request_verification(payload: EmailVerificationRequest, request: Request):
    return await auth_service.request_email_verification(payload.email, request_origin(request))


@router.get("/verify-email/confirm")
async def confirm_verification(token: str):
    return await auth_service.confirm_email_verification(token)


@router.post("/register", response_model=UserPublic)
async def register(payload: RegisterRequest, response: Response):
    user = await auth_service.register(payload)
    set_session_cookie(response, await auth_service.create_session(user["user_id"]))
    return public_user(user)


@router.post("/login", response_model=UserPublic)
async def login(payload: LoginRequest, request: Request, response: Response):
    ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown").split(",")[0].strip()
    user = await auth_service.login(payload.email, payload.password, ip)
    set_session_cookie(response, await auth_service.create_session(user["user_id"]))
    return public_user(user)


@router.post("/google/session", response_model=UserPublic)
async def google_session(payload: GoogleSessionRequest, response: Response):
    user, token = await auth_service.google_exchange(payload.session_id)
    set_session_cookie(response, token)
    return public_user(user)


@router.get("/me", response_model=UserPublic)
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


@router.put("/me", response_model=UserPublic)
async def update_me(payload: ProfileUpdateRequest, user: dict = Depends(get_current_user)):
    return public_user(await auth_service.update_profile(user["user_id"], payload))


@router.post("/logout")
async def logout(request: Request, response: Response):
    token = extract_token(request)
    if token:
        await auth_service.logout(token)
    response.delete_cookie(SESSION_COOKIE, path="/", secure=True, samesite="none")
    return {"message": "Logged out"}


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest, request: Request):
    return await auth_service.forgot_password(payload.email, request_origin(request))


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest):
    return await auth_service.reset_password(payload.token, payload.password)
