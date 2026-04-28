document.addEventListener('DOMContentLoaded', async () => {
  requireAuth();

  const user = getUser();
  const token = localStorage.getItem('sv_token');

  // Fill basic info from localStorage immediately (no API round-trip needed)
  if (user) {
    document.getElementById('profileName').textContent  = user.name  || '—';
    document.getElementById('profileEmail').textContent = user.email || '—';
  }

  // Display token
  const tokenDisplay = document.getElementById('tokenDisplay');
  tokenDisplay.textContent = token || 'No token found. Please log in again.';

  // Copy token button
  document.getElementById('btnCopyToken').addEventListener('click', async () => {
    if (!token) return;
    const statusEl = document.getElementById('copyStatus');
    try {
      await navigator.clipboard.writeText(token);
      statusEl.classList.add('visible');
      setTimeout(() => statusEl.classList.remove('visible'), 2000);
    } catch {
      // Fallback for browsers without clipboard API
      const range = document.createRange();
      range.selectNode(tokenDisplay);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
      document.execCommand('copy');
      window.getSelection().removeAllRanges();
      statusEl.classList.add('visible');
      setTimeout(() => statusEl.classList.remove('visible'), 2000);
    }
  });

  // Also try fetching fresh profile from backend to sync any name updates
  try {
    const profile = await apiFetch('/api/profile/me');
    if (profile) {
      document.getElementById('profileName').textContent  = profile.name  || user?.name  || '—';
      document.getElementById('profileEmail').textContent = profile.email || user?.email || '—';
    }
  } catch (_) {
    // Non-critical — keep localStorage values
  }
});
