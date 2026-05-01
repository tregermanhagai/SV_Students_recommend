/**
 * auth.js — Session management helpers.
 * All pages that need auth protection call requireAuth() at load time.
 */

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('sv_user') || 'null');
  } catch {
    return null;
  }
}

function isLoggedIn() {
  return !!localStorage.getItem('sv_token') && !!getUser();
}

function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = '/pages/login.html';
  }
}

function saveSession(data) {
  localStorage.setItem('sv_token', data.access_token);
  localStorage.setItem('sv_user', JSON.stringify({
    id:       data.id,
    name:     data.name,
    email:    data.email,
    is_admin: data.is_admin || false,
  }));
}

function isAdmin() {
  const user = getUser();
  return !!(user && user.is_admin);
}

function logout() {
  clearSession();
  window.location.href = '/pages/login.html';
}

// ── Password show/hide toggle ────────────────────────────────
const _EYE = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const _EYE_OFF = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
  <line x1="1" y1="1" x2="23" y2="23"/></svg>`;

function wirePasswordToggle(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const btn = input.parentElement.querySelector('.btn-eye');
  if (!btn) return;
  btn.innerHTML = _EYE;
  btn.setAttribute('aria-label', 'Show password');
  btn.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.innerHTML = show ? _EYE_OFF : _EYE;
    btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });
}

// Wire up logout buttons and admin System nav link
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-test="nav-logout"], [data-test="btn-logout"]')
    .forEach(el => el.addEventListener('click', (e) => { e.preventDefault(); logout(); }));

  const navSystem = document.getElementById('navSystem');
  if (navSystem && isAdmin()) navSystem.style.display = '';
});
