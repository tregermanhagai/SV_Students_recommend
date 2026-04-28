document.addEventListener('DOMContentLoaded', () => {
  requireAuth();

  const grid        = document.getElementById('recommendationGrid');
  const loadingEl   = document.getElementById('loadingFeed');
  const emptyEl     = document.getElementById('emptyFeed');
  const filterBtns  = document.querySelectorAll('.filter-btn');
  const helpModal   = document.getElementById('helpModal');
  const aboutModal  = document.getElementById('aboutModal');

  let activeCategory = '';

  // ── Modal wiring ──────────────────────────────────────────────
  document.getElementById('btnHelp').addEventListener('click', (e) => {
    e.preventDefault();
    helpModal.classList.add('visible');
  });
  document.getElementById('btnAbout').addEventListener('click', (e) => {
    e.preventDefault();
    aboutModal.classList.add('visible');
  });
  document.getElementById('closeHelp').addEventListener('click',  () => helpModal.classList.remove('visible'));
  document.getElementById('closeAbout').addEventListener('click', () => aboutModal.classList.remove('visible'));
  [helpModal, aboutModal].forEach(m => m.addEventListener('click', (e) => {
    if (e.target === m) m.classList.remove('visible');
  }));

  // ── Category filters ──────────────────────────────────────────
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.category;
      loadRecommendations();
    });
  });

  // ── Render helpers ────────────────────────────────────────────
  function starsHtml(count) {
    return '★'.repeat(count) + '☆'.repeat(5 - count);
  }

  function renderCard(rec) {
    const imageUrl = rec.image_url || '../assets/no-image.jpg';
    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('data-test', 'card-recommendation');
    card.setAttribute('data-id', rec.id);

    card.innerHTML = `
      <div class="card-image-wrap" data-test="card-image">
        <img src="${imageUrl}" alt="${escapeHtml(rec.name)}" loading="lazy"
             onerror="this.src='../assets/no-image.jpg'" />
        <span class="card-category-badge" data-test="card-category">${escapeHtml(rec.category)}</span>
      </div>
      <div class="card-body">
        <div class="card-title" data-test="card-title">${escapeHtml(rec.name)}</div>
        <div class="card-meta">by ${escapeHtml(rec.recommender_name)}</div>
        <div class="card-recommender-count" data-test="card-recommender-count">
          💬 ${rec.comment_count} comment${rec.comment_count !== 1 ? 's' : ''}
        </div>
      </div>`;

    card.addEventListener('click', () => {
      window.location.href = `recommendation-detail.html?id=${rec.id}`;
    });

    return card;
  }

  // ── Load recommendations ──────────────────────────────────────
  async function loadRecommendations() {
    loadingEl.style.display  = 'block';
    emptyEl.style.display    = 'none';
    grid.style.display       = 'none';
    grid.innerHTML           = '';

    try {
      let url = '/api/recommendations';
      if (activeCategory) url += `?category=${encodeURIComponent(activeCategory)}`;

      const recs = await apiFetch(url);
      loadingEl.style.display = 'none';

      if (!recs || recs.length === 0) {
        emptyEl.style.display = 'block';
        return;
      }

      grid.style.display = 'grid';
      recs.forEach(rec => grid.appendChild(renderCard(rec)));
    } catch (err) {
      loadingEl.style.display = 'none';
      emptyEl.style.display   = 'block';
      emptyEl.querySelector('h3').textContent = 'Could not load recommendations';
      emptyEl.querySelector('p').textContent  = err.message;
    }
  }

  loadRecommendations();
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
