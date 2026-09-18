"""Module 1 comprehensive tests: phone country code, duplicate mobile, series consumption,
IST timestamps, Google-incomplete profile, session idle timeout, forgot/reset."""
import os
import time
import re
import subprocess
import httpx
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://madam-home-login.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby7Clg1ZaMOMjMNVHfaWR2aqZROeuhTRC4-dRvwGPwdfWX1wq3vK-kZ88U0AxtrPV9C/exec"
APPS_KEY = "MF_DEV_Ky18O5FvW4KfQzON"
CUSTOMER_MASTER_SHEET = "1jpiygdMaW47DUt8ogKXaOsw773l3j80HDVsc8v6DGhQ"
CUSTOMER_SERIES_SHEET = "1LbML8Iqap9PUo4I5VRQer9V6RwFhpo_LMYnUxapE7FM"

SEED_EMAIL = "test.customer@madamboutique.in"
SEED_PASSWORD = "Madam@1234"


def apps_script(payload: dict) -> dict:
    payload = {**payload, "key": APPS_KEY}
    r = httpx.post(APPS_SCRIPT_URL, json=payload, follow_redirects=True, timeout=45)
    r.raise_for_status()
    return r.json()


def read_series_number() -> int:
    data = apps_script({"action": "getSheet", "sheetId": CUSTOMER_SERIES_SHEET, "tab": "customer_series_master"})
    rows = data["rows"]
    return int(rows[0]["number"])


def find_master_row(customer_no: str) -> dict | None:
    data = apps_script({"action": "getSheet", "sheetId": CUSTOMER_MASTER_SHEET, "tab": "customer_master"})
    for row in data["rows"]:
        if str(row.get("customer_no", "")).strip() == customer_no:
            return row
    return None


def find_master_rows(customer_no: str) -> list:
    data = apps_script({"action": "getSheet", "sheetId": CUSTOMER_MASTER_SHEET, "tab": "customer_master"})
    return [row for row in data["rows"] if str(row.get("customer_no", "")).strip() == customer_no]


def verify_email(session: requests.Session, email: str) -> str:
    r = session.post(f"{API}/auth/verify-email/request", json={"email": email})
    assert r.status_code == 200, r.text
    link = r.json()["dev_link"]
    token = link.split("token=")[-1]
    r2 = session.get(f"{API}/auth/verify-email/confirm", params={"token": token})
    assert r2.status_code == 200
    return token


def unique_mobile(seed: int) -> str:
    # Avoid 9890788742 and 9876543210; construct in 989 space with timestamp+seed
    ts = int(time.time()) % 100000
    n = f"989{(seed * 7919 + ts) % 10000000:07d}"
    # ensure first digit remains 9
    return n[:10]


# ======== Setup: series baseline ========

@pytest.fixture(scope="module")
def series_baseline() -> int:
    return read_series_number()


def test_integrations_status():
    r = requests.get(f"{API}/integrations/status")
    assert r.status_code == 200
    j = r.json()
    assert j["apps_script_configured"] is True
    assert j["customer_master_sync_enabled"] is True
    assert j["customer_series_configured"] is True


def test_series_baseline(series_baseline):
    assert series_baseline >= 15, f"series baseline unexpectedly low: {series_baseline}"


# ======== Happy path email registration ========

