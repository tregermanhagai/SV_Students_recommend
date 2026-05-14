// Set to true to re-enable the math security check on the registration form.
const CAPTCHA_ENABLED = false;

document.addEventListener('DOMContentLoaded', () => {
  if (isLoggedIn()) {
    window.location.href = 'home.html';
    return;
  }

  // ── CAPTCHA setup ─────────────────────────────────────────────
  const captchaWrap = document.getElementById('captchaWrap');
  let captchaAnswer = null;

  if (CAPTCHA_ENABLED) {
    captchaWrap.style.display = '';
    const a = Math.floor(Math.random() * 9) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    captchaAnswer = a + b;
    document.getElementById('captchaQuestion').textContent = `What is ${a} + ${b} ?`;
  }

  wirePasswordToggle('password');

  // ── Form wiring ───────────────────────────────────────────────
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
    if (/_/.test(email.split('@')[0]))
      return showError('Email addresses with underscores are not supported. Please use a dot or remove the underscore (e.g. student1@… instead of student_1@…).');

    if (CAPTCHA_ENABLED) {
      const given = parseInt(document.getElementById('captchaInput').value, 10);
      if (isNaN(given) || given !== captchaAnswer) {
        return showError('Incorrect answer to the security check. Please try again.');
      }
    }

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
    if (!SUPABASE_URL) {
      alert('Google login is not configured yet. Please contact your instructor.');
      return;
    }
    const redirectTo = window.location.origin + '/pages/home.html';
    window.location.href =
      `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
  });
});
