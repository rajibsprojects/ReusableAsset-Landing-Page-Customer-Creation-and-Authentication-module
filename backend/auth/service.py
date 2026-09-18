import logging
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException
from pymongo.errors import DuplicateKeyError

from core.config import settings
from core.database import db
from auth.security import hash_password, verify_password, validate_password_strength, generate_token
from auth.providers.emergent_google import fetch_google_session
from services.email.service import email_service
from services.customer_master import customer_master_service
from services.customer_series import customer_series_service
from auth.phone import validate_contact_fields, normalize_country_code, validate_mobile, validate_landline
from core.timezone import format_app_time

logger = logging.getLogger(__name__)

PUBLIC_FIELDS = [
    "user_id", "customer_no", "name", "email", "auth_provider", "email_verified", "picture",
    "contact_mobile_cntry", "contact_mobile", "contact_other_cntry", "contact_other",
    "address1", "address2", "city", "state", "pin", "category",
]
REQUIRED_PROFILE_FIELDS = ["name", "contact_mobile_cntry", "contact_mobile", "address1", "city", "state", "pin", "category"]
MOBILE_DUPLICATE_MSG = "This mobile number is already registered. Please log in or use another mobile number."


def now() -> datetime:
    return datetime.now(timezone.utc)


def aware(dt) -> datetime:
    if isinstance(dt, str):
        dt = datetime.fromisoformat(dt)
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


def is_profile_complete(doc: dict) -> bool:
    return all(bool(doc.get(f)) for f in REQUIRED_PROFILE_FIELDS)


def public_user(doc: dict) -> dict:
    data = {k: doc.get(k) for k in PUBLIC_FIELDS}
    data["profile_complete"] = is_profile_complete(doc)
    data["registration_complete"] = bool(doc.get("registration_complete", bool(doc.get("customer_no"))))
    data["created_at"] = format_app_time(doc.get("created_at"))
    data["updated_at"] = format_app_time(doc.get("updated_at"))
    return data


