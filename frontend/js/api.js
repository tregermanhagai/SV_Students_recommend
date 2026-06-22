/**
 * api.js — Central API configuration and fetch wrapper.
 *
 * Change BASE_URL to point at your deployed backend when deploying to Render.
 * In local development, the FastAPI backend serves the frontend, so we use
 * a relative path (empty string = same origin).
 */
const BASE_URL = '';   // e.g. 'https://sv-students-recommend.onrender.com' in production

const SUPABASE_URL  = 'https://yxouogpqibndejycvztf.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4b3VvZ3BxaWJuZGVqeWN2enRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczOTExMTUsImV4cCI6MjA5Mjk2NzExNX0.cgVlUqpM1DVcgJVSbZiXZESZv_1BUhNBQbbkRdgABcg';

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

async function initCartIcon() {
  const navCart = document.getElementById('navCart');
  if (!navCart) return;
  try {
    const data = await apiFetch('/api/cart');
    const totalQty = (data.items || []).reduce((sum, i) => sum + i.quantity, 0);
    const badge = document.getElementById('cartBadge');
    if (badge) {
      badge.textContent = String(totalQty);
      badge.style.display = totalQty > 0 ? '' : 'none';
    }
  } catch (_) {}
}
