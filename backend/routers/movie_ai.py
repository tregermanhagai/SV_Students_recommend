"""
Movie AI router — POST /api/movie-ai

Flow:
  1. Validate question
  2. Search TMDb for movie context (if TMDB_API_KEY is configured)
  3. Call OpenAI Responses API (if OPENAI_API_KEY is configured)
  4. Return { answer, movie }

Graceful degradation:
  - No TMDB_API_KEY  → skip movie lookup, pass question to OpenAI only
  - No OPENAI_API_KEY → return movie data without AI narration (answer=null)
  - Both missing      → return informative error
"""

from __future__ import annotations

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from config import get_settings
from dependencies import get_current_user

router = APIRouter()

SYSTEM_PROMPT = """You are MovieGPT, an expert in cinema.
Answer ONLY questions related to movies, actors, directors, awards, IMDb ratings, genres, release dates and recommendations.
Detect the language of the user's question and respond in that exact language.
Never answer politics, science, programming, geography or any unrelated topic.
If a question is unrelated to movies or cinema, respond exactly: "I can only answer questions related to movies."
Base your answers on the retrieved movie database information whenever available.
Format your response with markdown where helpful (bold titles, bullet lists for cast/genres)."""

TMDB_BASE   = "https://api.themoviedb.org/3"
TMDB_IMAGE  = "https://image.tmdb.org/t/p/w342"
TMDB_FULL   = "https://image.tmdb.org/t/p/w500"


# ── Request / response models ────────────────────────────────────────────────

class MovieAIRequest(BaseModel):
    question: str = Field(
        ...,
        min_length=1,
        max_length=500,
        examples=["Tell me about The Shawshank Redemption"],
        description="A movie-related question in any language (max 500 characters).",
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {"question": "Tell me about The Shawshank Redemption"},
                {"question": "Who directed Inception?"},
                {"question": "ספר לי על הסרט שינדלר"},
            ]
        }
    }


class MovieDict(BaseModel):
    title: str | None = Field(None, description="Movie title")
    year: str | None = Field(None, description="Release year (4-digit string)")
    rating: float | None = Field(None, description="TMDb average vote (0–10)")
    genres: list[str] | None = Field(None, description="List of genre names")
    runtime: int | None = Field(None, description="Runtime in minutes")
    directors: list[str] | None = Field(None, description="Director name(s)")
    cast: list[str] | None = Field(None, description="Top 5 cast members")
    overview: str | None = Field(None, description="Short plot summary")
    poster_url: str | None = Field(None, description="TMDb poster image URL (w342)")
    poster_full: str | None = Field(None, description="TMDb poster image URL (w500)")
    imdb_id: str | None = Field(None, description="IMDb title ID (e.g. tt0111161)")
    imdb_url: str | None = Field(None, description="Full IMDb title URL")
    trailer_url: str | None = Field(None, description="YouTube trailer URL")


class MovieAIResponse(BaseModel):
    answer: str | None = Field(
        None,
        description=(
            "AI-generated answer in the same language as the question, "
            "formatted as Markdown. `null` when OPENAI_API_KEY is not configured."
        ),
    )
    movie: MovieDict | None = Field(
        None,
        description=(
            "Enriched movie data from TMDb (poster, cast, rating, trailer, IMDb link). "
            "`null` when no matching movie was found or TMDB_API_KEY is not configured."
        ),
    )


# ── TMDb helpers ─────────────────────────────────────────────────────────────

def _tmdb_get(path: str, params: dict, api_key: str) -> dict | None:
    """Synchronous TMDb GET; returns None on any error."""
    try:
        with httpx.Client(timeout=8.0) as client:
            resp = client.get(
                f"{TMDB_BASE}{path}",
                params={"api_key": api_key, **params},
            )
        if resp.status_code == 200:
            return resp.json()
        print(f"[TMDb] {path} returned HTTP {resp.status_code}: {resp.text[:200]}")
    except Exception as exc:
        print(f"[TMDb] request to {path} failed: {exc}")
    return None


