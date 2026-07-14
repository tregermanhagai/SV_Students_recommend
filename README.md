# SV Students Recommend

A practice sandbox application for SV College students to learn:
- **End-to-end (E2E) testing** using Playwright, Python, and Pytest
- **REST API testing** using Bearer token authentication
- **AI-powered features** — Movie AI Assistant powered by OpenAI + TMDb

## Production

**Live URL:** https://sv-students-recommend.onrender.com/

| Page | URL |
|------|-----|
| Login | https://sv-students-recommend.onrender.com/pages/login.html |
| Home feed | https://sv-students-recommend.onrender.com/pages/home.html |
| Movie AI Assistant | https://sv-students-recommend.onrender.com/pages/movie-ai.html |
| API docs (Swagger) | https://sv-students-recommend.onrender.com/docs |
| Accessibility statement | https://sv-students-recommend.onrender.com/accessibility.html |

---

## Demo Account

| Field    | Value                    |
|----------|--------------------------|
| Email    | admin@svcollege.co.il    |
| Password | test1234                 |

Run `python backend/seed.py` to create this account and load the sample data.

---

## Quick Start (Local Development)

### 1. Supabase Setup
1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `supabase/setup.sql`
3. Go to **Storage → New Bucket**, name it `recommendation-images`, check **Public**
4. Go to **Authentication → Providers**, enable **Email** and **Google**
5. For Google: add your Google OAuth client ID & secret (see Supabase docs)
6. Copy your keys from **Project Settings → API**:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY` (service_role key)
   - `SUPABASE_JWT_SECRET` (from Settings → API → JWT Settings)

### 2. Backend Setup
```bash
cd backend
cp .env.example .env
# Fill in your Supabase credentials and API keys in .env

python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

uvicorn main:app --reload --port 8000
```

The app is now running at http://localhost:8000
- Web UI: http://localhost:8000/pages/login.html
- API docs: http://localhost:8000/docs

### 3. Configure Frontend (for production)
Edit `frontend/js/api.js` and set:
```js
const BASE_URL    = 'https://your-backend.onrender.com';
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON = 'your-anon-key';
```

## Deploy to Render
1. Push to GitHub
2. Create a **Web Service** on Render pointing to the repo
3. Set **Root Directory** to `backend`
4. **Build command**: `pip install -r requirements.txt`
5. **Start command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Add environment variables in Render dashboard

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | — | Register |
| POST | `/auth/login` | — | Login, returns Bearer token |
| GET | `/api/recommendations` | — | List all |
| GET | `/api/recommendations/{id}` | — | Get one |
| POST | `/api/recommendations` | ✓ | Create |
| PUT | `/api/recommendations/{id}` | ✓ | Update (owner only) |
| DELETE | `/api/recommendations/{id}` | ✓ | Delete (owner only) |
| GET | `/api/recommendations/{id}/comments` | — | List comments |
| POST | `/api/recommendations/{id}/comments` | ✓ | Add comment |
| GET | `/api/profile/me` | ✓ | Get profile |
| GET | `/api/profile/token` | ✓ | Get Bearer token |
| POST | `/api/movie-ai` | ✓ | Ask Movie AI Assistant |

Full interactive docs at `/docs` (Swagger UI).

---

## Movie AI Assistant

The Movie AI page (`/pages/movie-ai.html`) lets logged-in users ask any question about movies, actors, or directors. The backend:

1. Searches **TMDb** for the most relevant movie and fetches poster, cast, genres, runtime, and trailer
2. Passes the enriched context to **OpenAI gpt-4o-mini** with a cinema-expert system prompt
3. Returns a structured JSON response with an AI-written answer and a movie info card

The assistant responds in the same language as the question (Hebrew, English, etc.) and refuses off-topic questions.

### Required environment variables

| Variable | Where to get |
|----------|-------------|
| `TMDB_API_KEY` | themoviedb.org → Settings → API → API Key |
| `OPENAI_API_KEY` | platform.openai.com → API Keys |

### Testing the Movie AI endpoint with curl

**Step 1 — Get a Bearer token:**
```bash
curl -X POST https://sv-students-recommend.onrender.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@svcollege.co.il", "password": "test1234"}'
```
Copy the `access_token` from the response.

**Step 2 — Ask a movie question:**
```bash
curl -X POST https://sv-students-recommend.onrender.com/api/movie-ai \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"question": "Tell me about The Shawshank Redemption"}'
```

**Expected response shape:**
```json
{
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
    "imdb_url": "https://www.imdb.com/title/tt0111161/",
    "trailer_url": "https://www.youtube.com/watch?v=6hB3S9bIaco"
  }
}
```

**Test cases to verify:**

| Test | Question | Expected behavior |
|------|----------|-------------------|
| Movie lookup | `"Tell me about Inception"` | Movie card + AI answer |
| Actor question | `"Who is Morgan Freeman?"` | AI answer about his career |
| Hebrew question | `"ספר לי על הסרט שינדלר"` | Response in Hebrew |
| Off-topic rejection | `"What is the capital of France?"` | `"I can only answer questions related to movies."` |
| Empty question | `""` | HTTP 422 Unprocessable Entity |

**Testing with Python (httpx):**
```python
import httpx

