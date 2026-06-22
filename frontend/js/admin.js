document.addEventListener('DOMContentLoaded', async () => {
  requireAuth();
  initCartIcon();

  if (!isAdmin()) {
    window.location.href = 'home.html';
    return;
  }

  const loadingEl   = document.getElementById('adminLoading');
  const errorEl     = document.getElementById('adminError');
  const tableWrap   = document.getElementById('adminTableWrap');
  const tbody       = document.getElementById('adminUserRows');
  const modal       = document.getElementById('confirmModal');
  const confirmTitle = document.getElementById('confirmTitle');
  const confirmBody  = document.getElementById('confirmBody');
  const doConfirm    = document.getElementById('doConfirm');

  let confirmCallback = null;

  document.getElementById('closeConfirmModal').addEventListener('click', () => modal.classList.remove('visible'));
  document.getElementById('cancelConfirm').addEventListener('click',    () => modal.classList.remove('visible'));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('visible'); });
  doConfirm.addEventListener('click', async () => {
    if (confirmCallback) await confirmCallback();
  });

  async function loadUsers() {
    loadingEl.style.display = 'block';
    errorEl.style.display   = 'none';
    tableWrap.style.display = 'none';

    try {
      const users = await apiFetch('/api/admin/users');
      loadingEl.style.display = 'none';
      renderTable(users);
      tableWrap.style.display = 'block';
    } catch (err) {
      loadingEl.style.display = 'none';
      errorEl.textContent     = 'Failed to load users: ' + (err.message || 'Unknown error');
      errorEl.style.display   = 'block';
    }
  }

  function renderTable(users) {
    tbody.innerHTML = '';
    const currentUser = getUser();

    users.forEach(u => {
      const tr = document.createElement('tr');
      tr.setAttribute('data-test', 'admin-user-row');
      tr.setAttribute('data-id', u.id);

      const roleLabel = u.is_admin
        ? '<span style="color:var(--primary); font-weight:600">Admin</span>'
        : 'Student';

      const statusLabel = u.is_banned
        ? '<span class="badge-banned" data-test="user-status-banned">Banned</span>'
        : '<span class="badge-active" data-test="user-status-active">Active</span>';

      const isSelf = u.id === currentUser?.id;
      let actionBtn = '';
      if (!isSelf) {
        if (u.is_banned) {
          actionBtn = `<button class="btn btn-secondary btn-sm" data-test="btn-unban-user"
                         onclick="promptAction('${u.id}', '${escapeAttr(u.email)}', false)">
                         Unban
                       </button>`;
        } else if (!u.is_admin) {
          actionBtn = `<button class="btn btn-sm" data-test="btn-ban-user"
                         style="background:var(--danger); color:#fff; border:none"
                         onclick="promptAction('${u.id}', '${escapeAttr(u.email)}', true)">
                         Ban
                       </button>`;
        }
      }

      tr.innerHTML = `
        <td data-test="user-name">${escapeHtml(u.name || '—')}</td>
        <td data-test="user-email">${escapeHtml(u.email)}</td>
        <td>${roleLabel}</td>
        <td>${statusLabel}</td>
        <td>${actionBtn}</td>`;

      tbody.appendChild(tr);
    });
  }

  window.promptAction = function(userId, email, banning) {
    confirmTitle.textContent = banning ? 'Ban user?' : 'Unban user?';
    confirmBody.textContent  = banning
      ? `Ban "${email}"? They will be immediately locked out.`
      : `Unban "${email}"? They will be able to log in again.`;

    doConfirm.style.background = banning ? 'var(--danger)' : 'var(--primary)';
    doConfirm.textContent      = banning ? 'Ban user' : 'Unban user';

    confirmCallback = async () => {
      doConfirm.disabled    = true;
      doConfirm.textContent = 'Working…';
      try {
        const action = banning ? 'ban' : 'unban';
        await apiFetch(`/api/admin/users/${userId}/${action}`, { method: 'POST' });
        modal.classList.remove('visible');
        await loadUsers();
      } catch (err) {
        alert('Action failed: ' + (err.message || 'Unknown error'));
      } finally {
        doConfirm.disabled    = false;
        doConfirm.textContent = banning ? 'Ban user' : 'Unban user';
      }
    };

    modal.classList.add('visible');
  };

  await loadUsers();

  // ── Email Blacklist ─────────────────────────────────────────
  document.getElementById('btnAddBlacklist').addEventListener('click', addToBlacklist);
  document.getElementById('blacklistEmailInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addToBlacklist();
  });

  await loadBlacklist();

  // ── Kill Switch ─────────────────────────────────────────────
  await loadSettings();

  document.getElementById('btnToggleRecs').addEventListener('click', toggleRecommendations);

  // ── Delete by ID ────────────────────────────────────────────
  document.getElementById('btnDeleteRecById').addEventListener('click', deleteRecById);
  document.getElementById('deleteRecIdInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') deleteRecById();
  });
});

// ── Blacklist ──────────────────────────────────────────────────

async function loadBlacklist() {
  try {
    const rows = await apiFetch('/api/admin/blacklist');
    renderBlacklist(rows);
  } catch (err) {
    showBlacklistMsg('Failed to load blacklist: ' + err.message, false);
  }
}

