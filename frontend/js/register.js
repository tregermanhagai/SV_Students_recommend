document.addEventListener('DOMContentLoaded', () => {
  // Redirect if already logged in
  if (isLoggedIn()) {
    window.location.href = 'home.html';
    return;
  }

  const form       = document.getElementById('registerForm');
  const errorMsg   = document.getElementById('errorMsg');
  const successMsg = document.getElementById('successMsg');
  const btnGoogle  = document.getElementById('btnGoogleRegister');

  function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.add('visible');
    successMsg.classList.remove('visible');
  }

  function showSuccess(msg) {
    successMsg.textContent = msg;
    successMsg.classList.add('visible');
    errorMsg.classList.remove('visible');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.classList.remove('visible');

    const name     = document.getElementById('name').value.trim();
    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!name)     return showError('Name is required.');
    if (!email)    return showError('Email is required.');
    if (password.length < 4) return showError('Password must be at least 4 characters.');
    if (!/^[\x20-\x7E]+$/.test(password)) return showError('Password must contain English characters only.');

    const btn = form.querySelector('[data-test="btn-register"]');
    btn.disabled = true;
    btn.textContent = 'Creating account…';

    try {
      await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      showSuccess('Account created! Redirecting to login…');
      setTimeout(() => { window.location.href = 'login.html?registered=true'; }, 1200);
    } catch (err) {
      showError(err.message || 'Registration failed. Please try again.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Create Account';
    }
  });

  btnGoogle.addEventListener('click', () => {
    // Google OAuth — Supabase handles the redirect
    // Requires SUPABASE_URL and SUPABASE_ANON to be set in api.js
    if (!SUPABASE_URL) {
      alert('Google login is not configured yet. Please contact your instructor.');
      return;
    }
    const redirectTo = window.location.origin + '/pages/home.html';
    window.location.href =
      `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
  });
});