def _fetch_tv_context(tv_id: int, api_key: str) -> tuple[str, dict | None]:
    """Fetch TV show details from TMDb and return (context, movie_dict)."""
    detail = _tmdb_get(
        f"/tv/{tv_id}",
        {"append_to_response": "credits,videos", "language": "en-US"},
        api_key,
    )
    if not detail:
        return "", None

    title    = detail.get("name", "")
    year     = (detail.get("first_air_date") or "")[:4]
    rating   = detail.get("vote_average")
    overview = detail.get("overview", "")
    genres   = [g["name"] for g in detail.get("genres", [])]
    poster   = detail.get("poster_path", "")

    crew       = detail.get("credits", {}).get("crew", [])
    directors  = [p["name"] for p in crew if p.get("job") in ("Director", "Executive Producer")][:3]
    cast       = detail.get("credits", {}).get("cast", [])[:5]
    cast_names = [p["name"] for p in cast]

    videos      = detail.get("videos", {}).get("results", [])
    trailer     = next((v for v in videos if v.get("type") == "Trailer" and v.get("site") == "YouTube"), None)
    trailer_url = f"https://www.youtube.com/watch?v={trailer['key']}" if trailer else ""

    ext = _tmdb_get(f"/tv/{tv_id}/external_ids", {}, api_key) or {}
    imdb_id = ext.get("imdb_id", "")

    context_lines = [
        f"TV Show: {title} ({year})",
        f"Rating: {rating}/10" if rating else "",
        f"Genres: {', '.join(genres)}" if genres else "",
        f"Cast: {', '.join(cast_names)}" if cast_names else "",
        f"Overview: {overview}" if overview else "",
        f"Trailer: {trailer_url}" if trailer_url else "",
        f"IMDb: https://www.imdb.com/title/{imdb_id}/" if imdb_id else "",
    ]
    context = "\n".join(line for line in context_lines if line)

    movie_dict = {
        "title":       title,
        "year":        year,
        "rating":      rating,
        "genres":      genres,
        "runtime":     None,
        "directors":   directors,
        "cast":        cast_names,
        "overview":    overview,
        "poster_url":  f"{TMDB_IMAGE}{poster}" if poster else None,
        "poster_full": f"{TMDB_FULL}{poster}" if poster else None,
        "imdb_id":     imdb_id,
        "imdb_url":    f"https://www.imdb.com/title/{imdb_id}/" if imdb_id else None,
        "trailer_url": trailer_url or None,
    }
    return context, movie_dict


def _search_multi(question: str, api_key: str) -> list[dict]:
    """
    Try progressively shorter queries (dropping words from the end) until
    TMDb returns results. This handles conversational questions like
    "The Untouchables De palma" where extra words return 0 results.
    """
    words = question.split()
    for n in range(min(len(words), 8), 0, -1):
        query = " ".join(words[:n])
        data = _tmdb_get("/search/multi", {"query": query, "language": "en-US", "page": 1}, api_key)
        if data and data.get("results"):
            print(f"[TMDb] query '{query}' → {len(data['results'])} results")
            return data["results"]
    print(f"[TMDb] no results found for any variant of: {question[:80]}")
    return []


def _fetch_movie_context(question: str, api_key: str) -> tuple[str, dict | None]:
    """
    Search TMDb for the most relevant movie or TV show, enrich with credits+videos.
    Returns (context_string, movie_dict_for_frontend).
    """
    results = _search_multi(question, api_key)
    if not results:
        return "", None

    print(f"[TMDb] top result types: {[r.get('media_type') for r in results[:5]]}")

    movie_hit = next((r for r in results if r.get("media_type") == "movie"), None)
    tv_hit    = next((r for r in results if r.get("media_type") == "tv"), None)
    person_hit = next((r for r in results if r.get("media_type") == "person"), None)

    # If asking about a person and no movie/tv found, use person's movie credits
    if not movie_hit and not tv_hit and person_hit:
        credits = _tmdb_get(f"/person/{person_hit['id']}/movie_credits", {}, api_key)
        if credits:
            cast_movies = sorted(credits.get("cast", []), key=lambda m: m.get("popularity", 0), reverse=True)
            top_titles = [m.get("title", "") for m in cast_movies[:5]]
            context = (
                f"Person: {person_hit.get('name', '')}\n"
                f"Known for movies: {', '.join(top_titles)}\n"
            )
            return context, None

    # Prefer movie over TV; fall back to TV if no movie found
    if movie_hit:
        media_type = "movie"
        hit = movie_hit
    elif tv_hit:
        media_type = "tv"
        hit = tv_hit
    else:
        print(f"[TMDb] no movie or TV hit in results")
        return "", None

    item_id = hit["id"]

    if media_type == "tv":
        return _fetch_tv_context(item_id, api_key)

    # ── Movie path ────────────────────────────────────────────────────────────
    # Enrich with credits + videos in one call
    detail = _tmdb_get(
        f"/movie/{item_id}",
        {"append_to_response": "credits,videos", "language": "en-US"},
        api_key,
    )
    if not detail:
        detail = hit

    # Extract key fields
    title     = detail.get("title", "")
    year      = (detail.get("release_date") or "")[:4]
    rating    = detail.get("vote_average")
    overview  = detail.get("overview", "")
    genres    = [g["name"] for g in detail.get("genres", [])]
    runtime   = detail.get("runtime")
    imdb_id   = detail.get("imdb_id", "")
    poster    = detail.get("poster_path", "")

    # Director from credits
    crew      = detail.get("credits", {}).get("crew", [])
    directors = [p["name"] for p in crew if p.get("job") == "Director"]

    # Top 5 cast
    cast      = detail.get("credits", {}).get("cast", [])[:5]
    cast_names = [p["name"] for p in cast]

    # YouTube trailer
    videos    = detail.get("videos", {}).get("results", [])
    trailer   = next(
        (v for v in videos if v.get("type") == "Trailer" and v.get("site") == "YouTube"),
        None,
    )
    trailer_url = f"https://www.youtube.com/watch?v={trailer['key']}" if trailer else ""

    # Build context string for OpenAI
    context_lines = [
        f"Movie: {title} ({year})",
        f"IMDb Rating: {rating}/10" if rating else "",
        f"Genres: {', '.join(genres)}" if genres else "",
        f"Runtime: {runtime} minutes" if runtime else "",
        f"Director(s): {', '.join(directors)}" if directors else "",
        f"Cast: {', '.join(cast_names)}" if cast_names else "",
        f"Overview: {overview}" if overview else "",
        f"Trailer: {trailer_url}" if trailer_url else "",
        f"IMDb: https://www.imdb.com/title/{imdb_id}/" if imdb_id else "",
    ]
    context = "\n".join(line for line in context_lines if line)

    # Movie dict for frontend card
    movie_dict = {
        "title":       title,
        "year":        year,
        "rating":      rating,
        "genres":      genres,
        "runtime":     runtime,
        "directors":   directors,
        "cast":        cast_names,
        "overview":    overview,
        "poster_url":  f"{TMDB_IMAGE}{poster}" if poster else None,
        "poster_full": f"{TMDB_FULL}{poster}" if poster else None,
        "imdb_id":     imdb_id,
        "imdb_url":    f"https://www.imdb.com/title/{imdb_id}/" if imdb_id else None,
        "trailer_url": trailer_url or None,
    }

    return context, movie_dict


