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

# ── 1. Create the demo user ──────────────────────────────────────────────────
DEMO_EMAIL    = "hagai@svcollege.co.il"
DEMO_PASSWORD = "test1234"
DEMO_NAME     = "Hagai"

print(f"[1/3] Creating user: {DEMO_EMAIL}")

with httpx.Client() as client:
    resp = client.post(
        f"{SUPABASE_URL}/auth/v1/admin/users",
        headers=HEADERS,
        json={
            "email":         DEMO_EMAIL,
            "password":      DEMO_PASSWORD,
            "email_confirm": True,
            "user_metadata": {"full_name": DEMO_NAME},
        },
    )

user_data = resp.json()

if resp.status_code == 201:
    user_id = user_data["id"]
    print(f"      ✓ Created (id={user_id})")
elif resp.status_code == 422 and "already" in str(user_data).lower():
    # User exists — fetch by listing users and matching email
    print("      → User already exists, looking up id…")
    with httpx.Client() as client:
        list_resp = client.get(
            f"{SUPABASE_URL}/auth/v1/admin/users",
            headers=HEADERS,
            params={"per_page": 200},
        )
    users = list_resp.json().get("users", [])
    match = next((u for u in users if u.get("email") == DEMO_EMAIL), None)
    if not match:
        print(f"      ✗ Could not find existing user. Response: {user_data}")
        sys.exit(1)
    user_id = match["id"]
    print(f"      → Found (id={user_id})")
else:
    print(f"      ✗ Unexpected response {resp.status_code}: {user_data}")
    sys.exit(1)

# Upsert profile row (the DB trigger should handle this, but run just in case)
with httpx.Client() as client:
    client.post(
        f"{SUPABASE_URL}/rest/v1/profiles",
        headers={**HEADERS, "Prefer": "resolution=merge-duplicates"},
        json={"id": user_id, "name": DEMO_NAME},
    )

# ── 2. Upload Ozarak.jpg to Storage ─────────────────────────────────────────
IMAGE_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "Ozarak.jpg")
)

print(f"\n[2/3] Uploading image: {IMAGE_PATH}")

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
print(f"\n[3/3] Inserting recommendation 'Ozark'")

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
print(f"    Login : {DEMO_EMAIL}")
print(f"    Pass  : {DEMO_PASSWORD}")
