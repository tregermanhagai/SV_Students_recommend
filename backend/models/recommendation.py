from typing import Literal, Optional
from pydantic import BaseModel

CATEGORIES = Literal["Book", "Movie", "Series", "Activity", "Other"]


class RecommendationCreate(BaseModel):
    name: str
    category: CATEGORIES = "Movie"
    description: Optional[str] = None
    recommender_name: str
    website_link: Optional[str] = None


class RecommendationUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[CATEGORIES] = None
    description: Optional[str] = None
    recommender_name: Optional[str] = None
    website_link: Optional[str] = None


class RecommendationOut(BaseModel):
    id: str
    name: str
    category: str
    description: Optional[str]
    image_url: Optional[str]
    website_link: Optional[str]
    recommender_name: str
    created_by: Optional[str]
    created_at: str
    updated_at: str
    comment_count: int = 0
