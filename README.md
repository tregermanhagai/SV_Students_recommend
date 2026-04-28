# SV Students Recommend

A practice sandbox application for SV College students to learn:
- **End-to-end (E2E) testing** using Playwright, Python, and Pytest
- **REST API testing** using Bearer token authentication

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

## Project Structure
```
SV_Students_recommend/
├── backend/         FastAPI Python backend
├── frontend/        Vanilla HTML/CSS/JS frontend
│   ├── assets/      CSS, images
│   ├── pages/       HTML pages
│   └── js/          JavaScript modules
└── supabase/        Database SQL setup script
```
