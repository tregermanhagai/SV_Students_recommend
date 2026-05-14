import os
from pathlib import Path
from dotenv import load_dotenv

_root = Path(__file__).parent.parent
load_dotenv(_root / ".env")           # test credentials
load_dotenv(_root / "backend" / ".env")  # Supabase credentials

BASE_URL            = os.environ.get("BASE_URL", "https://sv-students-recommend.onrender.com")
ADMIN_EMAIL         = os.environ["ADMIN_EMAIL"]
ADMIN_PASSWORD      = os.environ["ADMIN_PASSWORD"]
SUPABASE_URL        = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
