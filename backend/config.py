from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    supabase_url: str
    supabase_service_key: str
    frontend_url: str = "http://localhost:8000"
    allowed_origins: str = ""   # comma-separated extra origins (e.g. Vercel URL)
    openai_api_key: str = ""
    tmdb_api_key: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