class AuthService:
    async def ensure_indexes(self):
        await db.users.create_index("email", unique=True)
        await db.users.create_index("user_id", unique=True)
        await db.user_sessions.create_index("session_token", unique=True)
        await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
        await db.email_verifications.create_index("token", unique=True)
        await db.email_verifications.create_index("expires_at", expireAfterSeconds=0)
        await db.password_reset_tokens.create_index("token", unique=True)
        await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
        await db.login_attempts.create_index("identifier", unique=True)
        await db.users.create_index(
            [("contact_mobile_cntry", 1), ("contact_mobile", 1)], unique=True, name="uniq_mobile_with_country",
            partialFilterExpression={"contact_mobile_cntry": {"$type": "string"}, "contact_mobile": {"$type": "string"}},
        )
        # One-time migration: legacy users with a customer number are fully registered.
        await db.users.update_many({"registration_complete": {"$exists": False}, "customer_no": {"$ne": None}}, {"$set": {"registration_complete": True}})
        await db.users.update_many({"registration_complete": {"$exists": False}}, {"$set": {"registration_complete": False}})

    async def assert_mobile_available(self, country_code: str, mobile: str, exclude_user_id: str | None = None) -> None:
        # Legacy records without a stored country code are matched on the number alone (never guess their code).
        query = {"contact_mobile": mobile, "$or": [{"contact_mobile_cntry": country_code}, {"contact_mobile_cntry": {"$in": [None, ""]}}]}
        if exclude_user_id:
            query["user_id"] = {"$ne": exclude_user_id}
        if await db.users.find_one(query, {"_id": 0, "user_id": 1}):
            raise HTTPException(status_code=409, detail=MOBILE_DUPLICATE_MSG)

    async def finalize_registration(self, user: dict) -> None:
        await email_service.send_welcome_email(user["email"], user["name"], user["customer_no"])
        await email_service.send_new_customer_notification(user)

    # ---------- Email verification + registration ----------
    async def request_email_verification(self, email: str, origin: str) -> dict:
        email = email.lower().strip()
        if await db.users.find_one({"email": email}, {"_id": 0, "user_id": 1}):
            raise HTTPException(status_code=409, detail="An account with this email already exists. Please login instead.")
        token = generate_token(32)
        await db.email_verifications.insert_one({
            "token": token, "email": email, "verified": False, "used": False,
            "created_at": now(), "expires_at": now() + timedelta(hours=settings.VERIFICATION_HOURS),
        })
        link = f"{origin}/signup?token={token}"
        sent = await email_service.send_verification_email(email, link)
        result = {"message": f"A verification link has been sent to {email}. Please check your inbox.", "email_sent": sent}
        if settings.EXPOSE_DEV_LINKS:
            result["dev_link"] = link
        return result

    async def confirm_email_verification(self, token: str) -> dict:
        rec = await db.email_verifications.find_one({"token": token}, {"_id": 0})
        if not rec or aware(rec["expires_at"]) < now():
            raise HTTPException(status_code=400, detail="This verification link is invalid or has expired. Please request a new one.")
        if rec.get("used"):
            raise HTTPException(status_code=400, detail="This verification link has already been used. Please login.")
        if not rec.get("verified"):
            await db.email_verifications.update_one({"token": token}, {"$set": {"verified": True, "verified_at": now()}})
        return {"email": rec["email"], "verified": True}

    async def register(self, data) -> dict:
        rec = await db.email_verifications.find_one({"token": data.verification_token}, {"_id": 0})
        if not rec or aware(rec["expires_at"]) < now() or not rec.get("verified") or rec.get("used"):
            raise HTTPException(status_code=400, detail="Email verification is missing or expired. Please verify your email again.")
        validate_password_strength(data.password)
        phones = validate_contact_fields(data.contact_mobile_cntry, data.contact_mobile, data.contact_other_cntry, data.contact_other)
        await self.assert_mobile_available(phones["contact_mobile_cntry"], phones["contact_mobile"])
        if await db.users.find_one({"email": rec["email"]}, {"_id": 0, "user_id": 1}):
            raise HTTPException(status_code=409, detail="An account with this email already exists. Please login instead.")
        # All validations passed. Reserve the auth account first (unique email + unique mobile indexes make this atomic),
        # then create the customer in customer_master transactionally; the series number is consumed only on success.
        created = now()
        user = {
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "customer_no": None,
            "name": data.name.strip(),
            "email": rec["email"],
            "password_hash": hash_password(data.password),
            "auth_provider": "email",
            "email_verified": True,
            "picture": None,
            **phones,
            "address1": data.address1.strip(),
            "address2": (data.address2 or "").strip() or None,
            "city": data.city.strip(),
            "state": data.state.strip(),
            "pin": data.pin.strip(),
            "category": data.category,
            "registration_complete": False,
            "created_at": created,
            "updated_at": created,
        }
        try:
            await db.users.insert_one(user)
        except DuplicateKeyError as exc:
            if "uniq_mobile" in str(exc):
                raise HTTPException(status_code=409, detail=MOBILE_DUPLICATE_MSG)
            raise HTTPException(status_code=409, detail="An account with this email already exists. Please login instead.")
        try:
            user["registered_at"] = now()
            customer_no = await customer_series_service.create_customer(user)
        except HTTPException:
            await db.users.delete_one({"user_id": user["user_id"], "registration_complete": False})
            raise
        completion = {"customer_no": customer_no, "registration_complete": True, "registered_at": user["registered_at"],
                      "sheet_sync_pending": False, "sheet_synced_at": now()}
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": completion})
        user.update(completion)
        await db.email_verifications.update_one({"token": data.verification_token}, {"$set": {"used": True}})
        await self.finalize_registration(user)
        return user

    # ---------- Login / sessions ----------
    async def login(self, email: str, password: str, ip: str) -> dict:
        email = email.lower().strip()
        identifier = f"{ip}:{email}"
        attempt = await db.login_attempts.find_one({"identifier": identifier}, {"_id": 0})
        if attempt and attempt.get("count", 0) >= settings.MAX_LOGIN_ATTEMPTS and aware(attempt["locked_until"]) > now():
            minutes = max(1, int((aware(attempt["locked_until"]) - now()).total_seconds() // 60) + 1)
            raise HTTPException(status_code=429, detail=f"Too many failed attempts. Please try again in {minutes} minutes.")
        user = await db.users.find_one({"email": email})
        if not user or not user.get("password_hash") or not verify_password(password, user["password_hash"]):
            await db.login_attempts.update_one(
                {"identifier": identifier},
                {"$inc": {"count": 1}, "$set": {"locked_until": now() + timedelta(minutes=settings.LOCKOUT_MINUTES)}},
                upsert=True,
            )
            if user and user.get("auth_provider") == "google" and not user.get("password_hash"):
                raise HTTPException(status_code=401, detail="This account uses Google sign-in. Please continue with Google.")
            raise HTTPException(status_code=401, detail="Invalid email or password")
        await db.login_attempts.delete_one({"identifier": identifier})
        return user

    async def create_session(self, user_id: str, token: str | None = None) -> str:
        token = token or generate_token(48)
        await db.user_sessions.insert_one({
            "user_id": user_id, "session_token": token, "created_at": now(), "last_activity": now(),
            "expires_at": now() + timedelta(days=settings.SESSION_DAYS),
        })
        return token

    async def get_user_by_session(self, token: str) -> dict | None:
        session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
        if not session or aware(session["expires_at"]) < now():
            return None
        last_activity = aware(session.get("last_activity") or session["created_at"])
        idle = (now() - last_activity).total_seconds()
        if idle > settings.SESSION_IDLE_MINUTES * 60:
            await db.user_sessions.delete_one({"session_token": token})
            return None
        if idle > 30:
            await db.user_sessions.update_one({"session_token": token}, {"$set": {"last_activity": now()}})
        return await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})

    async def logout(self, token: str) -> None:
        await db.user_sessions.delete_one({"session_token": token})

    async def google_exchange(self, session_id: str) -> tuple[dict, str]:
        data = await fetch_google_session(session_id)
        email = data["email"].lower().strip()
        user = await db.users.find_one({"email": email})
        if not user:
            # Google identity only: no customer number and no sheet record until the mandatory profile is completed.
            user = {
                "user_id": f"user_{uuid.uuid4().hex[:12]}",
                "customer_no": None,
                "name": data.get("name") or email.split("@")[0],
                "email": email,
                "password_hash": None,
                "auth_provider": "google",
                "email_verified": True,
                "picture": data.get("picture"),
                "google_id": data.get("id"),
                "registration_complete": False,
                "created_at": now(),
            }
            try:
                await db.users.insert_one(user)
            except DuplicateKeyError:
                user = await db.users.find_one({"email": email})
        else:
            updates = {"google_id": data.get("id")}
            if not user.get("picture") and data.get("picture"):
                updates["picture"] = data["picture"]
            await db.users.update_one({"email": email}, {"$set": updates})
        token = await self.create_session(user["user_id"], data["session_token"])
        return user, token

    # ---------- Password reset ----------
    async def forgot_password(self, email: str, origin: str) -> dict:
        email = email.lower().strip()
        user = await db.users.find_one({"email": email}, {"_id": 0, "user_id": 1, "password_hash": 1})
        result = {"message": "If an account exists for this email, a password reset link has been sent."}
        if user and user.get("password_hash"):
            token = generate_token(32)
            await db.password_reset_tokens.insert_one({
                "token": token, "user_id": user["user_id"], "used": False,
                "created_at": now(), "expires_at": now() + timedelta(hours=settings.RESET_HOURS),
            })
            link = f"{origin}/reset-password?token={token}"
            await email_service.send_password_reset_email(email, link)
            if settings.EXPOSE_DEV_LINKS:
                result["dev_link"] = link
        return result

    async def reset_password(self, token: str, password: str) -> dict:
        rec = await db.password_reset_tokens.find_one({"token": token}, {"_id": 0})
        if not rec or rec.get("used") or aware(rec["expires_at"]) < now():
            raise HTTPException(status_code=400, detail="This reset link is invalid or has expired. Please request a new one.")
        validate_password_strength(password)
        await db.users.update_one({"user_id": rec["user_id"]}, {"$set": {"password_hash": hash_password(password)}})
        await db.password_reset_tokens.update_one({"token": token}, {"$set": {"used": True}})
        await db.user_sessions.delete_many({"user_id": rec["user_id"]})
        return {"message": "Your password has been reset. Please login with your new password."}

    # ---------- Profile ----------
    async def update_profile(self, user_id: str, data) -> dict:
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        updates = {k: (v.strip() if isinstance(v, str) else v) for k, v in data.model_dump().items() if v is not None}
        if not updates:
            return user
        if "contact_mobile" in updates or "contact_mobile_cntry" in updates:
            cc = normalize_country_code(updates.get("contact_mobile_cntry") or user.get("contact_mobile_cntry"))
            mobile = validate_mobile(cc, updates.get("contact_mobile", user.get("contact_mobile")))
            await self.assert_mobile_available(cc, mobile, exclude_user_id=user_id)
            updates.update({"contact_mobile_cntry": cc, "contact_mobile": mobile})
        if "contact_other" in updates or "contact_other_cntry" in updates:
            occ = normalize_country_code(updates.get("contact_other_cntry") or user.get("contact_other_cntry"))
            other = validate_landline(occ, updates.get("contact_other", user.get("contact_other")))
            updates.update({"contact_other_cntry": occ if other else None, "contact_other": other or None})
        merged = {**user, **updates}
        completing = not user.get("registration_complete") and not user.get("customer_no") and is_profile_complete(merged)
        updates["updated_at"] = now()
        try:
            await db.users.update_one({"user_id": user_id}, {"$set": updates})
        except DuplicateKeyError:
            raise HTTPException(status_code=409, detail=MOBILE_DUPLICATE_MSG)
        fresh = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        if completing:
            # Google sign-up becomes a real customer only now: transactional create in customer_master (+ series increment).
            fresh["registered_at"] = now()
            customer_no = await customer_series_service.create_customer(fresh)
            completion = {"customer_no": customer_no, "registration_complete": True, "registered_at": fresh["registered_at"],
                          "sheet_sync_pending": False, "sheet_synced_at": now()}
            await db.users.update_one({"user_id": user_id}, {"$set": completion})
            fresh.update(completion)
            await self.finalize_registration(fresh)
        elif fresh.get("registration_complete"):
            customer_master_service.sync_in_background(user_id)
        return fresh

    async def seed_test_user(self) -> None:
        if not settings.SEED_TEST_USER_EMAIL or not settings.SEED_TEST_USER_PASSWORD:
            return
        email = settings.SEED_TEST_USER_EMAIL.lower()
        existing = await db.users.find_one({"email": email})
        if existing:
            if not verify_password(settings.SEED_TEST_USER_PASSWORD, existing.get("password_hash") or ""):
                await db.users.update_one({"email": email}, {"$set": {"password_hash": hash_password(settings.SEED_TEST_USER_PASSWORD)}})
            return
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:12]}", "customer_no": f"{settings.CUSTOMER_NO_PREFIX}{0:0{settings.CUSTOMER_NO_DIGITS}d}",
            "name": settings.SEED_TEST_USER_NAME, "email": email,
            "password_hash": hash_password(settings.SEED_TEST_USER_PASSWORD), "auth_provider": "email",
            "email_verified": True, "picture": None, "contact_mobile_cntry": "+91", "contact_mobile": "9876543210",
            "contact_other_cntry": None, "contact_other": None, "registration_complete": True,
            "address1": "12, Lake Gardens", "address2": "Near Lake Market", "city": "Kolkata",
            "state": "West Bengal", "pin": "700045", "category": "B2C", "created_at": now(),
        })
        logger.info("Seeded test user %s", email)


auth_service = AuthService()