@pytest.fixture(scope="module")
def user_A(series_baseline):
    """First registration; consumes series baseline -> baseline+1."""
    email = f"qa.{int(time.time())}.A@example.org"
    sess = requests.Session()
    token = verify_email(sess, email)
    mobile = unique_mobile(1)
    payload = {
        "verification_token": token,
        "name": "QA Country Tester",
        "password": "Test@1234",
        "contact_mobile_cntry": "+91",
        "contact_mobile": mobile[:2] + " " + mobile[2:7] + "-" + mobile[7:],  # spaces/dashes
        "contact_other_cntry": "+91",
        "contact_other": "033-1234 5678",
        "address1": "1 QA Rd",
        "city": "Kolkata",
        "state": "West Bengal",
        "pin": "700055",
        "category": "B2C",
    }
    r = sess.post(f"{API}/auth/register", json=payload)
    assert r.status_code in (200, 201), r.text
    user = r.json()
    expected_no = f"CUST-{series_baseline:06d}"
    assert user["customer_no"] == expected_no, (user["customer_no"], expected_no)
    assert user["contact_mobile_cntry"] == "+91"
    assert user["contact_mobile"] == mobile
    assert user["contact_other_cntry"] == "+91"
    assert user["contact_other"] == "03312345678"
    assert user["registration_complete"] is True
    assert (user.get("created_at") or "").endswith(" IST"), user.get("created_at")
    return {"email": email, "mobile": mobile, "user": user, "session": sess}


def test_A_series_incremented(series_baseline, user_A):
    assert read_series_number() == series_baseline + 1


def _norm_cc(v):
    s = str(v).strip()
    if s and not s.startswith("+") and s.isdigit():
        s = "+" + s
    return s


def _norm_land(v):
    s = str(v).strip()
    # sheet may drop leading zeros on numeric strings
    if s == "3312345678":
        s = "0" + s
    return s


def test_A_sheet_row(user_A):
    row = find_master_row(user_A["user"]["customer_no"])
    assert row is not None, "customer_master row missing"
    # NOTE: sheet cells sometimes strip leading "+" when column formatted as number instead of text
    assert _norm_cc(row.get("customer_contact_mbl_cntry")) == "+91", row
    assert str(row.get("customer_contact_mbl")).strip() == user_A["mobile"]
    assert _norm_cc(row.get("customer_contact_other_cntry")) == "+91", row
    assert _norm_land(row.get("customer_contact_other")) == "03312345678", row
    assert str(row.get("customer_pin")).strip() == "700055"
    assert str(row.get("created_at")).endswith(" IST")
    assert str(row.get("updated_at")).endswith(" IST")
    # password never in sheet
    if "password" in row:
        assert (row["password"] or "") == ""
    if "password_hash" in row:
        assert (row["password_hash"] or "") == ""


# ======== Validation: invalid mobile / country code must 400, no series change ========

INVALID_MOBILES = [
    ("+91", "98907ABC742"),
    ("+91", "phone12345"),
    ("+91", "98A0788742"),
    ("+91", "98907@8742"),
    ("+91", "989078874"),   # 9 digits
    ("+91", "5890788742"),  # starts with 5
    ("IN",  "9890788742"),  # invalid CC letters
    ("91x", "9890788742"),  # invalid CC
]

INVALID_LANDLINES = [
    ("+91", "abc123"),
]


@pytest.mark.parametrize("cc,mob", INVALID_MOBILES)
def test_invalid_mobile_400(cc, mob, series_baseline, user_A):
    before = read_series_number()
    email = f"qa.inv.{int(time.time()*1000)}@example.org"
    sess = requests.Session()
    token = verify_email(sess, email)
    payload = {
        "verification_token": token, "name": "QA Inv", "password": "Test@1234",
        "contact_mobile_cntry": cc, "contact_mobile": mob,
        "address1": "1 Test Rd", "city": "Kolkata", "state": "West Bengal", "pin": "700055", "category": "B2C",
    }
    r = sess.post(f"{API}/auth/register", json=payload)
    assert r.status_code == 400, f"expected 400, got {r.status_code}: {r.text}"
    assert read_series_number() == before, f"series changed on invalid input ({cc},{mob})"


@pytest.mark.parametrize("cc,land", INVALID_LANDLINES)
def test_invalid_landline_400(cc, land, series_baseline):
    before = read_series_number()
    email = f"qa.land.{int(time.time()*1000)}@example.org"
    sess = requests.Session()
    token = verify_email(sess, email)
    payload = {
        "verification_token": token, "name": "QA", "password": "Test@1234",
        "contact_mobile_cntry": "+91", "contact_mobile": unique_mobile(99),
        "contact_other_cntry": cc, "contact_other": land,
        "address1": "1 Test Rd", "city": "Kolkata", "state": "WB", "pin": "700055", "category": "B2C",
    }
    r = sess.post(f"{API}/auth/register", json=payload)
    assert r.status_code == 400, r.text
    assert read_series_number() == before


