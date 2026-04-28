document.addEventListener('DOMContentLoaded', () => {
  // Redirect if already logged in
  if (isLoggedIn()) {
    window.location.href = 'home.html';
    return;
  }

  // Show success banner if arriving from registration
  const params = new URLSearchParams(window.location.search);
  if (params.get('registered') === 'true') {
    const banner = document.getElementById('registeredBanner');
    banner.textContent = 'Account created successfully! Please sign in.';
    banner.classList.add('visible');
  }

  const form      = document.getElementById('loginForm');
  const errorMsg  = document.getElementById('errorMsg');
  const btnGoogle = document.getElementById('btnGoogleLogin');

  function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.add('visible');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.classList.remove('visible');

    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) return showError('Please enter your email and password.');

    const btn = form.querySelector('[data-test="btn-login"]');
    btn.disabled = true;
    btn.textContent = 'Signing in…';

    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      saveSession(data);
      window.location.href = 'home.html';
    } catch (err) {
      showError(err.message || 'Invalid email or password.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  });

  btnGoogle.addEventListener('click', () => {
    if (!SUPABASE_URL) {
      alert('Google login is not configured yet. Please contact your instructor.');
      return;
    }
    const redirectTo = window.location.origin + '/pages/home.html';
    window.location.href =
      `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
  });
});
