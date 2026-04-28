from functools import lru_cache
from config import get_settings
from services.supabase_http import SupabaseHTTPClient


@lru_cache()
def get_supabase() -> SupabaseHTTPClient:
    settings = get_settings()
    return SupabaseHTTPClient(settings.supabase_url, settings.supabase_service_key)
