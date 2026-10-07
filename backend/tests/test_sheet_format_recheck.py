"""Iteration 6 - narrow re-check of sheet cell formatting after Apps Script redeploy
(setNumberFormat('@') on phone columns). Focused single-flow test.
"""
import os
import time
import random
import json
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://elegance-auth-1.preview.emergentagent.com").rstrip("/")
APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby7Clg1ZaMOMjMNVHfaWR2aqZROeuhTRC4-dRvwGPwdfWX1wq3vK-kZ88U0AxtrPV9C/exec"
APPS_SCRIPT_KEY = "MF_DEV_Ky18O5FvW4KfQzON"
CUST_MASTER_SHEET = "1jpiygdMaW47DUt8ogKXaOsw773l3j80HDVsc8v6DGhQ"
SERIES_SHEET = "1LbML8Iqap9PUo4I5VRQer9V6RwFhpo_LMYnUxapE7FM"


def _script_post(body):
    r = requests.post(APPS_SCRIPT_URL, json=body, allow_redirects=True, timeout=30)
    r.raise_for_status()
    return r.json()


def _get_sheet_rows(tab):
    resp = _script_post({"action": "getSheet", "sheetId": CUST_MASTER_SHEET if tab == "customer_master" else SERIES_SHEET,
                         "tab": tab, "key": APPS_SCRIPT_KEY})
    if isinstance(resp, dict) and "rows" in resp:
        return resp["rows"]
    return resp


def _find_row(rows, customer_no):
    matches = [r for r in rows if r.get("customer_no") == customer_no]
    return matches


@pytest.fixture(scope="module")
def new_user_ctx():
    ts = int(time.time())
    email = f"qa.fmt.{ts}@example.org"
    mobile = "98931" + f"{random.randint(0, 99999):05d}"
    return {"email": email, "mobile": mobile, "ts": ts}


def test_1_register_new_customer(new_user_ctx):
    s = requests.Session()
    # verify-email request
    r = s.post(f"{BASE_URL}/api/auth/verify-email/request", json={"email": new_user_ctx["email"]}, timeout=30)
    assert r.status_code == 200, r.text
    dev_link = r.json().get("dev_link")
    assert dev_link, r.json()
    token = dev_link.split("token=")[-1]
    # confirm
    r = s.get(f"{BASE_URL}/api/auth/verify-email/confirm", params={"token": token}, timeout=30, allow_redirects=False)
    assert r.status_code in (200, 302), r.text
    # register
    payload = {
        "verification_token": token,
        "name": "QA Format Tester",
        "password": "Test@1234",
        "contact_mobile_cntry": "+91",
        "contact_mobile": new_user_ctx["mobile"],
        "contact_other_cntry": "+91",
        "contact_other": "03312345678",
        "address1": "12 Park Street",
        "city": "Kolkata",
        "state": "West Bengal",
        "pin": "700055",
        "category": "B2C",
    }
    r = s.post(f"{BASE_URL}/api/auth/register", json=payload, timeout=45)
    assert r.status_code == 200, r.text
    data = r.json()
    print("REGISTER RESPONSE:", json.dumps(data, indent=2)[:800])
    user = data.get("user", data)
    cust_no = user.get("customer_no")
    assert cust_no == "CUST-000022", f"expected CUST-000022, got {cust_no}"
    new_user_ctx["customer_no"] = cust_no
    new_user_ctx["cookies"] = s.cookies.get_dict()


def test_2_sheet_row_format(new_user_ctx):
    time.sleep(5)  # allow Apps Script write to settle
    rows = _get_sheet_rows("customer_master")
    matches = _find_row(rows, "CUST-000022")
    assert len(matches) == 1, f"expected exactly 1 row, found {len(matches)}"
    row = matches[0]
    print("CUST-000022 ROW:", json.dumps(row, indent=2))
    assert row.get("customer_contact_mbl_cntry") == "+91", row
    assert row.get("customer_contact_other_cntry") == "+91", row
    assert row.get("customer_contact_other") == "03312345678", row
    mbl = str(row.get("customer_contact_mbl", ""))
    assert mbl.isdigit(), f"mobile not digits-only: {mbl}"
    assert mbl == new_user_ctx["mobile"], mbl
    ca = str(row.get("created_at", ""))
    ua = str(row.get("updated_at", ""))
    assert ca.endswith(" IST"), ca
    assert ua.endswith(" IST"), ua
    pw = row.get("password", "")
    assert pw in ("", None), f"password column not blank: {pw!r}"


def test_3_series_is_23(new_user_ctx):
    rows = _get_sheet_rows("customer_series_master")
    print("SERIES ROWS:", rows)
    # find "number" for CUST- entity or first row
    n = None
    for r in rows:
        for k, v in r.items():
            if str(k).lower() == "number":
                try:
                    n = int(v)
                except Exception:
                    pass
        if n is not None:
            break
    assert n == 23, f"expected series number 23, got {n} (rows={rows})"


def test_4_update_landline_and_verify_sheet(new_user_ctx):
    cookies = new_user_ctx.get("cookies") or {}
    assert cookies, "no cookies from registration"
    r = requests.put(
        f"{BASE_URL}/api/auth/me",
        json={"contact_other_cntry": "+1", "contact_other": "0212345678"},
        cookies=cookies,
        timeout=30,
    )
    assert r.status_code == 200, r.text
    time.sleep(6)
    rows = _get_sheet_rows("customer_master")
    matches = _find_row(rows, "CUST-000022")
    assert len(matches) == 1, f"expected exactly 1 row after update, got {len(matches)}"
    row = matches[0]
    print("POST-UPDATE ROW:", json.dumps(row, indent=2))
    assert row.get("customer_contact_other_cntry") == "+1", row
    assert row.get("customer_contact_other") == "0212345678", row
    # series unchanged
    srows = _get_sheet_rows("customer_series_master")
    n = None
    for rr in srows:
        for k, v in rr.items():
            if str(k).lower() == "number":
                try:
                    n = int(v)
                except Exception:
                    pass
    assert n == 23, f"series must still be 23, got {n}"


def test_5_regression_login_and_content():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"email": "test.customer@madamboutique.in", "password": "Madam@1234"},
               timeout=30)
    assert r.status_code == 200, r.text
    r = s.get(f"{BASE_URL}/api/content/business", timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    src = (data.get("_meta") or {}).get("source")
    assert src == "apps_script", f"expected _meta.source=apps_script, got {src}"


def test_6_cleanup_qa_mongo():
    import subprocess
    cmd = [
        "mongosh", "mongodb://localhost:27017/test_database", "--quiet", "--eval",
        'const emails = db.users.find({email:/^qa\\./}, {email:1}).toArray().map(u=>u.email); '
        'const ids = db.users.find({email:/^qa\\./}, {_id:1}).toArray().map(u=>u._id); '
        'const u = db.users.deleteMany({email:/^qa\\./}); '
        'const s = db.sessions.deleteMany({user_id:{$in: ids}}); '
        'print(JSON.stringify({emails, users_deleted:u.deletedCount, sessions_deleted:s.deletedCount}));'
    ]
    out = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    print("CLEANUP:", out.stdout, out.stderr)
    assert out.returncode == 0, out.stderr