# ── OpenAI helper ─────────────────────────────────────────────────────────────

def _call_openai(question: str, context: str, api_key: str) -> str:
    """Call OpenAI Responses API; raises HTTPException on failure."""
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)

        input_text = question
        if context:
            input_text = f"Movie database context:\n{context}\n\nUser question: {question}"

        response = client.responses.create(
            model="gpt-4o-mini",
            instructions=SYSTEM_PROMPT,
            input=input_text,
        )
        return response.output_text
    except Exception as exc:
        raise HTTPException(status_code=503, detail="AI service temporarily unavailable.") from exc


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post(
    "/movie-ai",
    response_model=MovieAIResponse,
    summary="Ask the Movie AI Assistant",
    description="""
Ask any question about movies, actors, directors, or get recommendations.

**Flow:**
1. The backend searches [TMDb](https://www.themoviedb.org/) for the most relevant movie.
2. Enriched context (poster, cast, rating, trailer) is passed to **OpenAI gpt-4o-mini**.
3. The model responds **in the same language as the question** (Hebrew, English, etc.).

**Graceful degradation:**
- `TMDB_API_KEY` missing → `movie` field is `null`, AI answer still returned.
- `OPENAI_API_KEY` missing → `answer` field is `null`, movie card still returned.
- Both missing → HTTP 503.

**Off-topic rejection:** if the question is unrelated to cinema the model replies:
`"I can only answer questions related to movies."`

**Auth:** Bearer token required (obtain via `POST /auth/login`).
""",
    responses={
        200: {
            "description": "AI answer and/or movie card returned successfully.",
            "content": {
                "application/json": {
                    "example": {
                        "answer": "**The Shawshank Redemption** (1994) is widely regarded as one of the greatest films ever made...",
                        "movie": {
                            "title": "The Shawshank Redemption",
                            "year": "1994",
                            "rating": 8.7,
                            "genres": ["Drama", "Crime"],
                            "runtime": 142,
                            "directors": ["Frank Darabont"],
                            "cast": ["Tim Robbins", "Morgan Freeman", "Bob Gunton", "William Sadler", "Clancy Brown"],
                            "overview": "Framed in the 1940s for the double murder of his wife and her lover...",
                            "poster_url": "https://image.tmdb.org/t/p/w342/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
                            "poster_full": "https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
                            "imdb_id": "tt0111161",
                            "imdb_url": "https://www.imdb.com/title/tt0111161/",
                            "trailer_url": "https://www.youtube.com/watch?v=6hB3S9bIaco",
                        },
                    }
                }
            },
        },
        401: {"description": "Missing or invalid Bearer token."},
        422: {"description": "Question is empty or exceeds 500 characters."},
        503: {"description": "Neither TMDB_API_KEY nor OPENAI_API_KEY is configured."},
    },
)
async def movie_ai(
    body: MovieAIRequest,
    current_user: dict = Depends(get_current_user),
):
    settings   = get_settings()
    question   = body.question.strip()
    tmdb_key   = settings.tmdb_api_key
    openai_key = settings.openai_api_key

    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    # ── Step 1: fetch movie context from TMDb ──────────────────────────────
    context    = ""
    movie_dict = None
    if tmdb_key:
        context, movie_dict = _fetch_movie_context(question, tmdb_key)

    # ── Step 2: AI answer ──────────────────────────────────────────────────
    answer = None
    if openai_key:
        answer = _call_openai(question, context, openai_key)

    # Both keys missing — return helpful message
    if not openai_key and not movie_dict:
        raise HTTPException(
            status_code=503,
            detail="Movie AI is not configured yet. Please add TMDB_API_KEY and OPENAI_API_KEY.",
        )

    return MovieAIResponse(answer=answer, movie=movie_dict)