function renderBlacklist(rows) {
  const tbody = document.getElementById('blacklistRows');
  const wrap  = document.getElementById('blacklistTableWrap');
  const empty = document.getElementById('blacklistEmpty');

  tbody.innerHTML = '';
  if (!rows || rows.length === 0) {
    wrap.style.display  = 'none';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  wrap.style.display  = 'block';

  rows.forEach(r => {
    const tr = document.createElement('tr');
    tr.setAttribute('data-test', 'blacklist-row');
    tr.setAttribute('data-id', r.id);
    tr.innerHTML = `
      <td data-test="blacklist-email">${escapeHtml(r.email)}</td>
      <td>${new Date(r.created_at).toLocaleDateString()}</td>
      <td><button class="btn btn-secondary btn-sm" data-test="btn-remove-blacklist"
            onclick="removeFromBlacklist('${r.id}')">Remove</button></td>`;
    tbody.appendChild(tr);
  });
}

async function addToBlacklist() {
  const input = document.getElementById('blacklistEmailInput');
  const email = input.value.trim();
  if (!email) { showBlacklistMsg('Please enter an email address.', false); return; }

  const btn = document.getElementById('btnAddBlacklist');
  btn.disabled = true; btn.textContent = 'Adding…';
  showBlacklistMsg('', null);

  try {
    await apiFetch('/api/admin/blacklist', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    input.value = '';
    showBlacklistMsg(`"${escapeHtml(email)}" has been blocked.`, true);
    await loadBlacklist();
  } catch (err) {
    showBlacklistMsg(err.message || 'Failed to add email.', false);
  } finally {
    btn.disabled = false; btn.textContent = 'Block Email';
  }
}

window.removeFromBlacklist = async function(id) {
  try {
    await apiFetch(`/api/admin/blacklist/${id}`, { method: 'DELETE' });
    await loadBlacklist();
  } catch (err) {
    showBlacklistMsg('Failed to remove: ' + err.message, false);
  }
};

function showBlacklistMsg(text, ok) {
  const el = document.getElementById('blacklistMsg');
  if (!text) { el.style.display = 'none'; return; }
  el.textContent   = text;
  el.style.color   = ok === true ? 'var(--success)' : ok === false ? 'var(--danger)' : 'inherit';
  el.style.display = 'block';
}

// ── Kill Switch ────────────────────────────────────────────────

let recsEnabled = true;

async function loadSettings() {
  try {
    const settings = await apiFetch('/api/admin/settings');
    recsEnabled = settings['recommendations_enabled'] !== 'false';
    updateKillSwitchUI();
  } catch (err) {
    document.getElementById('recStatusBadge').textContent = 'Error';
  }
}

function updateKillSwitchUI() {
  const badge = document.getElementById('recStatusBadge');
  const btn   = document.getElementById('btnToggleRecs');
  btn.disabled = false;

  if (recsEnabled) {
    badge.textContent  = 'Active';
    badge.className    = 'badge-active';
    btn.textContent    = 'Suspend New Recommendations';
    btn.style.background = 'var(--danger)';
    btn.style.color      = '#fff';
    btn.style.border     = 'none';
  } else {
    badge.textContent  = 'Suspended';
    badge.className    = 'badge-banned';
    btn.textContent    = 'Resume New Recommendations';
    btn.style.background = 'var(--success, #28a745)';
    btn.style.color      = '#fff';
    btn.style.border     = 'none';
  }
}

async function toggleRecommendations() {
  const btn = document.getElementById('btnToggleRecs');
  btn.disabled = true; btn.textContent = 'Updating…';

  const newValue = recsEnabled ? 'false' : 'true';
  try {
    await apiFetch('/api/admin/settings/recommendations_enabled', {
      method: 'PUT',
      body: JSON.stringify({ value: newValue }),
    });
    recsEnabled = newValue === 'true';
    updateKillSwitchUI();
  } catch (err) {
    alert('Failed to update setting: ' + err.message);
    btn.disabled = false;
    updateKillSwitchUI();
  }
}

// ── Delete Recommendation by ID ────────────────────────────────

async function deleteRecById() {
  const input = document.getElementById('deleteRecIdInput');
  const recId = input.value.trim();
  if (!recId) { showDeleteMsg('Please enter a recommendation ID.', false); return; }

  // Reuse the existing confirm modal
  const modal        = document.getElementById('confirmModal');
  const confirmTitle = document.getElementById('confirmTitle');
  const confirmBody  = document.getElementById('confirmBody');
  const doConfirm    = document.getElementById('doConfirm');

  confirmTitle.textContent   = 'Delete recommendation?';
  confirmBody.textContent    = `Permanently delete recommendation ID: ${recId}`;
  doConfirm.textContent      = 'Delete';
  doConfirm.style.background = 'var(--danger)';

  // Swap in a one-shot handler
  const newBtn = doConfirm.cloneNode(true);
  doConfirm.parentNode.replaceChild(newBtn, doConfirm);

  newBtn.addEventListener('click', async () => {
    newBtn.disabled = true; newBtn.textContent = 'Deleting…';
    try {
      await apiFetch(`/api/recommendations/${recId}`, { method: 'DELETE' });
      modal.classList.remove('visible');
      input.value = '';
      showDeleteMsg(`Recommendation deleted successfully.`, true);
    } catch (err) {
      modal.classList.remove('visible');
      showDeleteMsg('Error: ' + err.message, false);
    }
  });

  modal.classList.add('visible');
}

function showDeleteMsg(text, ok) {
  const el = document.getElementById('deleteRecMsg');
  if (!text) { el.style.display = 'none'; return; }
  el.textContent   = text;
  el.style.color   = ok === true ? 'var(--success)' : 'var(--danger)';
  el.style.display = 'block';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function escapeAttr(str) {
  return (str || '').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}
