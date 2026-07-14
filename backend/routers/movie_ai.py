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
    question: str = Field(..., min_length=1, max_length=500)


class MovieAIResponse(BaseModel):
    answer: str | None
    movie: dict | None


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
    except Exception:
        pass
    return None


def _fetch_movie_context(question: str, api_key: str) -> tuple[str, dict | None]:
    """
    Search TMDb for the most relevant movie, enrich with credits+videos.
    Returns (context_string, movie_dict_for_frontend).
    """
    search = _tmdb_get("/search/multi", {"query": question, "language": "en-US", "page": 1}, api_key)
    if not search:
        return "", None

    # Pick the top movie result (skip person/tv for primary card)
    results = search.get("results", [])
    movie_hit = next((r for r in results if r.get("media_type") == "movie"), None)
    person_hit = next((r for r in results if r.get("media_type") == "person"), None)

    # If asking about a person and no movie found, use person's movie credits
    if not movie_hit and person_hit:
        credits = _tmdb_get(f"/person/{person_hit['id']}/movie_credits", {}, api_key)
        if credits:
            cast_movies = sorted(credits.get("cast", []), key=lambda m: m.get("popularity", 0), reverse=True)
            top_titles = [m.get("title", "") for m in cast_movies[:5]]
            context = (
                f"Person: {person_hit.get('name', '')}\n"
                f"Known for movies: {', '.join(top_titles)}\n"
            )
            return context, None

    if not movie_hit:
        return "", None

    movie_id = movie_hit["id"]

    # Enrich with credits + videos in one call
    detail = _tmdb_get(
        f"/movie/{movie_id}",
        {"append_to_response": "credits,videos", "language": "en-US"},
        api_key,
    )
    if not detail:
        # Fallback: use search result only
        detail = movie_hit

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

@router.post("/movie-ai", response_model=MovieAIResponse)
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
