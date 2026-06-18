"""
Weekly reset script — clears all recommendations and their storage images,
then inserts one sample Movie recommendation (The Shawshank Redemption).

Users and profiles are NOT touched.

Run from the backend/ directory (with .env present):
    python reset.py
"""

import json
import os
import sys
import uuid
import mimetypes

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

# Set to False to skip execution without changing the schedule
ENABLED = True

if not ENABLED:
    print("[SKIP] Reset is disabled (ENABLED = False). Nothing was changed.")
    sys.exit(0)

# ── Step 1: fetch all existing recommendations ───────────────────────────────
print("[1/4] Fetching all recommendations...")

with httpx.Client() as client:
    resp = client.get(
        f"{SUPABASE_URL}/rest/v1/recommendations",
        headers=HEADERS,
        params={"select": "id,image_url"},
    )

if resp.status_code != 200:
    print(f"  [FAIL] Failed to fetch recommendations {resp.status_code}: {resp.text}")
    sys.exit(1)

recommendations = resp.json()
print(f"  -> Found {len(recommendations)} recommendation(s)")

# ── Step 2: delete storage images ────────────────────────────────────────────
print("[2/4] Deleting storage images...")

image_prefix = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/"
storage_paths = []
for rec in recommendations:
    url = rec.get("image_url") or ""
    if url.startswith(image_prefix):
        storage_paths.append(url[len(image_prefix):])

if storage_paths:
    with httpx.Client() as client:
        del_resp = client.request(
            "DELETE",
            f"{SUPABASE_URL}/storage/v1/object/{BUCKET}",
            headers=HEADERS,
            content=json.dumps({"prefixes": storage_paths}),
        )
    if del_resp.status_code in (200, 204):
        print(f"  [OK] Deleted {len(storage_paths)} image(s) from storage")
    else:
        # Non-fatal — continue even if some images are already gone
        print(f"  [WARN] Storage delete returned {del_resp.status_code}: {del_resp.text}")
else:
    print("  -> No images to delete")

# ── Step 3: delete all recommendations (comments cascade via FK) ─────────────
print("[3/4] Deleting all recommendations...")

with httpx.Client() as client:
    del_resp = client.delete(
        f"{SUPABASE_URL}/rest/v1/recommendations",
        headers={**HEADERS, "Prefer": "return=minimal"},
        # PostgREST requires at least one filter for DELETE; neq id null matches all rows
        params={"id": "neq.00000000-0000-0000-0000-000000000000"},
    )

if del_resp.status_code in (200, 204):
    print(f"  [OK] All recommendations deleted")
else:
    print(f"  [FAIL] Delete failed {del_resp.status_code}: {del_resp.text}")
    sys.exit(1)

# ── Step 4: look up admin user id ─────────────────────────────────────────────
print(f"[4/4] Inserting sample Movie recommendation...")

with httpx.Client() as client:
    profiles_resp = client.get(
        f"{SUPABASE_URL}/rest/v1/profiles",
        headers=HEADERS,
        params={"is_admin": "eq.true", "select": "id", "limit": "1"},
    )

profiles = profiles_resp.json()
if not profiles:
    print("  [FAIL] No admin profile found - run seed.py first")
    sys.exit(1)

admin_id = profiles[0]["id"]

# ── Step 4a: upload Shawshank.png ─────────────────────────────────────────────
IMAGE_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "seeds", "images", "Shawshank.png")
)

rec_id = str(uuid.uuid4())
content_type, _ = mimetypes.guess_type(IMAGE_PATH)
content_type = content_type or "image/png"
ext = content_type.split("/")[-1]
storage_path = f"{admin_id}/{rec_id}.{ext}"

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
    print(f"  [OK] Image uploaded -> {image_url}")
else:
    print(f"  [WARN] Image upload failed {upload_resp.status_code}: {upload_resp.text}")
    print("    Continuing without image...")
    image_url = None

# ── Step 4b: insert the sample recommendation ─────────────────────────────────
row = {
    "id":               rec_id,
    "name":             "The Shawshank Redemption",
    "category":         "Movie",
    "description": (
        "A timeless classic about hope and resilience. Andy Dufresne, a banker wrongly "
        "convicted of murder, forms an unlikely friendship with fellow inmate Red while "
        "quietly finding ways to maintain his dignity inside Shawshank State Penitentiary."
    ),
    "recommender_name": "Admin",
    "image_url":        image_url,
    "website_link":     "https://www.imdb.com/title/tt0111161/",
    "created_by":       admin_id,
}

with httpx.Client() as client:
    insert_resp = client.post(
        f"{SUPABASE_URL}/rest/v1/recommendations",
        headers={**HEADERS, "Prefer": "return=representation,resolution=merge-duplicates"},
        json=row,
    )

if insert_resp.status_code in (200, 201):
    print(f"  [OK] Sample recommendation inserted (id={rec_id})")
else:
    print(f"  [FAIL] Insert failed {insert_resp.status_code}: {insert_resp.text}")
    sys.exit(1)

print("\n[DONE] Reset complete! 1 Movie recommendation left, all users preserved.")
