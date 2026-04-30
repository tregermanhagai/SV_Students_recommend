import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from config import get_settings
from routers import auth, recommendations, comments, profile, admin

settings = get_settings()

app = FastAPI(
    title="SV Students Recommend API",
    description=(
        "Practice REST API for SV College students.\n\n"
        "Use the **POST /auth/login** endpoint to get your Bearer token, "
        "then click **Authorize** above to authenticate protected endpoints."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(recommendations.router, prefix="/api", tags=["Recommendations"])
app.include_router(comments.router, prefix="/api", tags=["Comments"])
app.include_router(profile.router, prefix="/api", tags=["Profile"])
app.include_router(admin.router,  prefix="/api", tags=["Admin"])

@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/pages/login.html")


# Serve the frontend as a static site from /
# The frontend folder is one level up from backend/
_frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.isdir(_frontend_dir):
    app.mount("/", StaticFiles(directory=_frontend_dir, html=True), name="frontend")
