from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class UserPublic(BaseModel):
    user_id: str
    customer_no: Optional[str] = None
    name: str
    email: str
    auth_provider: str
    email_verified: bool = True
    picture: Optional[str] = None
    contact_mobile_cntry: Optional[str] = None
    contact_mobile: Optional[str] = None
    contact_other_cntry: Optional[str] = None
    contact_other: Optional[str] = None
    address1: Optional[str] = None
    address2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pin: Optional[str] = None
    category: Optional[str] = None
    profile_complete: bool = False
    registration_complete: bool = False
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class EmailVerificationRequest(BaseModel):
    email: EmailStr


class RegisterRequest(BaseModel):
    verification_token: str
    name: str = Field(min_length=2, max_length=200)
    password: str
    contact_mobile_cntry: Optional[str] = Field(default=None, max_length=5)
    contact_mobile: str = Field(min_length=1, max_length=20)
    contact_other_cntry: Optional[str] = Field(default=None, max_length=5)
    contact_other: Optional[str] = Field(default=None, max_length=20)
    address1: str = Field(min_length=3, max_length=200)
    address2: Optional[str] = Field(default=None, max_length=200)
    city: str = Field(min_length=2, max_length=50)
    state: str = Field(min_length=2, max_length=50)
    pin: str = Field(min_length=6, max_length=6)
    category: str = Field(pattern="^(B2B|B2C)$")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str


class GoogleSessionRequest(BaseModel):
    session_id: str


class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=200)
    contact_mobile_cntry: Optional[str] = Field(default=None, max_length=5)
    contact_mobile: Optional[str] = Field(default=None, max_length=20)
    contact_other_cntry: Optional[str] = Field(default=None, max_length=5)
    contact_other: Optional[str] = Field(default=None, max_length=20)
    address1: Optional[str] = Field(default=None, max_length=200)
    address2: Optional[str] = Field(default=None, max_length=200)
    city: Optional[str] = Field(default=None, max_length=50)
    state: Optional[str] = Field(default=None, max_length=50)
    pin: Optional[str] = Field(default=None, max_length=6)
    category: Optional[str] = Field(default=None, pattern="^(B2B|B2C)$")
