document.addEventListener('DOMContentLoaded', () => {
  requireAuth();
  initCartIcon();

  const form         = document.getElementById('addForm');
  const errorMsg     = document.getElementById('errorMsg');
  const successMsg   = document.getElementById('successMsg');
  const imageInput   = document.getElementById('imageInput');
  const previewWrap  = document.getElementById('imagePreviewWrap');
  const previewImg   = document.getElementById('imagePreview');

  // Pre-fill recommender name from session
  const user = getUser();
  if (user && user.name) {
    document.getElementById('recommenderName').value = user.name;
  }

  // Image preview
  imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        previewImg.src = e.target.result;
        previewWrap.style.display = 'block';
      };
      reader.readAsDataURL(file);
    } else {
      previewWrap.style.display = 'none';
    }
  });

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

    const name            = document.getElementById('recName').value.trim();
    const category        = document.getElementById('category').value;
    const recommenderName = document.getElementById('recommenderName').value.trim();
    const description     = document.getElementById('description').value.trim();
    const websiteLink     = document.getElementById('websiteLink').value.trim();
    const imageFile       = imageInput.files[0];

    if (!name)            return showError('Recommendation name is required.');
    if (!recommenderName) return showError('Your name is required.');

    const btn = form.querySelector('[data-test="btn-submit-recommendation"]');
    btn.disabled = true;
    btn.textContent = 'Submitting…';

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('category', category);
      formData.append('recommender_name', recommenderName);
      if (description) formData.append('description', description);
      if (websiteLink) formData.append('website_link', websiteLink);
      if (imageFile)   formData.append('image', imageFile);

      await apiFetch('/api/recommendations', {
        method: 'POST',
        body: formData,
      });

      showSuccess('Recommendation added! Redirecting…');
      setTimeout(() => { window.location.href = 'home.html'; }, 1200);
    } catch (err) {
      showError(err.message || 'Failed to submit. Please try again.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Submit';
    }
  });
});
