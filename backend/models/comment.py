from typing import Optional
from pydantic import BaseModel, Field


class CommentCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5, description="Star rating from 1 to 5")
    comment_text: Optional[str] = None


class CommentOut(BaseModel):
    id: str
    recommendation_id: str
    commenter_id: Optional[str] = None
    commenter_name: str
    rating: int
    comment_text: Optional[str]
    created_at: str
