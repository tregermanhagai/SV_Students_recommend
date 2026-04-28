# Go-Live Guide — SV Students Recommend

This guide walks you from local testing to a live production deployment on Render + Supabase.

---

## Phase 1 — Local Testing

### 1.1 Supabase Setup (one-time)

1. Go to [supabase.com](https://supabase.com) → create a free project
2. **SQL Editor** → paste and run `supabase/setup.sql` → click Run
3. **Storage** → New Bucket → name: `recommendation-images` → toggle **Public** → Create
4. **Authentication → Providers**:
   - Enable **Email** (enabled by default)
   - Enable **Google** → paste your Google OAuth Client ID and Secret
     *(Create credentials at [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials → OAuth 2.0 Client ID)*
5. **Project Settings → API** → copy three values:
   | Variable | Where to find it |
   |---|---|
   | `SUPABASE_URL` | Project Settings → API → Project URL |
   | `SUPABASE_SERVICE_KEY` | Project Settings → API → `service_role` key |
   | `SUPABASE_JWT_SECRET` | Project Settings → API → JWT Settings → JWT Secret |

### 1.2 Backend .env

Create `backend/.env` (never commit this file — it is already in `.gitignore`):

```
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_JWT_SECRET=your-jwt-secret-here
FRONTEND_URL=http://localhost:8000
```

### 1.3 Install dependencies and run

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The app is now at **http://localhost:8000**
- Web UI: http://localhost:8000/pages/login.html
- API docs: http://localhost:8000/docs

### 1.4 Seed demo data (optional)

Run once to create the demo user and sample recommendation:

```bash
cd backend
pip install httpx python-dotenv   # only needed if not in requirements.txt
python seed.py
```

Demo credentials:
- Email: `hagai@svcollege.co.il`
- Password: `test1234`

### 1.5 Frontend config for local

Open `frontend/js/api.js` and confirm these values:

```js
const BASE_URL     = 'http://localhost:8000';
const SUPABASE_URL  = 'https://xxxxxxxxxxxx.supabase.co';   // your project URL
const SUPABASE_ANON = 'eyJhbGci...';                        // anon/public key
```

> The `SUPABASE_ANON` key is safe to put in frontend code — it is the **anon/public** key,  
> not the service_role key. Find it in Project Settings → API → `anon public`.

---

## Phase 2 — QA Checklist (before going live)

Work through this list locally before deploying.

### Auth
- [ ] Register a new account (email + password)
- [ ] Receive confirmation email and confirm account
- [ ] Login with email + password
- [ ] Login with Google OAuth
- [ ] Logout clears session and redirects to login
- [ ] Protected pages (profile, add) redirect to login when not authenticated

### Recommendations
- [ ] Home feed loads all recommendations
- [ ] Category filters (All / Book / Movie / Series / Activity / Other) work
- [ ] Add a recommendation with image → appears on home feed
- [ ] Add a recommendation without image → placeholder shown
- [ ] Click a card → detail page loads correctly
- [ ] Edit own recommendation → changes saved
- [ ] Delete own recommendation → removed from feed
- [ ] Edit/Delete buttons are hidden for recommendations you don't own

### Comments & Ratings
- [ ] Add a comment with star rating → appears in comment list
- [ ] Comment count on home card updates after posting
- [ ] "Sign in to leave a comment" shown when logged out

### Profile
- [ ] Profile page shows correct name and email
- [ ] Bearer token is displayed and copy button works
- [ ] Token works in Swagger UI at `/docs`

### API (via Swagger at `/docs`)
- [ ] `GET /api/recommendations` returns list (no auth)
- [ ] `POST /auth/login` returns token
- [ ] Authorize in Swagger → `POST /api/recommendations` creates record
- [ ] `PUT /api/recommendations/{id}` updates own record
- [ ] `DELETE /api/recommendations/{id}` deletes own record
- [ ] `PUT`/`DELETE` on another user's record returns 403

---

## Phase 3 — Go Live on Render

### 3.1 Update frontend config

Edit `frontend/js/api.js` — replace localhost with your Render URL:

```js
const BASE_URL     = 'https://sv-students-recommend.onrender.com';  // your Render URL
const SUPABASE_URL  = 'https://xxxxxxxxxxxx.supabase.co';
const SUPABASE_ANON = 'eyJhbGci...';
```

Commit and push this change **before** deploying.

### 3.2 Deploy to Render

1. Go to [render.com](https://render.com) → New → **Web Service**
2. Connect your GitHub repo: `tregermanhagai/SV_Students_recommend`
3. Set:
   | Setting | Value |
   |---|---|
   | Root Directory | `backend` |
   | Build Command | `pip install -r requirements.txt` |
   | Start Command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
   | Instance Type | Free (for testing) |

4. **Environment Variables** — add these in the Render dashboard:
   ```
   SUPABASE_URL         = https://xxxxxxxxxxxx.supabase.co
   SUPABASE_SERVICE_KEY = eyJhbGci...   (service_role key)
   SUPABASE_JWT_SECRET  = your-jwt-secret
   FRONTEND_URL         = https://sv-students-recommend.onrender.com
   ```
5. Click **Create Web Service** → Render builds and deploys automatically

### 3.3 Update Supabase Auth redirect URLs

In Supabase → **Authentication → URL Configuration**:
- **Site URL**: `https://sv-students-recommend.onrender.com`
- **Redirect URLs**: add `https://sv-students-recommend.onrender.com/**`

### 3.4 Update Google OAuth redirect URI

In Google Cloud Console → OAuth 2.0 Client → Authorized redirect URIs, add:
```
https://xxxxxxxxxxxx.supabase.co/auth/v1/callback
```
*(This is the Supabase callback, not the Render URL.)*

### 3.5 Smoke test on live

Repeat the QA checklist above on the production URL.

---

## Quick Reference

| What | Local | Production |
|---|---|---|
| App URL | http://localhost:8000 | https://your-app.onrender.com |
| API Docs | http://localhost:8000/docs | https://your-app.onrender.com/docs |
| Config file | `backend/.env` | Render environment variables |
| Frontend config | `frontend/js/api.js` (localhost) | `frontend/js/api.js` (Render URL) |

---

## Important Security Notes

- Never commit `backend/.env` to git (already in `.gitignore`)
- Only use the **anon/public** Supabase key in frontend code
- Keep the **service_role** key only in backend environment variables
- The free Render plan spins down after 15 minutes of inactivity — first load may be slow
