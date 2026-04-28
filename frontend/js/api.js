/**
 * api.js — Central API configuration and fetch wrapper.
 *
 * Change BASE_URL to point at your deployed backend when deploying to Render.
 * In local development, the FastAPI backend serves the frontend, so we use
 * a relative path (empty string = same origin).
 */
const BASE_URL = '';   // e.g. 'https://sv-students-recommend.onrender.com' in production

const SUPABASE_URL  = '';   // e.g. 'https://xyz.supabase.co'
const SUPABASE_ANON = '';   // Supabase anon/public key (safe to expose in browser)

/**
 * apiFetch — wraps fetch with:
 *   - Automatic base URL
 *   - Authorization: Bearer header if a token is stored
 *   - Throws an Error with the server's detail message on non-2xx
 */
async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('sv_token');
  const headers = { ...options.headers };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData — browser sets it with boundary
  if (!(options.body instanceof FormData) && !headers['Content-Type'] && options.body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (response.status === 401) {
    // Token expired or invalid — log the user out
    clearSession();
    window.location.href = '/pages/login.html';
    return;
  }

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const err = await response.json();
      detail = err.detail || JSON.stringify(err);
    } catch (_) {}
    throw new Error(detail);
  }

  if (response.status === 204) return null;
  return response.json();
}

function getAuthHeaders() {
  const token = localStorage.getItem('sv_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function clearSession() {
  localStorage.removeItem('sv_token');
  localStorage.removeItem('sv_user');
}