def test_mobile_with_plus_country_prefix_accepted(user_A):
    """+91<10digits> submitted as mobile with cntry +91 should normalize -> succeeds."""
    before = read_series_number()
    email = f"qa.plus.{int(time.time())}@example.org"
    sess = requests.Session()
    token = verify_email(sess, email)
    mob = unique_mobile(2024)
    payload = {
        "verification_token": token, "name": "QA Plus", "password": "Test@1234",
        "contact_mobile_cntry": "+91", "contact_mobile": "+91" + mob,
        "address1": "1 Test Rd", "city": "Kolkata", "state": "WB", "pin": "700055", "category": "B2C",
    }
    r = sess.post(f"{API}/auth/register", json=payload)
    assert r.status_code in (200, 201), r.text
    body = r.json()
    assert body["contact_mobile"] == mob
    assert read_series_number() == before + 1


# ======== Duplicate mobile ========

def test_duplicate_mobile_same_cc(user_A):
    before = read_series_number()
    email = f"qa.dup.{int(time.time())}@example.org"
    sess = requests.Session()
    token = verify_email(sess, email)
    payload = {
        "verification_token": token, "name": "QA Dup", "password": "Test@1234",
        "contact_mobile_cntry": "+91", "contact_mobile": user_A["mobile"],
        "address1": "1 Test Rd", "city": "Kolkata", "state": "WB", "pin": "700055", "category": "B2C",
    }
    r = sess.post(f"{API}/auth/register", json=payload)
    assert r.status_code == 409, r.text
    assert "mobile number is already registered" in (r.json().get("detail") or "").lower()
    assert read_series_number() == before


def test_duplicate_mobile_with_whitespace(user_A):
    before = read_series_number()
    email = f"qa.dupws.{int(time.time())}@example.org"
    sess = requests.Session()
    token = verify_email(sess, email)
    m = user_A["mobile"]
    spaced = m[:5] + " " + m[5:]
    payload = {
        "verification_token": token, "name": "QA Dup2", "password": "Test@1234",
        "contact_mobile_cntry": "+91", "contact_mobile": spaced,
        "address1": "1 Test Rd", "city": "Kolkata", "state": "WB", "pin": "700055", "category": "B2C",
    }
    r = sess.post(f"{API}/auth/register", json=payload)
    assert r.status_code == 409, r.text
    assert read_series_number() == before


def test_duplicate_mobile_different_cc_allowed(user_A):
    """Same digits with +1 should register and consume next series."""
    before = read_series_number()
    email = f"qa.plus1.{int(time.time())}@example.org"
    sess = requests.Session()
    token = verify_email(sess, email)
    payload = {
        "verification_token": token, "name": "QA US", "password": "Test@1234",
        "contact_mobile_cntry": "+1", "contact_mobile": user_A["mobile"],
        "address1": "1 Wall St", "city": "New York", "state": "NY", "pin": "100011", "category": "B2C",
    }
    r = sess.post(f"{API}/auth/register", json=payload)
    assert r.status_code in (200, 201), r.text
    body = r.json()
    assert body["contact_mobile_cntry"] == "+1"
    assert body["contact_mobile"] == user_A["mobile"]
    assert read_series_number() == before + 1


# ======== Duplicate email ========

def test_duplicate_email():
    before = read_series_number()
    r = requests.post(f"{API}/auth/verify-email/request", json={"email": SEED_EMAIL})
    assert r.status_code == 409, r.text
    assert read_series_number() == before


# ======== Session idle timeout via mongosh ========

def _mongo(js: str) -> str:
    return subprocess.check_output(
        ["mongosh", "mongodb://localhost:27017/test_database", "--quiet", "--eval", js],
        timeout=30,
    ).decode()


