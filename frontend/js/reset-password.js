document.addEventListener('DOMContentLoaded', () => {
  const errorMsg  = document.getElementById('errorMsg');
  const successMsg = document.getElementById('successMsg');

  function showError(msg)   { errorMsg.textContent = msg;   errorMsg.classList.add('visible');   successMsg.classList.remove('visible'); }
  function showSuccess(msg) { successMsg.textContent = msg; successMsg.classList.add('visible'); errorMsg.classList.remove('visible'); }

  // Extract recovery token from URL fragment
  const fragment   = new URLSearchParams(window.location.hash.slice(1));
  const token      = fragment.get('access_token');
  const tokenType  = fragment.get('type');

  if (!token || tokenType !== 'recovery') {
    showError('Invalid or expired reset link. Please request a new one.');
    document.getElementById('resetForm').style.display = 'none';
    return;
  }

  // Clear token from URL bar
  history.replaceState(null, '', window.location.pathname);

  wirePasswordToggle('newPassword');
  wirePasswordToggle('confirmPassword');

  document.getElementById('resetForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPw  = document.getElementById('newPassword').value;
    const confPw = document.getElementById('confirmPassword').value;

    if (newPw.length < 4)   return showError('Password must be at least 4 characters.');
    if (!/^[\x20-\x7E]+$/.test(newPw)) return showError('Password must contain English characters only.');
    if (newPw !== confPw)   return showError('Passwords do not match.');

    const btn = document.querySelector('[data-test="btn-reset-password"]');
    btn.disabled = true; btn.textContent = 'Saving…';
    errorMsg.classList.remove('visible');

    try {
      // Use the recovery token to authenticate this one request
      localStorage.setItem('sv_token', token);
      await apiFetch('/api/profile/password', {
        method: 'PUT',
        body: JSON.stringify({ new_password: newPw }),
      });
      clearSession();
      showSuccess('Password updated! Redirecting to login…');
      setTimeout(() => { window.location.href = 'login.html'; }, 1800);
    } catch (err) {
      clearSession();
      showError(err.message || 'Failed to set new password. The link may have expired.');
      btn.disabled = false; btn.textContent = 'Set New Password';
    }
  });
});
