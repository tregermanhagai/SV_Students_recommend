from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from services.supabase_client import get_supabase
from dependencies import get_current_user

router = APIRouter()


class CartBody(BaseModel):
    items: list[dict]


@router.get("/cart", summary="Get current user's cart")
def get_cart(current_user: dict = Depends(get_current_user)):
    sb = get_supabase()
    result = sb.table("carts").select("items").eq("user_id", current_user["id"]).execute()
    items = result.data[0]["items"] if result.data else []
    return {"items": items}


@router.put("/cart", summary="Save current user's cart")
def save_cart(body: CartBody, current_user: dict = Depends(get_current_user)):
    sb = get_supabase()
    result = sb.table("carts").upsert({
        "user_id":    current_user["id"],
        "items":      body.items,
        "updated_at": "now()",
    }).execute()
    if result.data is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to save cart.")
    return {"items": body.items}
