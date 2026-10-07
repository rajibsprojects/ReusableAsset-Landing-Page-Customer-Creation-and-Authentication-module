"""Iteration 6 - post-run verification only.
Confirms sheet row CUST-000022 has correct formatting (+ preserved, leading 0 preserved,
digits-only mobile, IST timestamps, password blank) and series==23. Login + content regression.
"""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://elegance-auth-1.preview.emergentagent.com").rstrip("/")
APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby7Clg1ZaMOMjMNVHfaWR2aqZROeuhTRC4-dRvwGPwdfWX1wq3vK-kZ88U0AxtrPV9C/exec"
KEY = "MF_DEV_Ky18O5FvW4KfQzON"
CUST_SHEET = "1jpiygdMaW47DUt8ogKXaOsw773l3j80HDVsc8v6DGhQ"
SERIES_SHEET = "1LbML8Iqap9PUo4I5VRQer9V6RwFhpo_LMYnUxapE7FM"


def _rows(sheet_id, tab):
    r = requests.post(APPS_SCRIPT_URL,
                      json={"action": "getSheet", "sheetId": sheet_id, "tab": tab, "key": KEY},
                      allow_redirects=True, timeout=30)
    r.raise_for_status()
    return r.json()["rows"]


def test_cust_000022_sheet_formatting():
    rows = _rows(CUST_SHEET, "customer_master")
    matches = [r for r in rows if r.get("customer_no") == "CUST-000022"]
    assert len(matches) == 1, f"expected exactly 1 CUST-000022 row, got {len(matches)}"
    row = matches[0]
    # After register+update, mbl_cntry retained '+91'; other_cntry became '+1'; other became '0212345678'.
    assert row["customer_contact_mbl_cntry"] == "+91", row
    assert row["customer_contact_other_cntry"] == "+1", row
    assert row["customer_contact_other"] == "0212345678", row  # leading zero preserved
    assert str(row["customer_contact_mbl"]).isdigit(), row
    assert row["created_at"].endswith(" IST"), row
    assert row["updated_at"].endswith(" IST"), row
    assert row.get("password", "") in ("", None), row
    assert row["customer_name"] == "QA Format Tester"
    assert row["customer_category"] == "B2C"
    assert row["auth_provider"] == "email"


def test_series_at_23():
    rows = _rows(SERIES_SHEET, "customer_series_master")
    assert rows and int(rows[0]["number"]) == 23, rows


def test_login_and_business_content():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"email": "test.customer@madamboutique.in", "password": "Madam@1234"}, timeout=30)
    assert r.status_code == 200, r.text
    r = s.get(f"{BASE_URL}/api/content/business", timeout=30)
    assert r.status_code == 200, r.text
    assert (r.json().get("_meta") or {}).get("source") == "apps_script", r.json().get("_meta")
