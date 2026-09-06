"""Tests for the customer_master Google Sheet sync (Module 1 bugfix, iteration_3).

After main agent renamed sheet header 'customer_ pin' -> 'customer_pin' and ran
POST /api/integrations/customer-master/sync?force=true, all rows should now show
correct customer_pin values.
"""
import os
import time
import requests
import pytest

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL missing"
API = f"{BASE_URL}/api"
APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby7Clg1ZaMOMjMNVHfaWR2aqZROeuhTRC4-dRvwGPwdfWX1wq3vK-kZ88U0AxtrPV9C/exec"
SHEET_ID = "1tlLffZ_V8ayocK4b82j1DpHMQkS76zbo"
API_KEY = "MF_DEV_Ky18O5FvW4KfQzON"
TAB = "customer_master"
SEED_EMAIL = "test.customer@madamboutique.in"
SEED_PASSWORD = "Madam@1234"


def _get_sheet_rows():
    r = requests.get(
        APPS_SCRIPT_URL,
        params={"action": "getSheet", "sheetId": SHEET_ID, "tab": TAB, "key": API_KEY},
        allow_redirects=True, timeout=30,
    )
    assert r.status_code == 200, r.text[:500]
    data = r.json()
    assert data.get("ok"), data
    return data.get("rows", [])


# ---------- Integration status ----------
def test_integrations_status_configured():
    r = requests.get(f"{API}/integrations/status")
    assert r.status_code == 200
    d = r.json()
    assert d.get("apps_script_configured") is True, d
    assert d.get("customer_master_sync_enabled") is True, d


# ---------- Regression: existing rows have correct pin after backfill ----------
def test_cust_000006_pin_backfilled():
    rows = _get_sheet_rows()
    match = [r for r in rows if r.get("customer_no") == "CUST-000006"]
    assert match, "CUST-000006 missing from sheet"
    row = match[0]
    assert row.get("customer_name") == "Rajib Sengupta"
    # Header should now be 'customer_pin' (no space); tolerate legacy space header just in case
    pin = row.get("customer_pin") or row.get("customer_ pin")
    assert pin == "411027", f"CUST-000006 pin expected 411027, got {pin!r}, row={row}"


def test_cust_000002_pin_backfilled():
    rows = _get_sheet_rows()
    match = [r for r in rows if r.get("customer_no") == "CUST-000002"]
    assert match, "CUST-000002 missing from sheet"
    row = match[0]
    pin = row.get("customer_pin") or row.get("customer_ pin")
    assert pin == "700045", f"CUST-000002 pin expected 700045, got {pin!r}, row={row}"


def test_no_legacy_space_header_column():
    """Ensure the header was actually renamed — no row should carry the old 'customer_ pin' key."""
    rows = _get_sheet_rows()
    assert rows, "no rows returned"
    legacy = [r for r in rows if "customer_ pin" in r]
    assert not legacy, f"legacy 'customer_ pin' header still present in {len(legacy)} rows"
    # positive: at least one row has the fixed key
    assert any("customer_pin" in r for r in rows), "no row has 'customer_pin' key"


# ---------- Full registration -> sheet sync ----------
@pytest.fixture(scope="module")
def registered_qa_user():
    ts = int(time.time())
    email = f"qa.pin.{ts}@example.org"
    sess = requests.Session()
    r = sess.post(f"{API}/auth/verify-email/request", json={"email": email})
    assert r.status_code == 200, r.text
    token = r.json()["dev_link"].split("token=")[-1]
    r2 = requests.get(f"{API}/auth/verify-email/confirm", params={"token": token})
    assert r2.status_code == 200
    payload = {
        "verification_token": token, "name": "QA Pin Tester", "password": "Test@1234",
        "contact_mobile": "9876512345", "address1": "5 Pin Street", "city": "Kolkata",
        "state": "West Bengal", "pin": "700055", "category": "B2C",
    }
    r3 = sess.post(f"{API}/auth/register", json=payload)
    assert r3.status_code == 200, r3.text
    user = r3.json()
    return {"email": email, "user": user, "session": sess}


def test_registration_syncs_pin_to_sheet(registered_qa_user):
    time.sleep(7)
    rows = _get_sheet_rows()
    cust_no = registered_qa_user["user"]["customer_no"]
    match = [r for r in rows if r.get("customer_no") == cust_no]
    assert len(match) == 1, f"expected 1 row for {cust_no}, got {len(match)}"
    row = match[0]
    assert row["customer_name"] == "QA Pin Tester"
    assert row["customer_email"] == registered_qa_user["email"]
    assert row["customer_contact_mbl"] == "9876512345"
    assert row["customer_city"] == "Kolkata"
    assert row["customer_state"] == "West Bengal"
    assert row["customer_category"] == "B2C"
    assert row["auth_provider"] == "email"
    pin_val = row.get("customer_pin") or row.get("customer_ pin")
    assert pin_val == "700055", f"pin mismatch, expected 700055, got {pin_val!r}"


def test_profile_update_pin_updates_same_row(registered_qa_user):
    sess = registered_qa_user["session"]
    cust_no = registered_qa_user["user"]["customer_no"]
    upd = sess.put(f"{API}/auth/me", json={"pin": "700045", "city": "Kolkata"})
    assert upd.status_code == 200, upd.text
    time.sleep(7)
    rows = _get_sheet_rows()
    match = [r for r in rows if r.get("customer_no") == cust_no]
    assert len(match) == 1, f"duplicate rows for {cust_no}: {len(match)}"
    row = match[0]
    pin_val = row.get("customer_pin") or row.get("customer_ pin")
    assert pin_val == "700045", f"pin should be updated to 700045, got {pin_val!r}"
    assert row["customer_city"] == "Kolkata"


# ---------- Mongo doc has sync flags ----------
def test_mongo_sync_flags(registered_qa_user):
    import subprocess, json
    email = registered_qa_user["email"]
    time.sleep(2)
    cmd = [
        "mongosh", "mongodb://localhost:27017/test_database", "--quiet", "--eval",
        f'JSON.stringify(db.users.findOne({{email:"{email}"}}, '
        f'{{_id:0,sheet_sync_pending:1,sheet_synced_at:1,customer_no:1}}))'
    ]
    out = subprocess.check_output(cmd, text=True).strip()
    doc = json.loads(out)
    assert doc.get("sheet_sync_pending") is False, doc
    assert doc.get("sheet_synced_at"), doc


# ---------- Force sync endpoint ----------
def test_force_sync_endpoint():
    r = requests.post(f"{API}/integrations/customer-master/sync", params={"force": "true"}, timeout=120)
    assert r.status_code == 200, r.text
    data = r.json()
    for k in ("total", "synced", "failed", "enabled"):
        assert k in data, data
    assert data["enabled"] is True
    assert data["failed"] == 0, data
    assert data["total"] >= 2, data


# ---------- Regression: seed login + public content ----------
def test_seed_login_works():
    r = requests.post(f"{API}/auth/login", json={"email": SEED_EMAIL, "password": SEED_PASSWORD})
    assert r.status_code == 200, r.text
    assert r.json().get("email") == SEED_EMAIL


def test_content_business_public_sheet_source():
    r = requests.get(f"{API}/content/business")
    assert r.status_code == 200
    body = r.json()
    meta = body.get("_meta") or {}
    assert meta.get("source") == "public_sheet", meta
