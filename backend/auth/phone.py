import re
from fastapi import HTTPException
from core.config import settings

COUNTRY_CODE_RE = re.compile(r"^\+\d{1,3}$")
SEPARATORS_RE = re.compile(r"[\s\-\.\(\)]")


def normalize_country_code(value: str | None) -> str:
    cc = (value or settings.DEFAULT_COUNTRY_CODE or "").strip().replace(" ", "")
    if cc and cc[0] != "+" and cc.isdigit():
        cc = "+" + cc
    if not COUNTRY_CODE_RE.match(cc):
        raise HTTPException(status_code=400, detail="Please select a valid country code")
    return cc


def normalize_number(raw: str | None, country_code: str, label: str) -> str:
    value = SEPARATORS_RE.sub("", (raw or "").strip())
    if not value:
        return ""
    cc_digits = country_code[1:]
    if value.startswith("+" + cc_digits):
        value = value[len(cc_digits) + 1:]
    elif value.startswith("00" + cc_digits):
        value = value[len(cc_digits) + 2:]
    if not value.isdigit():
        raise HTTPException(status_code=400, detail=f"{label} must contain digits only (no letters, + or special characters)")
    return value


def validate_mobile(country_code: str, raw: str | None) -> str:
    number = normalize_number(raw, country_code, "Mobile number")
    if not number:
        raise HTTPException(status_code=400, detail="Mobile number is required")
    if country_code == "+91":
        if not re.fullmatch(r"[6-9]\d{9}", number):
            raise HTTPException(status_code=400, detail="Please enter a valid 10-digit Indian mobile number")
    elif not 6 <= len(number) <= 14:
        raise HTTPException(status_code=400, detail="Please enter a valid mobile number (6-14 digits)")
    return number


def validate_landline(country_code: str, raw: str | None) -> str:
    number = normalize_number(raw, country_code, "Landline / other contact number")
    if not number:
        return ""
    max_len = 12 if country_code == "+91" else 15
    if not 6 <= len(number) <= max_len:
        raise HTTPException(status_code=400, detail=f"Please enter a valid landline / other contact number (6-{max_len} digits)")
    return number


def validate_contact_fields(mobile_cc, mobile, other_cc, other) -> dict:
    mobile_cc = normalize_country_code(mobile_cc)
    mobile = validate_mobile(mobile_cc, mobile)
    other_cc = normalize_country_code(other_cc)
    other = validate_landline(other_cc, other)
    return {
        "contact_mobile_cntry": mobile_cc, "contact_mobile": mobile,
        "contact_other_cntry": other_cc if other else None, "contact_other": other or None,
    }
