"""
Seed script — creates the demo user and one sample recommendation.
Uses httpx to call Supabase REST/Auth APIs directly (no supabase package needed).

Run from the backend/ directory (with .env present):
    python seed.py
"""

import os
import sys
import uuid
import mimetypes
import base64

# ── Load .env ────────────────────────────────────────────────────────────────
from dotenv import load_dotenv
load_dotenv()

import httpx

SUPABASE_URL         = os.environ["SUPABASE_URL"].rstrip("/")
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

HEADERS = {
    "apikey":        SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type":  "application/json",
}

BUCKET = "recommendation-images"

# ── Helper: create or look up a Supabase auth user ──────────────────────────
def ensure_user(email, password, name):
    with httpx.Client() as client:
        resp = client.post(
            f"{SUPABASE_URL}/auth/v1/admin/users",
            headers=HEADERS,
            json={
                "email":         email,
                "password":      password,
                "email_confirm": True,
                "user_metadata": {"full_name": name},
            },
        )
    data = resp.json()
    if resp.status_code == 201:
        uid = data["id"]
        print(f"      ✓ Created (id={uid})")
    elif resp.status_code == 422 and "already" in str(data).lower():
        print("      → Already exists, looking up id…")
        with httpx.Client() as client:
            list_resp = client.get(
                f"{SUPABASE_URL}/auth/v1/admin/users",
                headers=HEADERS,
                params={"per_page": 200},
            )
        users = list_resp.json().get("users", [])
        match = next((u for u in users if u.get("email") == email), None)
        if not match:
            print(f"      ✗ Could not find existing user. Response: {data}")
            sys.exit(1)
        uid = match["id"]
        print(f"      → Found (id={uid})")
    else:
        print(f"      ✗ Unexpected response {resp.status_code}: {data}")
        sys.exit(1)
    return uid


# ── 1. Create the demo user ──────────────────────────────────────────────────
DEMO_EMAIL    = "hagai@svcollege.co.il"
DEMO_PASSWORD = "test1234"
DEMO_NAME     = "Hagai"

print(f"[1/4] Creating user: {DEMO_EMAIL}")
user_id = ensure_user(DEMO_EMAIL, DEMO_PASSWORD, DEMO_NAME)

# Upsert profile row (DB trigger handles this on new sign-up, but run just in case)
with httpx.Client() as client:
    client.post(
        f"{SUPABASE_URL}/rest/v1/profiles",
        headers={**HEADERS, "Prefer": "resolution=merge-duplicates"},
        json={"id": user_id, "name": DEMO_NAME},
    )

# ── 1b. Create the admin user and mark both accounts as admin ────────────────
ADMIN_EMAIL    = "admin@svcollege.co.il"
ADMIN_PASSWORD = "test1234"
ADMIN_NAME     = "Admin"

print(f"\n[2/4] Creating admin user: {ADMIN_EMAIL}")
admin_id = ensure_user(ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME)

# Upsert profile with is_admin=true for admin account
with httpx.Client() as client:
    client.post(
        f"{SUPABASE_URL}/rest/v1/profiles",
        headers={**HEADERS, "Prefer": "resolution=merge-duplicates"},
        json={"id": admin_id, "name": ADMIN_NAME, "is_admin": True},
    )

# Also ensure hagai is marked as admin
ADMIN_IDS = [user_id, admin_id]
with httpx.Client() as client:
    for uid in ADMIN_IDS:
        client.patch(
            f"{SUPABASE_URL}/rest/v1/profiles",
            headers={**HEADERS, "Prefer": "return=minimal"},
            params={"id": f"eq.{uid}"},
            json={"is_admin": True},
        )
print("      ✓ is_admin=true set for both admin accounts")

# ── 2. Upload Ozarak.jpg to Storage ─────────────────────────────────────────
IMAGE_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "seeds", "images", "Ozarak.jpg")
)

print(f"\n[3/4] Uploading image: {IMAGE_PATH}")

rec_id = str(uuid.uuid4())
content_type, _ = mimetypes.guess_type(IMAGE_PATH)
content_type = content_type or "image/jpeg"
ext = content_type.split("/")[-1].replace("jpeg", "jpg")
storage_path = f"{user_id}/{rec_id}.{ext}"

with open(IMAGE_PATH, "rb") as f:
    image_data = f.read()

with httpx.Client() as client:
    upload_resp = client.post(
        f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{storage_path}",
        headers={
            "apikey":        SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            "Content-Type":  content_type,
            "x-upsert":      "true",
        },
        content=image_data,
    )

if upload_resp.status_code in (200, 201):
    image_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{storage_path}"
    print(f"      ✓ Uploaded → {image_url}")
else:
    print(f"      ✗ Upload failed {upload_resp.status_code}: {upload_resp.text}")
    print("        Continuing without image…")
    image_url = None

# ── 3. Insert the recommendation ────────────────────────────────────────────
print(f"\n[4/4] Inserting recommendation 'Ozark'")

row = {
    "id":               rec_id,
    "name":             "Ozark",
    "category":         "Series",
    "description": (
        "A highly acclaimed, dark crime thriller on Netflix, praised for its "
        "intense suspense, exceptional acting, and bleak, atmospheric cinematography."
    ),
    "recommender_name": DEMO_NAME,
    "image_url":        image_url,
    "website_link":     "https://www.netflix.com/title/80117552",
    "created_by":       user_id,
}

with httpx.Client() as client:
    insert_resp = client.post(
        f"{SUPABASE_URL}/rest/v1/recommendations",
        headers={**HEADERS, "Prefer": "return=representation,resolution=merge-duplicates"},
        json=row,
    )

if insert_resp.status_code in (200, 201):
    print(f"      ✓ Recommendation inserted (id={rec_id})")
else:
    print(f"      ✗ Insert failed {insert_resp.status_code}: {insert_resp.text}")
    sys.exit(1)

print("\n✅  Seed complete!")
print(f"    Demo  login : {DEMO_EMAIL}  /  {DEMO_PASSWORD}")
print(f"    Admin login : {ADMIN_EMAIL}  /  {ADMIN_PASSWORD}")
print(f"    hagai login : {DEMO_EMAIL}  /  {DEMO_PASSWORD}  (is_admin=true)")
