from fastapi import Header, HTTPException, status
from jose import JWTError, jwt
from config import get_settings


async def get_current_user(authorization: str = Header(...)) -> dict:
    """
    Validates the Supabase-issued Bearer token from the Authorization header.
    Returns the decoded user payload on success, raises HTTP 401 on failure.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token. Please log in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not authorization.startswith("Bearer "):
        raise credentials_exception

    token = authorization.removeprefix("Bearer ").strip()
    settings = get_settings()

    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
    except JWTError:
        raise credentials_exception

    user_id: str = payload.get("sub")
    if not user_id:
        raise credentials_exception

    return {
        "id": user_id,
        "email": payload.get("email", ""),
    }
