document.addEventListener('DOMContentLoaded', async () => {
  requireAuth();

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
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function escapeAttr(str) {
  return (str || '').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}
