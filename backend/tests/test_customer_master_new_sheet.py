"""Iteration 4: verify GOOGLE_SHEET_ID_CUSTOMER_MASTER switch to NEW sheet.

NEW sheet: 1jpiygdMaW47DUt8ogKXaOsw773l3j80HDVsc8v6DGhQ (native Google Sheet, tab customer_master)
OLD sheet: 1tlLffZ_V8ayocK4b82j1DpHMQkS76zbo (must NOT receive new writes)
"""
import os
import time
import requests
import pytest

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL missing"
API = f"{BASE_URL}/api"
APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby7Clg1ZaMOMjMNVHfaWR2aqZROeuhTRC4-dRvwGPwdfWX1wq3vK-kZ88U0AxtrPV9C/exec"
NEW_SHEET_ID = "1jpiygdMaW47DUt8ogKXaOsw773l3j80HDVsc8v6DGhQ"
OLD_SHEET_ID = "1tlLffZ_V8ayocK4b82j1DpHMQkS76zbo"
API_KEY = "MF_DEV_Ky18O5FvW4KfQzON"
TAB = "customer_master"
SEED_EMAIL = "test.customer@madamboutique.in"
SEED_PASSWORD = "Madam@1234"


def _get_rows(sheet_id: str):
    r = requests.get(
        APPS_SCRIPT_URL,
        params={"action": "getSheet", "sheetId": sheet_id, "tab": TAB, "key": API_KEY},
        allow_redirects=True, timeout=30,
    )
    assert r.status_code == 200, r.text[:500]
    data = r.json()
    assert data.get("ok"), data
    return data.get("rows", [])


# ---------- Integration status ----------
def test_integrations_status_configured():
    r = requests.get(f"{API}/integrations/status")
    assert r.status_code == 200, r.text
    d = r.json()
    assert d.get("apps_script_configured") is True, d
    assert d.get("customer_master_sync_enabled") is True, d


# ---------- NEW sheet has previously force-synced rows ----------
def test_new_sheet_has_cust_000002():
    rows = _get_rows(NEW_SHEET_ID)
    match = [r for r in rows if r.get("customer_no") == "CUST-000002"]
    assert match, "CUST-000002 missing in NEW sheet"
    row = match[0]
    assert row.get("customer_name") == "Test Customer", row
    pin = row.get("customer_pin") or row.get("customer_ pin")
    assert pin == "700045", f"pin got {pin!r}"


def test_new_sheet_has_cust_000006():
    rows = _get_rows(NEW_SHEET_ID)
    match = [r for r in rows if r.get("customer_no") == "CUST-000006"]
    assert match, "CUST-000006 missing in NEW sheet"
    row = match[0]
    assert row.get("customer_name") == "Rajib Sengupta", row
    pin = row.get("customer_pin") or row.get("customer_ pin")
    assert pin == "411027", f"pin got {pin!r}"


# ---------- Register new user and confirm write goes to NEW (not OLD) ----------
@pytest.fixture(scope="module")
def registered_qa_user():
    ts = int(time.time())
    email = f"qa.newsheet.{ts}@example.org"
    sess = requests.Session()
    r = sess.post(f"{API}/auth/verify-email/request", json={"email": email})
    assert r.status_code == 200, r.text
    token = r.json()["dev_link"].split("token=")[-1]
    r2 = requests.get(f"{API}/auth/verify-email/confirm", params={"token": token})
    assert r2.status_code == 200
    payload = {
        "verification_token": token, "name": "QA NewSheet Tester", "password": "Test@1234",
        "contact_mobile": "9876523456", "address1": "7 Sheet Road", "city": "Kolkata",
        "state": "West Bengal", "pin": "700055", "category": "B2B",
    }
    r3 = sess.post(f"{API}/auth/register", json=payload)
    assert r3.status_code == 200, r3.text
    return {"email": email, "user": r3.json(), "session": sess}


def test_new_customer_present_in_new_sheet(registered_qa_user):
    time.sleep(7)
    cust_no = registered_qa_user["user"]["customer_no"]
    rows = _get_rows(NEW_SHEET_ID)
    match = [r for r in rows if r.get("customer_no") == cust_no]
    assert len(match) == 1, f"expected 1 row for {cust_no} in NEW sheet, got {len(match)}"
    row = match[0]
    assert row["customer_name"] == "QA NewSheet Tester"
    assert row["customer_email"] == registered_qa_user["email"]
    assert row["customer_contact_mbl"] == "9876523456"
    assert row["customer_city"] == "Kolkata"
    assert row["customer_state"] == "West Bengal"
    pin_val = row.get("customer_pin") or row.get("customer_ pin")
    assert pin_val == "700055", f"pin got {pin_val!r}"
    assert row["customer_category"] == "B2B"
    assert row["auth_provider"] == "email"


def test_new_customer_absent_from_old_sheet(registered_qa_user):
    cust_no = registered_qa_user["user"]["customer_no"]
    rows = _get_rows(OLD_SHEET_ID)
    match = [r for r in rows if r.get("customer_no") == cust_no]
    assert not match, f"NEW customer {cust_no} was leaked to OLD sheet: {match}"


# ---------- PUT /me updates same row in NEW sheet ----------
def test_profile_update_updates_new_sheet(registered_qa_user):
    sess = registered_qa_user["session"]
    cust_no = registered_qa_user["user"]["customer_no"]
    upd = sess.put(f"{API}/auth/me", json={"city": "Howrah"})
    assert upd.status_code == 200, upd.text
    time.sleep(7)
    rows = _get_rows(NEW_SHEET_ID)
    match = [r for r in rows if r.get("customer_no") == cust_no]
    assert len(match) == 1, f"duplicate rows for {cust_no}: {len(match)}"
    assert match[0]["customer_city"] == "Howrah", match[0]


# ---------- Regression ----------
def test_seed_login_works():
    r = requests.post(f"{API}/auth/login", json={"email": SEED_EMAIL, "password": SEED_PASSWORD})
    assert r.status_code == 200, r.text
    assert r.json().get("email") == SEED_EMAIL
