document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const recId  = params.get('id');

  if (!recId) {
    window.location.href = 'home.html';
    return;
  }

  const loadingEl    = document.getElementById('loadingDetail');
  const contentEl    = document.getElementById('detailContent');
  const deleteModal  = document.getElementById('deleteModal');

  // ── Load recommendation ───────────────────────────────────────
  let rec;
  try {
    rec = await apiFetch(`/api/recommendations/${recId}`);
  } catch (err) {
    loadingEl.innerHTML = `<p style="color:var(--danger); text-align:center">${err.message}</p>`;
    return;
  }

  loadingEl.style.display = 'none';
  contentEl.style.display = 'block';
  document.title = `${rec.name} – SV Students Recommend`;

  // Fill detail fields
  const imgEl = document.getElementById('detailImage');
  imgEl.src = rec.image_url || '../assets/no-image.jpg';
  imgEl.alt = rec.name;
  imgEl.onerror = () => { imgEl.src = '../assets/no-image.jpg'; };

  document.getElementById('detailCategory').textContent      = rec.category;
  document.getElementById('detailTitle').textContent         = rec.name;
  document.getElementById('detailRecommenderName').textContent = rec.recommender_name;
  document.getElementById('detailCommentCount').textContent  = rec.comment_count;
  document.getElementById('detailDescription').textContent   = rec.description || '';

  if (rec.website_link) {
    const wrap = document.getElementById('detailWebsiteWrap');
    const link = document.getElementById('detailWebsiteLink');
    link.href        = rec.website_link;
    link.textContent = rec.website_link;
    wrap.style.display = 'inline';
  }

  // Show owner actions if this is the user's recommendation or if the user is an admin
  const user = getUser();
  if (user && (user.id === rec.created_by || user.is_admin)) {
    const ownerActions = document.getElementById('ownerActions');
    ownerActions.style.display = 'flex';

    if (user.id === rec.created_by) {
      document.getElementById('btnEdit').href = `add-recommendation.html?edit=${rec.id}`;
    } else {
      document.getElementById('btnEdit').style.display = 'none';
    }

    document.getElementById('btnDelete').addEventListener('click', () => {
      deleteModal.classList.add('visible');
    });
    document.getElementById('closeDeleteModal').addEventListener('click', () => {
      deleteModal.classList.remove('visible');
    });
    document.getElementById('cancelDelete').addEventListener('click', () => {
      deleteModal.classList.remove('visible');
    });
    document.getElementById('confirmDelete').addEventListener('click', async () => {
      try {
        await apiFetch(`/api/recommendations/${recId}`, { method: 'DELETE' });
        window.location.href = 'home.html';
      } catch (err) {
        alert('Delete failed: ' + err.message);
        deleteModal.classList.remove('visible');
      }
    });
    deleteModal.addEventListener('click', (e) => {
      if (e.target === deleteModal) deleteModal.classList.remove('visible');
    });
  }

  // ── Load comments ─────────────────────────────────────────────
  await loadComments();

  // ── Comment form visibility ───────────────────────────────────
  if (isLoggedIn()) {
    document.getElementById('commentFormWrap').style.display = 'block';
    document.getElementById('loginToComment').style.display  = 'none';
    setupCommentForm();
  } else {
    document.getElementById('commentFormWrap').style.display = 'none';
    document.getElementById('loginToComment').style.display  = 'block';
  }
});

// ── Helpers ───────────────────────────────────────────────────────

async function loadComments() {
  const params = new URLSearchParams(window.location.search);
  const recId  = params.get('id');
  const list   = document.getElementById('commentsList');
  const empty  = document.getElementById('noComments');

  try {
    const comments = await apiFetch(`/api/recommendations/${recId}/comments`);
    list.innerHTML = '';

    if (!comments || comments.length === 0) {
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';
    comments.forEach(c => list.appendChild(buildCommentEl(c, recId)));
  } catch (_) {
    // silently fail on comment load
  }
}

function buildCommentEl(c, recId) {
  const el = document.createElement('div');
  el.className = 'comment-item';
  el.setAttribute('data-test', 'comment-item');
  el.setAttribute('data-id', c.id);

  const stars = '★'.repeat(c.rating) + '<span class="star-empty">' + '★'.repeat(5 - c.rating) + '</span>';
  const date  = new Date(c.created_at).toLocaleDateString();
  const text  = c.comment_text
    ? `<p class="comment-text" data-test="comment-text">${escapeHtml(c.comment_text)}</p>`
    : '';

  el.innerHTML = `
    <div class="comment-header">
      <span class="comment-author" data-test="comment-author">${escapeHtml(c.commenter_name)}</span>
      <span class="comment-date"  data-test="comment-date">${date}</span>
    </div>
    <div class="stars-display" data-test="comment-rating">${stars}</div>
    ${text}`;

  const user = getUser();
  if (user && (c.commenter_id === user.id || user.is_admin)) {
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-danger';
    deleteBtn.style.cssText = 'width:auto;padding:4px 12px;font-size:0.8rem;margin-top:6px';
    deleteBtn.setAttribute('data-test', `btn-delete-comment-${c.id}`);
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', async () => {
      try {
        await apiFetch(`/api/recommendations/${recId}/comments/${c.id}`, { method: 'DELETE' });
        el.remove();
        const list = document.getElementById('commentsList');
        if (!list.querySelector('.comment-item')) {
          document.getElementById('noComments').style.display = 'block';
        }
        const countEl = document.getElementById('detailCommentCount');
        if (countEl) countEl.textContent = Math.max(0, parseInt(countEl.textContent || '0') - 1);
      } catch (err) {
        alert('Delete failed: ' + err.message);
      }
    });
    el.appendChild(deleteBtn);
  }

  return el;
}

function setupCommentForm() {
  const params = new URLSearchParams(window.location.search);
  const recId  = params.get('id');
  const form   = document.getElementById('commentForm');
  const errEl  = document.getElementById('commentError');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.classList.remove('visible');

    const ratingInput = form.querySelector('input[name="rating"]:checked');
    if (!ratingInput) {
      errEl.textContent = 'Please select a star rating.';
      errEl.classList.add('visible');
      return;
    }

    const btn = form.querySelector('[data-test="btn-submit-comment"]');
    btn.disabled = true;
    btn.textContent = 'Posting…';

    try {
      await apiFetch(`/api/recommendations/${recId}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          rating:       parseInt(ratingInput.value),
          comment_text: document.getElementById('commentText').value.trim() || null,
        }),
      });

      // Reset form and reload comments
      form.reset();
      await loadComments();

      // Update comment count display
      const countEl = document.getElementById('detailCommentCount');
      countEl.textContent = parseInt(countEl.textContent || '0') + 1;
    } catch (err) {
      errEl.textContent = err.message || 'Failed to post comment.';
      errEl.classList.add('visible');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Post Comment';
    }
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
