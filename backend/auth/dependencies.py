from fastapi import HTTPException, Request
from auth.service import auth_service

SESSION_COOKIE = "session_token"


def extract_token(request: Request) -> str | None:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        header = request.headers.get("Authorization", "")
        if header.startswith("Bearer "):
            token = header[7:]
    return token or None


async def get_current_user(request: Request) -> dict:
    token = extract_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = await auth_service.get_user_by_session(token)
    if not user:
        raise HTTPException(status_code=401, detail="Session expired. Please login again.")
    return user
