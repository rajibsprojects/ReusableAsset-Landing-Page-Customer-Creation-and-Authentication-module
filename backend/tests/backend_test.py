"""Backend integration tests for Madam Boutique Module 1."""
import os
import time
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://elegance-auth-1.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
SEED_EMAIL = "test.customer@madamboutique.in"
SEED_PASSWORD = "Madam@1234"


@pytest.fixture(scope="module")
def s():
    return requests.Session()


# ---------- Health & content ----------
def test_health():
    r = requests.get(f"{API}/health")
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


def test_content_business():
    r = requests.get(f"{API}/content/business")
    assert r.status_code == 200
    data = r.json()
    assert data.get("_meta", {}).get("source") == "public_sheet", data.get("_meta")
    assert data.get("business_email_address"), "business_email_address missing"


# ---------- Pincode ----------
def test_pincode_valid():
    r = requests.get(f"{API}/pincode/700055")
    assert r.status_code == 200
    assert r.json().get("state") == "West Bengal"


def test_pincode_bad_format():
    r = requests.get(f"{API}/pincode/12")
    assert r.status_code == 400


def test_pincode_not_found():
    r = requests.get(f"{API}/pincode/999999")
    assert r.status_code == 404


# ---------- Login / me / logout ----------
def test_login_and_me_and_logout():
    sess = requests.Session()
    r = sess.post(f"{API}/auth/login", json={"email": SEED_EMAIL, "password": SEED_PASSWORD})
    assert r.status_code == 200, r.text
    user = r.json()
    assert user["email"] == SEED_EMAIL
    assert "session_token" in sess.cookies

    me = sess.get(f"{API}/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == SEED_EMAIL

    lo = sess.post(f"{API}/auth/logout")
    assert lo.status_code == 200

    me2 = sess.get(f"{API}/auth/me")
    assert me2.status_code == 401


def test_login_invalid_password():
    r = requests.post(f"{API}/auth/login", json={"email": SEED_EMAIL, "password": "wrongpass"})
    assert r.status_code == 401
    body = r.json()
    msg = body.get("detail") or body.get("message") or ""
    assert "Invalid email or password" in msg


def test_login_lockout_after_5_failures():
    email = f"qa.lock.{int(time.time())}@example.org"
    codes = []
    for _ in range(6):
        r = requests.post(f"{API}/auth/login", json={"email": email, "password": "wrongpass"})
        codes.append(r.status_code)
    assert 429 in codes, f"Expected 429 after 5 failures, got {codes}"


# ---------- Full email registration flow ----------
@pytest.fixture(scope="module")
def registered_user():
    email = f"qa.{int(time.time())}@example.org"
    sess = requests.Session()

    r = sess.post(f"{API}/auth/verify-email/request", json={"email": email})
    assert r.status_code == 200, r.text
    dev_link = r.json().get("dev_link")
    assert dev_link, r.json()
    token = dev_link.split("token=")[-1]

    r2 = requests.get(f"{API}/auth/verify-email/confirm", params={"token": token})
    assert r2.status_code == 200
    assert r2.json()["email"] == email
    assert r2.json()["verified"] is True

    payload = {
        "verification_token": token,
        "name": "QA User",
        "password": "Test@1234",
        "contact_mobile": "9876543210",
        "address1": "1 Test Rd",
        "city": "Kolkata",
        "state": "West Bengal",
        "pin": "700055",
        "category": "B2C",
    }
    r3 = sess.post(f"{API}/auth/register", json=payload)
    assert r3.status_code == 200, r3.text
    user = r3.json()
    assert user.get("customer_no")
    assert "session_token" in sess.cookies

    return {"email": email, "token": token, "user": user, "session": sess}


def test_reuse_verification_token(registered_user):
    r = requests.post(f"{API}/auth/register", json={
        "verification_token": registered_user["token"],
        "name": "XY", "password": "Test@1234", "contact_mobile": "9876543210",
        "address1": "abc", "city": "Kolkata", "state": "West Bengal", "pin": "700055", "category": "B2C",
    })
    assert r.status_code == 400


def test_reregister_existing_email(registered_user):
    r = requests.post(f"{API}/auth/verify-email/request", json={"email": registered_user["email"]})
    assert r.status_code == 409


def test_register_weak_password():
    email = f"qa.weak.{int(time.time())}@example.org"
    r = requests.post(f"{API}/auth/verify-email/request", json={"email": email})
    token = r.json()["dev_link"].split("token=")[-1]
    requests.get(f"{API}/auth/verify-email/confirm", params={"token": token})
    r = requests.post(f"{API}/auth/register", json={
        "verification_token": token, "name": "XY", "password": "abc",
        "contact_mobile": "9876543210", "address1": "abc", "city": "Kolkata", "state": "West Bengal",
        "pin": "700055", "category": "B2C",
    })
    assert r.status_code == 400


def test_register_bad_category():
    email = f"qa.cat.{int(time.time())}@example.org"
    r = requests.post(f"{API}/auth/verify-email/request", json={"email": email})
    token = r.json()["dev_link"].split("token=")[-1]
    requests.get(f"{API}/auth/verify-email/confirm", params={"token": token})
    r = requests.post(f"{API}/auth/register", json={
        "verification_token": token, "name": "X", "password": "Test@1234",
        "contact_mobile": "9876543210", "address1": "a", "city": "b", "state": "c",
        "pin": "700055", "category": "XYZ",
    })
    assert r.status_code == 422


# ---------- Forgot / reset ----------
def test_forgot_and_reset(registered_user):
    email = registered_user["email"]
    r = requests.post(f"{API}/auth/forgot-password", json={"email": email})
    assert r.status_code == 200, r.text
    dev_link = r.json().get("dev_link")
    assert dev_link
    token = dev_link.split("token=")[-1]

    r2 = requests.post(f"{API}/auth/reset-password", json={"token": token, "password": "New@12345"})
    assert r2.status_code == 200

    # login with new password
    r3 = requests.post(f"{API}/auth/login", json={"email": email, "password": "New@12345"})
    assert r3.status_code == 200

    # old password fails
    r4 = requests.post(f"{API}/auth/login", json={"email": email, "password": "Test@1234"})
    assert r4.status_code == 401

    # reuse reset token
    r5 = requests.post(f"{API}/auth/reset-password", json={"token": token, "password": "Another@12345"})
    assert r5.status_code == 400


# ---------- Profile update ----------
def test_update_profile_and_reflect():
    sess = requests.Session()
    r = sess.post(f"{API}/auth/login", json={"email": SEED_EMAIL, "password": SEED_PASSWORD})
    assert r.status_code == 200
    upd = sess.put(f"{API}/auth/me", json={"name": "Test Customer", "city": "Howrah"})
    assert upd.status_code == 200, upd.text
    me = sess.get(f"{API}/auth/me").json()
    assert me["city"] == "Howrah"
    # restore
    sess.put(f"{API}/auth/me", json={"city": "Kolkata"})


def test_me_unauthenticated():
    r = requests.get(f"{API}/auth/me")
    assert r.status_code == 401
