document.addEventListener('DOMContentLoaded', () => {
  requireAuth();
  initCartIcon();

  // Help / About modals
  const helpModal  = document.getElementById('helpModal');
  const aboutModal = document.getElementById('aboutModal');
  document.getElementById('btnHelp').addEventListener('click', (e) => { e.preventDefault(); helpModal.classList.add('visible'); });
  document.getElementById('btnAbout').addEventListener('click', (e) => { e.preventDefault(); aboutModal.classList.add('visible'); });
  document.getElementById('closeHelp').addEventListener('click', () => helpModal.classList.remove('visible'));
  document.getElementById('closeAbout').addEventListener('click', () => aboutModal.classList.remove('visible'));
  [helpModal, aboutModal].forEach(m => m.addEventListener('click', (e) => { if (e.target === m) m.classList.remove('visible'); }));

  const askBtn     = document.getElementById('askBtn');
  const questionEl = document.getElementById('movieQuestion');
  const resultEl   = document.getElementById('movieAiResult');
  const errorEl    = document.getElementById('movieAiError');

  askBtn.addEventListener('click', handleAsk);

  questionEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  });

  async function handleAsk() {
    const question = questionEl.value.trim();
    if (!question) {
      showError('Please enter a question.');
      return;
    }

    clearError();
    showLoading();

    try {
      const data = await apiFetch('/api/movie-ai', {
        method: 'POST',
        body: JSON.stringify({ question }),
      });
      renderResult(data);
    } catch (err) {
      const msg = err?.message || 'Something went wrong. Please try again.';
      showError(msg);
      resultEl.style.display = 'none';
    }
  }

  function showLoading() {
    resultEl.style.display = 'block';
    resultEl.innerHTML = `
      <div style="text-align:center;padding:40px 0;">
        <div class="spinner"></div>
        <p style="margin-top:12px;color:var(--text-muted)">Asking AI…</p>
      </div>`;
  }

  function renderResult(data) {
    resultEl.style.display = 'block';
    let html = '';

    if (data.movie) {
      html += renderMovieCard(data.movie);
    }

    if (data.answer) {
      html += `<div class="movie-answer">${marked.parse(data.answer)}</div>`;
    } else if (!data.movie) {
      html += `<div class="movie-ai-no-key">AI answer is not available. Please configure the OpenAI API key.</div>`;
    }

    resultEl.innerHTML = html;
  }

  function renderMovieCard(movie) {
    const rating   = movie.rating ? `<span class="movie-star">⭐ ${movie.rating.toFixed(1)}</span>` : '';
    const year     = movie.year   ? `<span>${movie.year}</span>` : '';
    const runtime  = movie.runtime ? `<span>${movie.runtime} min</span>` : '';
    const genres   = movie.genres && movie.genres.length ? `<span>${movie.genres.slice(0, 3).join(', ')}</span>` : '';
    const director = movie.directors && movie.directors.length
      ? `<div><i class="fas fa-video" style="color:var(--primary);margin-right:4px;"></i>${movie.directors.join(', ')}</div>`
      : '';
    const cast     = movie.cast && movie.cast.length
      ? `<div style="font-size:0.85rem;color:var(--text-muted)"><i class="fas fa-users" style="margin-right:4px;"></i>${movie.cast.slice(0, 3).join(', ')}</div>`
      : '';

    const posterHtml = movie.poster_url
      ? `<img
           class="movie-card-poster"
           src="${movie.poster_url}"
           alt="${escHtml(movie.title)} poster"
           data-full="${movie.poster_full || movie.poster_url}"
           ${movie.imdb_url ? `onclick="window.open('${movie.imdb_url}','_blank')"` : ''}
         />`
      : `<div class="movie-card-no-poster"><i class="fas fa-film"></i></div>`;

    const titleHtml = movie.imdb_url
      ? `<a href="${movie.imdb_url}" target="_blank" rel="noopener">${escHtml(movie.title)}</a>`
      : escHtml(movie.title);

    const links = [];
    if (movie.imdb_url)    links.push(`<a href="${movie.imdb_url}" target="_blank" rel="noopener"><i class="fas fa-external-link-alt"></i> IMDb</a>`);
    if (movie.trailer_url) links.push(`<a href="${movie.trailer_url}" target="_blank" rel="noopener"><i class="fab fa-youtube"></i> Trailer</a>`);

    return `
      <div class="movie-card">
        ${posterHtml}
        <div class="movie-card-info">
          <div class="movie-card-title">${titleHtml}</div>
          <div class="movie-card-meta">${[year, rating, runtime, genres].filter(Boolean).join('')}</div>
          ${director}
          ${cast}
          ${movie.overview ? `<div class="movie-card-overview">${escHtml(movie.overview)}</div>` : ''}
          ${links.length ? `<div class="movie-card-links">${links.join('')}</div>` : ''}
        </div>
      </div>`;
  }

  function escHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
  }

  function clearError() {
    errorEl.style.display = 'none';
    errorEl.textContent = '';
  }
});
