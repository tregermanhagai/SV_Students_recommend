"""
Thin httpx-based Supabase client.
Mirrors the supabase-py API surface used in this project so routers need no changes.
Works on Python 3.14 ARM64 — no C-extension dependencies.
"""

import httpx
from dataclasses import dataclass, field
from typing import Any, Optional


# ── Result wrappers ──────────────────────────────────────────────────────────

@dataclass
class Result:
    data: Any = None
    count: Optional[int] = None


@dataclass
class AuthUser:
    id: str
    email: str
    user_metadata: dict = field(default_factory=dict)


@dataclass
class AuthSession:
    access_token: str


@dataclass
class AuthResult:
    user: Optional[AuthUser] = None
    session: Optional[AuthSession] = None


# ── Table query builder ──────────────────────────────────────────────────────

class TableQuery:
    def __init__(self, base_url: str, headers: dict, table: str):
        self._base_url = base_url
        self._headers = dict(headers)
        self._table = table
        self._select = "*"
        self._count = None          # "exact" | None
        self._filters: list[str] = []
        self._order: Optional[str] = None
        self._range: Optional[tuple] = None
        self._single = False
        self._operation = "select"  # select | insert | update | delete | upsert
        self._body: Any = None

    # ── Builder methods ──────────────────────────────────────────────────────

    def select(self, columns: str = "*", count: Optional[str] = None):
        self._select = columns
        self._count = count
        return self

    def eq(self, column: str, value: Any):
        self._filters.append(f"{column}=eq.{value}")
        return self

    def order(self, column: str, desc: bool = False):
        direction = "desc.nullslast" if desc else "asc.nullslast"
        self._order = f"{column}.{direction}"
        return self

    def range(self, start: int, end: int):
        self._range = (start, end)
        return self

    def single(self):
        self._single = True
        return self

    def insert(self, row: dict):
        self._operation = "insert"
        self._body = row
        return self

    def upsert(self, row: dict, on_conflict: str = ""):
        self._operation = "upsert"
        self._body = row
        self._on_conflict = on_conflict
        return self

    def update(self, data: dict):
        self._operation = "update"
        self._body = data
        return self

    def delete(self):
        self._operation = "delete"
        return self

    # ── Execute ──────────────────────────────────────────────────────────────

    def execute(self) -> Result:
        url = f"{self._base_url}/rest/v1/{self._table}"
        headers = dict(self._headers)
        params: dict[str, str] = {}
        count_result: Optional[int] = None

        if self._operation == "select":
            params["select"] = self._select
            for f in self._filters:
                k, v = f.split("=", 1)
                params[k] = v
            if self._order:
                params["order"] = self._order
            if self._single:
                headers["Accept"] = "application/vnd.pgrst.object+json"
            if self._count == "exact":
                headers["Prefer"] = "count=exact"
            if self._range:
                headers["Range"] = f"{self._range[0]}-{self._range[1]}"
            headers["Content-Type"] = "application/json"

            resp = httpx.get(url, headers=headers, params=params)
            resp.raise_for_status()

            if self._count == "exact":
                cr = resp.headers.get("content-range", "")
                try:
                    count_result = int(cr.split("/")[-1])
                except (ValueError, IndexError):
                    count_result = 0

            data = resp.json() if resp.content else (None if self._single else [])
            return Result(data=data, count=count_result)

        elif self._operation == "insert":
            headers["Content-Type"] = "application/json"
            headers["Prefer"] = "return=representation"
            resp = httpx.post(url, headers=headers, json=self._body)
            resp.raise_for_status()
            data = resp.json()
            # PostgREST returns a list on insert; unwrap to list for consistency
            return Result(data=data if isinstance(data, list) else [data])

        elif self._operation == "upsert":
            headers["Content-Type"] = "application/json"
            prefer = "return=representation,resolution=merge-duplicates"
            headers["Prefer"] = prefer
            on_conflict = getattr(self, "_on_conflict", "")
            if on_conflict:
                params["on_conflict"] = on_conflict
            for f in self._filters:
                k, v = f.split("=", 1)
                params[k] = v
            resp = httpx.post(url, headers=headers, json=self._body, params=params)
            resp.raise_for_status()
            data = resp.json()
            return Result(data=data if isinstance(data, list) else [data])

        elif self._operation == "update":
            headers["Content-Type"] = "application/json"
            headers["Prefer"] = "return=representation"
            for f in self._filters:
                k, v = f.split("=", 1)
                params[k] = v
            resp = httpx.patch(url, headers=headers, json=self._body, params=params)
            resp.raise_for_status()
            data = resp.json()
            return Result(data=data if isinstance(data, list) else [data])

        elif self._operation == "delete":
            for f in self._filters:
                k, v = f.split("=", 1)
                params[k] = v
            resp = httpx.delete(url, headers=headers, params=params)
            resp.raise_for_status()
            return Result(data=None)

        return Result()


