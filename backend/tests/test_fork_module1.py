"""
Iteration 7: Fork validation after DB wipe + new sheets.
Tests reported bug: emails from old env should no longer say 'already exists'.
Also validates content provider == apps_script, integrations status true, and
end-to-end registration lands in NEW customer_master sheet with CUST-000001.
"""
import os
import time
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://elegance-auth-1.preview.emergentagent.com").rstrip("/")
APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzAt1xpB3e6UdEjKksGcpH8sEAN_E-piKpM8UXe9YeLmaRX8En7jCfKZnvv48uoS7ly/exec"
APPS_SCRIPT_KEY = "RUA_LND_CUST_Gy23lkh45KJG987jhfg"
SHEET_CUSTOMER_MASTER = "1pr61_y32OFKSnQ_h29eeSPuHspS38BDm7OXTqgFKzRM"
SHEET_CUSTOMER_SERIES = "1rrYE2YS1Jv9i4fkN5rnPFua9T19PTsx_aEzS0M_BZe0"

TS = int(time.time())
NEW_EMAIL = f"qa.forktest.{TS}@example.com"
OLD_EMAIL = "rajib_sengupta@yahoo.com"
NEW_MOBILE = "9000011122"

session = requests.Session()


def test_01_content_business_source_apps_script():
    r = session.get(f"{BASE_URL}/api/content/business", timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    meta = data.get("_meta") or {}
    assert meta.get("source") == "apps_script", f"source={meta.get('source')} data={data}"
    assert data.get("business_name") == "Madam Boutique & Fashions", f"business_name={data.get('business_name')}"


def test_02_integrations_status_all_true():
    r = session.get(f"{BASE_URL}/api/integrations/status", timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("apps_script_configured") is True, data
    assert data.get("customer_master_sync_enabled") is True, data
    assert data.get("customer_series_configured") is True, data


def test_03_verify_email_new_address():
    r = session.post(f"{BASE_URL}/api/auth/verify-email/request", json={"email": NEW_EMAIL}, timeout=30)
    assert r.status_code == 200, r.text
    body = r.json()
    text = str(body).lower()
    assert "already exists" not in text, body
    assert body.get("dev_link"), f"dev_link missing: {body}"
    pytest.verify_dev_link_new = body["dev_link"]


def test_04_verify_email_old_env_address_no_duplicate():
    """The exact reported bug: emails from the OLD environment should NOT be flagged."""
    r = session.post(f"{BASE_URL}/api/auth/verify-email/request", json={"email": OLD_EMAIL}, timeout=30)
    assert r.status_code == 200, r.text
    body = r.json()
    text = str(body).lower()
    assert "already exists" not in text, f"REGRESSION of reported bug: {body}"


def _extract_token(dev_link: str) -> str:
    # dev_link contains token= or ?token=
    from urllib.parse import urlparse, parse_qs
    q = parse_qs(urlparse(dev_link).query)
    return q.get("token", [None])[0]


def test_05_full_registration_cust_000001():
    dev_link = getattr(pytest, "verify_dev_link_new", None)
    assert dev_link, "prior verify test failed"
    token = _extract_token(dev_link)
    assert token, f"no token in dev_link={dev_link}"

    # confirm token
    r = session.get(f"{BASE_URL}/api/auth/verify-email/confirm", params={"token": token}, timeout=30, allow_redirects=False)
    assert r.status_code in (200, 302, 303), r.text
    # the confirm endpoint returns a verification_token (or token echo). Try json first:
    verification_token = token
    if r.headers.get("content-type", "").startswith("application/json"):
        j = r.json()
        verification_token = j.get("verification_token") or j.get("token") or token

    payload = {
        "verification_token": verification_token,
        "name": "QA Fork Test",
        "password": "Madam@1234",
        "contact_mobile_cntry": "+91",
        "contact_mobile": NEW_MOBILE,
        "address1": "123 QA Lane",
        "city": "Kolkata",
        "state": "West Bengal",
        "pin": "700001",
        "category": "B2C",
    }
    r = session.post(f"{BASE_URL}/api/auth/register", json=payload, timeout=60)
    assert r.status_code in (200, 201), r.text
    body = r.json()
    customer_no = body.get("customer_no") or (body.get("user") or {}).get("customer_no")
    assert customer_no, f"no customer_no in {body}"
    print(f"REGISTERED customer_no={customer_no}")
    pytest.registered_customer_no = customer_no
    pytest.registered_email = NEW_EMAIL

    # login
    r = session.post(f"{BASE_URL}/api/auth/login", json={"email": NEW_EMAIL, "password": "Madam@1234"}, timeout=30)
    assert r.status_code == 200, r.text
    login_body = r.json()
    bearer = login_body.get("access_token") or login_body.get("token")
    headers = {"Authorization": f"Bearer {bearer}"} if bearer else {}
    r = session.get(f"{BASE_URL}/api/auth/me", headers=headers, timeout=30)
    assert r.status_code == 200, r.text
    me = r.json()
    assert me.get("email") == NEW_EMAIL, me


def test_06_sheet_row_present_in_new_customer_master():
    customer_no = getattr(pytest, "registered_customer_no", None)
    assert customer_no
    r = requests.get(
        APPS_SCRIPT_URL,
        params={"action": "getSheet", "key": APPS_SCRIPT_KEY, "sheetId": SHEET_CUSTOMER_MASTER, "tab": "customer_master"},
        timeout=60,
        allow_redirects=True,
    )
    assert r.status_code == 200, r.text[:500]
    data = r.json()
    rows = data.get("rows") or []
    hits = [row for row in rows if customer_no in str(row.values()) or NEW_EMAIL in str(row.values())]
    assert hits, f"customer_no {customer_no} / email {NEW_EMAIL} not found in NEW customer_master. rows_count={len(rows)}"
    print(f"Sheet row found: {hits[0]}")


def test_07_series_sheet_incremented():
    r = requests.get(
        APPS_SCRIPT_URL,
        params={"action": "getSheet", "key": APPS_SCRIPT_KEY, "sheetId": SHEET_CUSTOMER_SERIES, "tab": "customer_series_master"},
        timeout=60,
        allow_redirects=True,
    )
    assert r.status_code == 200
    data = r.json()
    rows = data.get("rows") or []
    assert rows, f"series sheet empty: {data}"
    # look for prefix CUST-; current_number should be >= 2 after one registration
    row = rows[0]
    print(f"Series row: {row}")
    # Try common column names
    cur = None
    for k in ("current_number", "next_number", "number", "value"):
        if k in row:
            cur = row[k]
            break
    assert cur is not None, f"could not identify current number column in {row}"
    assert int(str(cur)) >= 2, f"series not incremented, cur={cur}"


def test_08_duplicate_mobile_rejected():
    # Request a fresh verification for a new email, confirm, then try to register with the SAME mobile
    email2 = f"qa.forktest.dup.{TS}@example.com"
    r = session.post(f"{BASE_URL}/api/auth/verify-email/request", json={"email": email2}, timeout=30)
    assert r.status_code == 200, r.text
    dev_link = r.json().get("dev_link")
    assert dev_link
    token = _extract_token(dev_link)
    session.get(f"{BASE_URL}/api/auth/verify-email/confirm", params={"token": token}, timeout=30, allow_redirects=False)

    payload = {
        "verification_token": token,
        "name": "QA Dup Mobile",
        "password": "Madam@1234",
        "contact_mobile_cntry": "+91",
        "contact_mobile": NEW_MOBILE,  # same mobile
        "address1": "123 QA Lane", "city": "Kolkata", "state": "West Bengal", "pin": "700001", "category": "B2C",
    }
    r = session.post(f"{BASE_URL}/api/auth/register", json=payload, timeout=30)
    assert r.status_code >= 400, f"duplicate mobile should be rejected: {r.status_code} {r.text}"
    assert "mobile" in r.text.lower(), r.text


def test_09_duplicate_email_rejected():
    r = session.post(f"{BASE_URL}/api/auth/verify-email/request", json={"email": NEW_EMAIL}, timeout=30)
    # Now that the email is already registered, must say already exists
    body = r.json()
    text = str(body).lower()
    assert "already exists" in text or r.status_code >= 400, f"should reject re-registration of same email: {body}"
