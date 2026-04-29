function getCart() {
  try {
    return JSON.parse(localStorage.getItem('sv_cart') || 'null');
  } catch {
    return null;
  }
}

function saveCart(cart) {
  localStorage.setItem('sv_cart', JSON.stringify(cart));
}

document.addEventListener('DOMContentLoaded', () => {
  requireAuth();

  const cart = getCart();
  if (!cart || !cart.product || !cart.price) {
    window.location.href = 'store.html';
    return;
  }

  const productName = document.getElementById('cartProductName');
  const unitPrice = document.getElementById('cartUnitPrice');
  const quantityEl = document.getElementById('cartQuantity');
  const totalEl = document.getElementById('cartTotal');
  const errorEl = document.getElementById('cartError');
  const sizeSelector = document.getElementById('sizeSelector');

  const minusBtn = document.getElementById('btnQtyMinus');
  const plusBtn = document.getElementById('btnQtyPlus');
  const proceedBtn = document.getElementById('btnProceedPayment');
  const sizeButtons = document.querySelectorAll('.size-btn');

  let quantity = Number(cart.quantity) || 1;
  quantity = Math.min(99, Math.max(1, quantity));
  let size = cart.size || '';

  function hideError() {
    errorEl.classList.remove('visible');
    errorEl.textContent = '';
  }

  function showError(message) {
    errorEl.textContent = message;
    errorEl.classList.add('visible');
  }

  function updateSizeUI() {
    sizeButtons.forEach((button) => {
      button.classList.toggle('active', button.getAttribute('data-size') === size);
    });
  }

  function updateTotals() {
    const total = quantity * Number(cart.price);

    productName.textContent = cart.name;
    unitPrice.textContent = `Unit price: ${cart.price} NIS`;
    quantityEl.textContent = String(quantity);
    totalEl.textContent = `${total} NIS`;

    cart.quantity = quantity;
    if (cart.product === 'tshirt') {
      cart.size = size;
    } else {
      cart.size = '';
    }
    saveCart(cart);
  }

  if (cart.product === 'tshirt') {
    sizeSelector.style.display = 'block';
    updateSizeUI();
  }

  minusBtn.addEventListener('click', () => {
    hideError();
    quantity = Math.max(1, quantity - 1);
    updateTotals();
  });

  plusBtn.addEventListener('click', () => {
    hideError();
    quantity = Math.min(99, quantity + 1);
    updateTotals();
  });

  sizeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      hideError();
      size = button.getAttribute('data-size') || '';
      updateSizeUI();
      updateTotals();
    });
  });

  proceedBtn.addEventListener('click', () => {
    hideError();
    if (cart.product === 'tshirt' && !size) {
      showError('Please select a size before proceeding.');
      return;
    }

    updateTotals();
    window.location.href = 'payment.html';
  });

  updateTotals();
});
