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
    id:    data.id,
    name:  data.name,
    email: data.email,
  }));
}

function logout() {
  clearSession();
  window.location.href = '/pages/login.html';
}

// Wire up any logout buttons on the page
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-test="nav-logout"], [data-test="btn-logout"]')
    .forEach(el => el.addEventListener('click', (e) => { e.preventDefault(); logout(); }));
});
