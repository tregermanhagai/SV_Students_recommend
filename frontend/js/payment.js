function digitsOnly(value) {
  return (value || '').replace(/\D/g, '');
}

async function loadCart() {
  try {
    const data = await apiFetch('/api/cart');
    return data.items || [];
  } catch {
    return [];
  }
}

async function clearServerCart() {
  try {
    await apiFetch('/api/cart', {
      method: 'PUT',
      body: JSON.stringify({ items: [] }),
    });
  } catch (err) {
    console.error('Failed to clear cart:', err);
  }
}

function updateCartIcon(items) {
  const navCart = document.getElementById('navCart');
  const badge = document.getElementById('cartBadge');
  if (!navCart) return;
  const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);
  if (totalQty > 0) {
    navCart.style.display = '';
    badge.textContent = String(totalQty);
  } else {
    navCart.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  requireAuth();

  const cartItems = await loadCart();

  if (cartItems.length === 0) {
    window.location.href = 'store.html';
    return;
  }

  updateCartIcon(cartItems);

  const summaryItemsEl = document.getElementById('summaryItems');
  const summaryTotalEl = document.getElementById('summaryTotal');

  let grandTotal = 0;
  cartItems.forEach((item) => {
    const subtotal = item.price * item.quantity;
    grandTotal += subtotal;

    const row = document.createElement('div');
    row.className = 'order-row';
    row.setAttribute('data-test', `summary-item-${item.product}`);
    row.innerHTML = `<span>${item.name} &times; ${item.quantity}</span><span>${subtotal} NIS</span>`;
    summaryItemsEl.appendChild(row);
  });

  summaryTotalEl.textContent = `${grandTotal} NIS`;

  const form = document.getElementById('paymentForm');
  const errorEl = document.getElementById('paymentError');
  const successEl = document.getElementById('paymentSuccess');

  const fullNameEl = document.getElementById('fullName');
  const addressEl = document.getElementById('address');
  const cardNumberEl = document.getElementById('cardNumber');
  const cvvEl = document.getElementById('cvv');
  const expiryEl = document.getElementById('expiry');

  cardNumberEl.addEventListener('input', () => {
    const digits = digitsOnly(cardNumberEl.value).slice(0, 16);
    cardNumberEl.value = digits.replace(/(.{4})/g, '$1 ').trim();
  });

  cvvEl.addEventListener('input', () => {
    cvvEl.value = digitsOnly(cvvEl.value).slice(0, 4);
  });

  function clearMessages() {
    errorEl.classList.remove('visible');
    errorEl.textContent = '';
    successEl.classList.remove('visible');
    successEl.textContent = '';
  }

  function showError(message) {
    errorEl.textContent = message;
    errorEl.classList.add('visible');
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearMessages();

    const fullName = fullNameEl.value.trim();
    const address = addressEl.value.trim();
    const cardDigits = digitsOnly(cardNumberEl.value);
    const cvv = digitsOnly(cvvEl.value);
    const expiryValue = expiryEl.value;

    if (!fullName || !address || !cardDigits || !cvv || !expiryValue) {
      showError('Please fill in all required fields.');
      return;
    }

    if (cardDigits.length !== 16) {
      showError('Credit card number must contain exactly 16 digits.');
      return;
    }

    if (cvv.length < 3 || cvv.length > 4) {
      showError('CVV must contain 3 or 4 digits.');
      return;
    }

    const [yearString, monthString] = expiryValue.split('-');
    const expYear = Number(yearString);
    const expMonth = Number(monthString);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (!expYear || !expMonth || expMonth < 1 || expMonth > 12) {
      showError('Please enter a valid expiration date.');
      return;
    }

    if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
      showError('Expiration date cannot be in the past.');
      return;
    }

    await clearServerCart();
    form.style.display = 'none';
    updateCartIcon([]);
    successEl.textContent = 'Order placed! Thank you.';
    successEl.classList.add('visible');
  });
});
