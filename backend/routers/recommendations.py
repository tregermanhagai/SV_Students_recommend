from typing import List, Optional
from fastapi import APIRouter, Depends, Form, HTTPException, Query, UploadFile, File, status
from models.recommendation import RecommendationCreate, RecommendationUpdate, RecommendationOut
from services.supabase_client import get_supabase
from services.storage import upload_image, delete_image
from dependencies import get_current_user
import uuid

router = APIRouter()


def _build_out(row: dict, comment_count: int = 0) -> RecommendationOut:
    return RecommendationOut(
        id=row["id"],
        name=row["name"],
        category=row["category"],
        description=row.get("description"),
        image_url=row.get("image_url"),
        website_link=row.get("website_link"),
        recommender_name=row["recommender_name"],
        created_by=row.get("created_by"),
        created_at=str(row["created_at"]),
        updated_at=str(row["updated_at"]),
        comment_count=comment_count,
    )


@router.get(
    "/recommendations",
    response_model=List[RecommendationOut],
    summary="List all recommendations",
)
def list_recommendations(
    category: Optional[str] = Query(None, description="Filter by category"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    """
    Returns all recommendations, newest first.
    Optionally filter by **category**: Book, Movie, Series, Activity, Other.
    """
    sb = get_supabase()
    query = sb.table("recommendations").select("*, comments(count)").order("created_at", desc=True)

    if category:
        query = query.eq("category", category)

    query = query.range(skip, skip + limit - 1)
    result = query.execute()

    rows = result.data or []
    out = []
    for row in rows:
        count = 0
        if row.get("comments") and isinstance(row["comments"], list):
            count = row["comments"][0].get("count", 0) if row["comments"] else 0
        out.append(_build_out(row, count))
    return out


@router.get(
    "/recommendations/{rec_id}",
    response_model=RecommendationOut,
    summary="Get a single recommendation",
)
def get_recommendation(rec_id: str):
    sb = get_supabase()
    result = sb.table("recommendations").select("*, comments(count)").eq("id", rec_id).single().execute()

    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recommendation not found.")

    row = result.data
    count = 0
    if row.get("comments") and isinstance(row["comments"], list):
        count = row["comments"][0].get("count", 0) if row["comments"] else 0
    return _build_out(row, count)


@router.post(
    "/recommendations",
    response_model=RecommendationOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new recommendation",
)
async def create_recommendation(
    name: str = Form(...),
    category: str = Form("Movie"),
    description: Optional[str] = Form(None),
    recommender_name: str = Form(...),
    website_link: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user),
):
    """
    Create a recommendation. Requires **Bearer token** in the Authorization header.

    Send as `multipart/form-data` to include an optional image upload.
    """
    # Check global kill-switch
    sb = get_supabase()
    setting = sb.table("system_settings").select("value").eq("key", "recommendations_enabled").execute()
    if setting.data and setting.data[0]["value"] == "false":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="New recommendations are currently disabled by the administrator.",
        )

    valid_categories = {"Book", "Movie", "Series", "Activity", "Other"}
    if category not in valid_categories:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid category. Choose from: {', '.join(valid_categories)}",
        )

    rec_id = str(uuid.uuid4())
    image_url = None

    if image and image.filename:
        image_url = await upload_image(image, current_user["id"], rec_id)

    row = {
        "id": rec_id,
        "name": name,
        "category": category,
        "description": description,
        "recommender_name": recommender_name,
        "website_link": website_link,
        "image_url": image_url,
        "created_by": current_user["id"],
    }
    result = sb.table("recommendations").insert(row).execute()

    if not result.data:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to save recommendation.")

    return _build_out(result.data[0], 0)


@router.put(
    "/recommendations/{rec_id}",
    response_model=RecommendationOut,
    summary="Update your recommendation",
)
def update_recommendation(
    rec_id: str,
    body: RecommendationUpdate,
    current_user: dict = Depends(get_current_user),
):
    """
    Update a recommendation you own. Requires **Bearer token**.
    Only the fields you provide will be updated.
    """
    sb = get_supabase()

    existing = sb.table("recommendations").select("*").eq("id", rec_id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recommendation not found.")

    if existing.data.get("created_by") != current_user["id"] and not current_user.get("is_admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only edit your own recommendations.")

    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields provided to update.")

    from datetime import datetime, timezone
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = sb.table("recommendations").update(updates).eq("id", rec_id).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Update failed.")

    # Fetch updated comment count
    count_res = sb.table("comments").select("id", count="exact").eq("recommendation_id", rec_id).execute()
    count = count_res.count or 0

    return _build_out(result.data[0], count)


@router.delete(
    "/recommendations/{rec_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete your recommendation",
)
def delete_recommendation(
    rec_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Delete a recommendation you own. Requires **Bearer token**.
    Also removes the associated image from storage.
    """
    sb = get_supabase()

    existing = sb.table("recommendations").select("*").eq("id", rec_id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recommendation not found.")

    if existing.data.get("created_by") != current_user["id"] and not current_user.get("is_admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only delete your own recommendations.")

    if existing.data.get("image_url"):
        delete_image(existing.data["image_url"])

    sb.table("recommendations").delete().eq("id", rec_id).execute()
