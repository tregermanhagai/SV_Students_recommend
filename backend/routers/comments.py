from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from models.comment import CommentCreate, CommentOut
from services.supabase_client import get_supabase
from dependencies import get_current_user

router = APIRouter()


def _build_out(row: dict) -> CommentOut:
    return CommentOut(
        id=row["id"],
        recommendation_id=row["recommendation_id"],
        commenter_name=row["commenter_name"],
        rating=row["rating"],
        comment_text=row.get("comment_text"),
        created_at=str(row["created_at"]),
    )


@router.get(
    "/recommendations/{rec_id}/comments",
    response_model=List[CommentOut],
    summary="Get comments for a recommendation",
)
def get_comments(rec_id: str):
    """Returns all comments and star ratings for the given recommendation."""
    sb = get_supabase()
    result = (
        sb.table("comments")
        .select("*")
        .eq("recommendation_id", rec_id)
        .order("created_at", desc=False)
        .execute()
    )
    return [_build_out(r) for r in (result.data or [])]


@router.post(
    "/recommendations/{rec_id}/comments",
    response_model=CommentOut,
    status_code=status.HTTP_201_CREATED,
    summary="Add a comment and star rating",
)
def add_comment(
    rec_id: str,
    body: CommentCreate,
    current_user: dict = Depends(get_current_user),
):
    """
    Post a comment with a star rating (1–5) on a recommendation.
    Requires **Bearer token**. The commenter's name is taken from their profile.
    """
    sb = get_supabase()

    # Verify the recommendation exists
    rec = sb.table("recommendations").select("id").eq("id", rec_id).single().execute()
    if not rec.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recommendation not found.")

    # Fetch commenter's display name from profiles
    profile = sb.table("profiles").select("name").eq("id", current_user["id"]).execute()
    rows = profile.data or []
    commenter_name = rows[0]["name"] if rows else current_user.get("email", "Anonymous")

    row = {
        "recommendation_id": rec_id,
        "commenter_id": current_user["id"],
        "commenter_name": commenter_name,
        "rating": body.rating,
        "comment_text": body.comment_text,
    }
    result = sb.table("comments").insert(row).execute()

    if not result.data:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to save comment.")

    return _build_out(result.data[0])