BASE_URL = "https://sv-students-recommend.onrender.com"

# 1. Login
resp = httpx.post(f"{BASE_URL}/auth/login", json={"email": "admin@svcollege.co.il", "password": "test1234"})
token = resp.json()["access_token"]

# 2. Ask Movie AI
headers = {"Authorization": f"Bearer {token}"}
resp = httpx.post(f"{BASE_URL}/api/movie-ai", json={"question": "Tell me about The Godfather"}, headers=headers)
data = resp.json()
print(data["answer"])
print(data["movie"]["title"], data["movie"]["rating"])
```

## Registration CAPTCHA

The registration page includes a simple **math CAPTCHA** (e.g. *"What is 4 + 7?"*) to reduce bot sign-ups.

### Bypass flag — `?skip_captcha=true`

Add `?skip_captcha=true` to the registration URL to hide the CAPTCHA field and skip validation entirely:

```
http://localhost:8000/pages/register.html?skip_captcha=true
```

This flag is intended for **automated testing only**. The Playwright `RegisterPage` page object uses it by default (`skip_captcha=True`). To test the CAPTCHA itself, call `register_page.goto(skip_captcha=False)`.

---

## Running the Tests

### Prerequisites
- Local backend running on `http://127.0.0.1:8000` (see Quick Start above)
- Image file at `C:\Data\Shawshank.png` (used by the create-recommendation sanity test)
- Admin account `hagai@svcollege.co.il` registered in the app

### Install test dependencies
```bash
pip install pytest playwright pytest-playwright httpx
playwright install chromium
```

### What the sanity suite covers

| # | Test | What it verifies |
|---|------|-----------------|
| 1 | `test_admin_creates_recommendation` | Admin logs in via UI · navigates to Add Recommendation · fills the form (category, name, recommender, URL, description, image upload) · submits · verifies the card appears in the home feed · opens the detail page · posts a 5-star comment · verifies the comment is visible |
| 2 | `test_student_cannot_delete_others_recommendations` | Creates a student account via Supabase admin API · logs in as that student · opens an admin-owned recommendation · asserts the Delete button is **not** visible in the UI · calls the DELETE endpoint directly and asserts it returns **403 Forbidden** · logs out |

Both tests run against the local server (`http://127.0.0.1:8000`) on Chromium.  
The suite uses `data-test` attributes for all selectors and the Supabase service-role key for teardown/setup.

### Run the sanity suite

The sanity suite automatically bypasses the registration CAPTCHA — no extra flag needed.
The `RegisterPage` page object navigates to `register.html?skip_captcha=true` by default,
so the CAPTCHA is hidden and skipped for all automated runs.

```bash
# From the project root
pytest tests/sanity/ -v
```

Run with a visible browser (useful for debugging):
```bash
pytest tests/sanity/ -v --headed
```

Run only sanity-marked tests across the full suite:
```bash
pytest -m sanity -v
```

To run a **single test**:
```bash
pytest tests/sanity/test_create_recommendation.py::test_admin_creates_recommendation -v
pytest tests/sanity/test_create_recommendation.py::test_student_cannot_delete_others_recommendations -v
```

---

## Project Structure
```
SV_Students_recommend/
├── backend/
│   ├── routers/
│   │   ├── movie_ai.py   POST /api/movie-ai (TMDb + OpenAI)
│   │   └── ...
│   ├── main.py
│   ├── config.py
│   └── requirements.txt
├── frontend/
│   ├── assets/      CSS, images
│   ├── pages/
│   │   ├── movie-ai.html   Movie AI Assistant page
│   │   └── ...
│   └── js/
│       ├── movie-ai.js     Movie AI frontend logic
│       └── ...
├── supabase/        Database SQL setup script
└── tests/           Playwright + Pytest test suite
    └── sanity/      Sanity / smoke tests
```
