document.addEventListener('DOMContentLoaded', () => {
  requireAuth();

  const user  = getUser();
  const token = localStorage.getItem('sv_token');

  // Fill basic info from localStorage immediately
  if (user) {
    document.getElementById('profileName').textContent  = user.name  || '—';
    document.getElementById('profileEmail').textContent = user.email || '—';
  }

  // Display token
  const tokenDisplay = document.getElementById('tokenDisplay');
  tokenDisplay.textContent = token || 'No token found. Please log in again.';

  // ── Copy token ──────────────────────────────────────────────
  document.getElementById('btnCopyToken').addEventListener('click', async () => {
    if (!token) return;
    const statusEl = document.getElementById('copyStatus');
    try {
      await navigator.clipboard.writeText(token);
    } catch {
      const range = document.createRange();
      range.selectNode(tokenDisplay);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
      document.execCommand('copy');
      window.getSelection().removeAllRanges();
    }
    statusEl.classList.add('visible');
    setTimeout(() => statusEl.classList.remove('visible'), 2000);
  });

  // ── Eye toggles ────────────────────────────────────────────────
  wirePasswordToggle('newPassword');
  wirePasswordToggle('confirmPassword');

  // ── Change password ─────────────────────────────────────────────
  document.getElementById('btnChangePassword').addEventListener('click', async () => {
    const newPw  = document.getElementById('newPassword').value;
    const confPw = document.getElementById('confirmPassword').value;
    const msgEl  = document.getElementById('passwordChangeMsg');

    function showPwMsg(text, ok) {
      msgEl.textContent   = text;
      msgEl.style.color   = ok ? 'green' : 'var(--danger)';
      msgEl.style.display = 'block';
    }

    if (newPw.length < 4)   return showPwMsg('Password must be at least 4 characters.', false);
    if (newPw !== confPw)   return showPwMsg('Passwords do not match.', false);

    const btn = document.getElementById('btnChangePassword');
    btn.disabled = true; btn.textContent = 'Updating…';
    msgEl.style.display = 'none';

    try {
      await apiFetch('/api/profile/password', {
        method: 'PUT',
        body: JSON.stringify({ new_password: newPw }),
      });
      document.getElementById('newPassword').value     = '';
      document.getElementById('confirmPassword').value = '';
      showPwMsg('Password updated successfully.', true);
    } catch (err) {
      showPwMsg(err.message || 'Failed to update password.', false);
    } finally {
      btn.disabled = false; btn.textContent = 'Update Password';
    }
  });

  // ── Delete account (synchronous wiring — no async dependency) ─
  const confirmPanel = document.getElementById('deleteConfirm');
  const errEl        = document.getElementById('deleteError');

  document.getElementById('btnDeleteAccount').addEventListener('click', () => {
    confirmPanel.style.display = 'block';
    errEl.style.display = 'none';
  });

  document.getElementById('btnCancelDelete').addEventListener('click', () => {
    confirmPanel.style.display = 'none';
  });

  document.getElementById('btnConfirmDelete').addEventListener('click', async () => {
    const btn = document.getElementById('btnConfirmDelete');
    btn.disabled    = true;
    btn.textContent = 'Deleting…';
    errEl.style.display = 'none';

    try {
      await apiFetch('/api/profile/me', { method: 'DELETE' });
      logout();
    } catch (err) {
      errEl.textContent   = err.message || 'Failed to delete account. Please try again.';
      errEl.style.display = 'block';
      btn.disabled    = false;
      btn.textContent = 'Yes, delete my account';
    }
  });

  // ── Load fresh profile from backend (non-critical) ────────────
  apiFetch('/api/profile/me').then(profile => {
    if (profile) {
      document.getElementById('profileName').textContent  = profile.name  || user?.name  || '—';
      document.getElementById('profileEmail').textContent = profile.email || user?.email || '—';
    }
  }).catch(() => {});
});