# ── Storage ──────────────────────────────────────────────────────────────────

class StorageBucket:
    def __init__(self, base_url: str, headers: dict, bucket: str):
        self._base_url = base_url
        self._headers = headers
        self._bucket = bucket

    def upload(self, path: str, data: bytes, file_options: dict = None):
        file_options = file_options or {}
        content_type = file_options.get("content-type", "application/octet-stream")
        upsert = file_options.get("upsert", "false")
        headers = {
            "apikey":        self._headers["apikey"],
            "Authorization": self._headers["Authorization"],
            "Content-Type":  content_type,
            "x-upsert":      upsert,
        }
        url = f"{self._base_url}/storage/v1/object/{self._bucket}/{path}"
        resp = httpx.post(url, headers=headers, content=data)
        resp.raise_for_status()
        return resp.json()

    def get_public_url(self, path: str) -> str:
        return f"{self._base_url}/storage/v1/object/public/{self._bucket}/{path}"

    def remove(self, paths: list[str]):
        url = f"{self._base_url}/storage/v1/object/{self._bucket}"
        headers = dict(self._headers)
        headers["Content-Type"] = "application/json"
        resp = httpx.delete(url, headers=headers, json={"prefixes": paths})
        resp.raise_for_status()
        return resp.json()


class Storage:
    def __init__(self, base_url: str, headers: dict):
        self._base_url = base_url
        self._headers = headers

    def from_(self, bucket: str) -> StorageBucket:
        return StorageBucket(self._base_url, self._headers, bucket)


# ── Auth ─────────────────────────────────────────────────────────────────────

class Auth:
    def __init__(self, base_url: str, headers: dict):
        self._base_url = base_url
        self._headers = headers

    def sign_up(self, credentials: dict) -> AuthResult:
        payload = {
            "email":    credentials["email"],
            "password": credentials["password"],
        }
        options = credentials.get("options", {})
        user_meta = options.get("data", {})
        if user_meta:
            payload["data"] = user_meta

        resp = httpx.post(
            f"{self._base_url}/auth/v1/signup",
            headers=self._headers,
            json=payload,
        )
        if resp.status_code not in (200, 201):
            raise Exception(resp.json().get("msg") or resp.text)

        body = resp.json()
        user_data = body.get("user") or body
        session_data = body.get("session")

        user = AuthUser(
            id=user_data["id"],
            email=user_data.get("email", ""),
            user_metadata=user_data.get("user_metadata") or user_meta,
        )
        session = AuthSession(access_token=session_data["access_token"]) if session_data else None
        return AuthResult(user=user, session=session)

    def sign_in_with_password(self, credentials: dict) -> AuthResult:
        resp = httpx.post(
            f"{self._base_url}/auth/v1/token?grant_type=password",
            headers=self._headers,
            json={
                "email":    credentials["email"],
                "password": credentials["password"],
            },
        )
        if resp.status_code != 200:
            raise Exception("Invalid email or password.")

        body = resp.json()
        user_data = body.get("user", {})
        user = AuthUser(
            id=user_data["id"],
            email=user_data.get("email", ""),
            user_metadata=user_data.get("user_metadata", {}),
        )
        session = AuthSession(access_token=body["access_token"])
        return AuthResult(user=user, session=session)


# ── Client ───────────────────────────────────────────────────────────────────

class SupabaseHTTPClient:
    def __init__(self, url: str, service_key: str):
        self._url = url.rstrip("/")
        self._service_key = service_key
        self._headers = {
            "apikey":        service_key,
            "Authorization": f"Bearer {service_key}",
        }
        self.auth    = Auth(self._url, self._headers)
        self.storage = Storage(self._url, self._headers)

    def table(self, name: str) -> TableQuery:
        return TableQuery(self._url, self._headers, name)
