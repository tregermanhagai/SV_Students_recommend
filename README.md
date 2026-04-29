# SV Students Recommend

A practice sandbox application for SV College students to learn:
- **End-to-end (E2E) testing** using Playwright, Python, and Pytest
- **REST API testing** using Bearer token authentication

## Demo Account

| Field    | Value                    |
|----------|--------------------------|
| Email    | hagai@svcollege.co.il    |
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
# Fill in your Supabase credentials in .env

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

Full interactive docs at `/docs` (Swagger UI).

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
- Admin account `hagai@svcollage.co.il` registered in the app

### Install test dependencies
```bash
pip install pytest playwright pytest-playwright httpx
playwright install chromium
```

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

Run only sanity-marked tests:
```bash
pytest -m sanity -v
```

---

## Project Structure
```
SV_Students_recommend/
├── backend/         FastAPI Python backend
├── frontend/        Vanilla HTML/CSS/JS frontend
│   ├── assets/      CSS, images
│   ├── pages/       HTML pages
│   └── js/          JavaScript modules
├── supabase/        Database SQL setup script
└── tests/           Playwright + Pytest test suite
    └── sanity/      Sanity / smoke tests
```