def test_session_idle_timeout_401():
    # Seeded user_id lookup
    out = _mongo(f'JSON.stringify(db.users.findOne({{email:"{SEED_EMAIL}"}}, {{user_id:1,_id:0}}))')
    m = re.search(r'"user_id":"([^"]+)"', out)
    assert m, out
    user_id = m.group(1)
    token = f"qa_idle_{int(time.time())}"
    _mongo(
        f'db.user_sessions.insertOne({{user_id:"{user_id}", session_token:"{token}", '
        f'created_at:new Date(Date.now()-6*60*1000), last_activity:new Date(Date.now()-5*60*1000), '
        f'expires_at:new Date(Date.now()+86400000)}})'
    )
    r = requests.get(f"{API}/auth/me", cookies={"session_token": token})
    assert r.status_code == 401
    out2 = _mongo(f'db.user_sessions.countDocuments({{session_token:"{token}"}})')
    assert "0" in out2.strip().splitlines()[-1], out2


def test_session_recent_activity_ok():
    out = _mongo(f'JSON.stringify(db.users.findOne({{email:"{SEED_EMAIL}"}}, {{user_id:1,_id:0}}))')
    user_id = re.search(r'"user_id":"([^"]+)"', out).group(1)
    token = f"qa_ok_{int(time.time())}"
    _mongo(
        f'db.user_sessions.insertOne({{user_id:"{user_id}", session_token:"{token}", '
        f'created_at:new Date(Date.now()-2*60*1000), last_activity:new Date(Date.now()-60*1000), '
        f'expires_at:new Date(Date.now()+86400000)}})'
    )
    r = requests.get(f"{API}/auth/me", cookies={"session_token": token})
    assert r.status_code == 200, r.text
    _mongo(f'db.user_sessions.deleteOne({{session_token:"{token}"}})')


# ======== Google incomplete profile flow ========

@pytest.fixture(scope="module")
def google_user():
    ts = int(time.time())
    uid = f"qa_google_{ts}"
    email = f"qa.google.{ts}@example.org"
    token = f"qa_gsess_{ts}"
    _mongo(
        f'db.users.insertOne({{user_id:"{uid}", email:"{email}", name:"QA Google", '
        f'auth_provider:"google", email_verified:true, customer_no:null, registration_complete:false, '
        f'created_at:new Date()}})'
    )
    _mongo(
        f'db.user_sessions.insertOne({{user_id:"{uid}", session_token:"{token}", '
        f'created_at:new Date(), last_activity:new Date(), expires_at:new Date(Date.now()+86400000)}})'
    )
    return {"user_id": uid, "email": email, "token": token}


def test_google_me_incomplete(google_user):
    r = requests.get(f"{API}/auth/me", cookies={"session_token": google_user["token"]})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["customer_no"] is None
    assert body["registration_complete"] is False
    assert "password_hash" not in body


