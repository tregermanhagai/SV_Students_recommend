document.addEventListener('DOMContentLoaded', () => {
  // Handle Supabase OAuth callback if this page receives #access_token=...
  (function () {
    var params = {};
    window.location.hash.substring(1).split('&').forEach(function (part) {
      var eq = part.indexOf('=');
      if (eq > -1) params[decodeURIComponent(part.slice(0, eq))] = decodeURIComponent(part.slice(eq + 1));
    });
    if (params.access_token) {
      try {
        var b64     = params.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        var payload = JSON.parse(atob(b64));
        var meta    = payload.user_metadata || {};
        localStorage.setItem('sv_token', params.access_token);
        localStorage.setItem('sv_user', JSON.stringify({
          id: payload.sub, name: meta.full_name || meta.name || payload.email || '', email: payload.email || '',
        }));
        window.location.replace('home.html');
      } catch (e) { /* fall through to normal login page */ }
      return;
    }
  })();

  // Redirect if already logged in
  if (isLoggedIn()) {
    window.location.href = 'home.html';
    return;
  }

  wirePasswordToggle('password');

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
      // Save token first so apiFetch can use it for the profile request
      localStorage.setItem('sv_token', data.access_token);
      try {
        const profile = await apiFetch('/api/profile/me');
        data.is_admin = profile.is_admin || false;
      } catch { /* non-critical */ }
      saveSession(data);
      window.location.href = 'home.html';
    } catch (err) {
      showError(err.message || 'Invalid email or password.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  });

  // ── Forgot password ────────────────────────────────────────
  const forgotPanel = document.getElementById('forgotPanel');
  const forgotMsg   = document.getElementById('forgotMsg');

  document.getElementById('linkForgotPassword').addEventListener('click', (e) => {
    e.preventDefault();
    forgotPanel.style.display = 'block';
    forgotMsg.textContent = '';
    forgotMsg.style.color = '';
  });

  document.getElementById('btnCancelReset').addEventListener('click', () => {
    forgotPanel.style.display = 'none';
  });

  document.getElementById('btnSendReset').addEventListener('click', async () => {
    const email = document.getElementById('forgotEmail').value.trim();
    if (!email) { forgotMsg.textContent = 'Please enter your email.'; forgotMsg.style.color = 'var(--danger)'; return; }

    const btn = document.getElementById('btnSendReset');
    btn.disabled = true; btn.textContent = 'Sending…';
    forgotMsg.textContent = '';

    try {
      const redirectTo = window.location.origin + '/pages/reset-password.html';
      await apiFetch('/auth/recover', {
        method: 'POST',
        body: JSON.stringify({ email, redirect_to: redirectTo }),
      });
      forgotMsg.style.color = 'green';
      forgotMsg.textContent = 'If that email is registered, a reset link has been sent. Check your inbox.';
    } catch {
      forgotMsg.style.color = 'var(--danger)';
      forgotMsg.textContent = 'Something went wrong. Please try again.';
    } finally {
      btn.disabled = false; btn.textContent = 'Send reset link';
    }
  });

  btnGoogle.addEventListener('click', () => {
    if (!SUPABASE_URL) {
      alert('Google login is not configured yet. Please contact your instructor.');
      return;
    }
    // redirect_to must be the site root — Supabase always lands there with #access_token=...
    // index.html handles the token and forwards to home.html
    const redirectTo = window.location.origin + '/';
    window.location.href =
      `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
  });
});
