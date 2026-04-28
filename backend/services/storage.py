import os
import uuid
from fastapi import UploadFile, HTTPException, status
from services.supabase_client import get_supabase

BUCKET = "recommendation-images"
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
MAX_FILE_SIZE = 2 * 1024 * 1024  # 2 MB


async def upload_image(file: UploadFile, user_id: str, rec_id: str) -> str:
    """Upload an image to Supabase Storage and return its public URL."""
    content_type = file.content_type or ""
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image type '{content_type}'. Use JPEG, PNG, GIF, or WebP.",
        )

    ext = content_type.split("/")[-1].replace("jpeg", "jpg")
    path = f"{user_id}/{rec_id}.{ext}"

    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image exceeds the 2 MB size limit.",
        )

    sb = get_supabase()
    sb.storage.from_(BUCKET).upload(
        path,
        data,
        file_options={"content-type": content_type, "upsert": "true"},
    )

    public_url = sb.storage.from_(BUCKET).get_public_url(path)
    return public_url


def delete_image(image_url: str) -> None:
    """Delete an image from Supabase Storage given its public URL."""
    if not image_url:
        return
    try:
        sb = get_supabase()
        # Extract the path after the bucket name
        marker = f"/{BUCKET}/"
        idx = image_url.find(marker)
        if idx == -1:
            return
        path = image_url[idx + len(marker):]
        sb.storage.from_(BUCKET).remove([path])
    except Exception:
        pass  # Best-effort cleanup; do not fail the main operation