def test_google_partial_update_no_series(google_user):
    before = read_series_number()
    r = requests.put(f"{API}/auth/me", cookies={"session_token": google_user["token"]},
                     json={"address1": "X"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["registration_complete"] is False
    assert body["customer_no"] is None
    assert read_series_number() == before


def test_google_duplicate_mobile_409(google_user, user_A):
    before = read_series_number()
    r = requests.put(
        f"{API}/auth/me", cookies={"session_token": google_user["token"]},
        json={
            "name": "QA Google", "contact_mobile_cntry": "+91", "contact_mobile": user_A["mobile"],
            "address1": "X", "city": "K", "state": "WB", "pin": "700055", "category": "B2B",
        },
    )
    assert r.status_code == 409, r.text
    assert read_series_number() == before


def test_google_complete_profile_creates_customer(google_user, series_baseline):
    before = read_series_number()
    mob = unique_mobile(555)
    r = requests.put(
        f"{API}/auth/me", cookies={"session_token": google_user["token"]},
        json={
            "name": "QA Google", "contact_mobile_cntry": "+91", "contact_mobile": mob,
            "address1": "X", "city": "K", "state": "WB", "pin": "700055", "category": "B2B",
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["registration_complete"] is True
    assert body["customer_no"] == f"CUST-{before:06d}"
    assert read_series_number() == before + 1
    # Attempt sheet check with retries (may be a bit slow)
    for _ in range(6):
        row = find_master_row(body["customer_no"])
        if row:
            break
        time.sleep(2)
    assert row is not None, "google user's customer_master row not written"
    assert str(row.get("auth_provider")).strip() == "google"
    # Cannot escalate customer_no by request
    r2 = requests.put(f"{API}/auth/me", cookies={"session_token": google_user["token"]},
                      json={"city": "Howrah", "customer_no": "CUST-999999", "registration_complete": False})
    assert r2.status_code == 200
    b2 = r2.json()
    assert b2["customer_no"] == body["customer_no"]  # ignored
    assert b2["registration_complete"] is True
    # sheet: still one row for this customer_no
    time.sleep(3)
    rows = find_master_rows(body["customer_no"])
    assert len(rows) == 1, f"expected 1 row, got {len(rows)}"
    assert str(rows[0].get("customer_city")).strip() == "Howrah"
    assert read_series_number() == before + 1  # unchanged after city update


# ======== Forgot / reset ========

def test_forgot_reset_flow(user_A):
    email = user_A["email"]
    r = requests.post(f"{API}/auth/forgot-password", json={"email": email})
    assert r.status_code == 200
    link = r.json()["dev_link"]
    token = link.split("token=")[-1]
    # weak
    r2 = requests.post(f"{API}/auth/reset-password", json={"token": token, "password": "abc"})
    assert r2.status_code == 400
    # ok
    r3 = requests.post(f"{API}/auth/reset-password", json={"token": token, "password": "New@12345"})
    assert r3.status_code == 200
    # reuse
    r4 = requests.post(f"{API}/auth/reset-password", json={"token": token, "password": "Other@12345"})
    assert r4.status_code == 400
    # new password login
    r5 = requests.post(f"{API}/auth/login", json={"email": email, "password": "New@12345"})
    assert r5.status_code == 200
    # old fails
    r6 = requests.post(f"{API}/auth/login", json={"email": email, "password": "Test@1234"})
    assert r6.status_code == 401


def test_forgot_unknown_email_generic_200():
    r = requests.post(f"{API}/auth/forgot-password", json={"email": f"nope.{int(time.time())}@example.org"})
    assert r.status_code == 200
    assert "reset link has been sent" in r.json().get("message", "").lower()


# ======== Security regressions ========

def test_me_unauth():
    r = requests.get(f"{API}/auth/me")
    assert r.status_code == 401


def test_put_me_cannot_set_customer_no_or_flag():
    sess = requests.Session()
    r = sess.post(f"{API}/auth/login", json={"email": SEED_EMAIL, "password": SEED_PASSWORD})
    assert r.status_code == 200
    original = sess.get(f"{API}/auth/me").json()
    r2 = sess.put(f"{API}/auth/me", json={"customer_no": "CUST-999999", "registration_complete": False})
    assert r2.status_code == 200
    body = r2.json()
    assert body["customer_no"] == original["customer_no"]
    assert body["registration_complete"] is True
    assert "password_hash" not in body


def test_login_regression_seed():
    r = requests.post(f"{API}/auth/login", json={"email": SEED_EMAIL, "password": SEED_PASSWORD})
    assert r.status_code == 200
    assert "password_hash" not in r.json()


# ======== Cleanup ========

def test_cleanup_qa_users():
    out = _mongo(
        'JSON.stringify({users: db.users.deleteMany({email:{$regex:"^qa\\\\."}}).deletedCount, '
        'sessions: db.user_sessions.deleteMany({user_id:{$regex:"^qa_google_"}}).deletedCount})'
    )
    print("cleanup:", out)
