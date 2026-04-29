function readCart() {
  try {
    return JSON.parse(localStorage.getItem('sv_cart') || 'null');
  } catch {
    return null;
  }
}

function digitsOnly(value) {
  return (value || '').replace(/\D/g, '');
}

document.addEventListener('DOMContentLoaded', () => {
  requireAuth();

  const cart = readCart();
  if (!cart || !cart.product || !cart.price || !cart.quantity) {
    window.location.href = 'store.html';
    return;
  }

  const summaryProduct = document.getElementById('summaryProduct');
  const summaryQuantity = document.getElementById('summaryQuantity');
  const summarySizeRow = document.getElementById('summarySizeRow');
  const summarySize = document.getElementById('summarySize');
  const summaryTotal = document.getElementById('summaryTotal');

  const form = document.getElementById('paymentForm');
  const errorEl = document.getElementById('paymentError');
  const successEl = document.getElementById('paymentSuccess');

  const fullNameEl = document.getElementById('fullName');
  const addressEl = document.getElementById('address');
  const cardNumberEl = document.getElementById('cardNumber');
  const cvvEl = document.getElementById('cvv');
  const expiryEl = document.getElementById('expiry');

  const quantity = Math.max(1, Number(cart.quantity) || 1);
  const total = quantity * Number(cart.price);

  summaryProduct.textContent = cart.name;
  summaryQuantity.textContent = String(quantity);
  summaryTotal.textContent = `${total} NIS`;

  if (cart.product === 'tshirt') {
    summarySizeRow.style.display = 'flex';
    summarySize.textContent = cart.size || '-';
  }

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

  form.addEventListener('submit', (event) => {
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

    localStorage.removeItem('sv_cart');
    form.style.display = 'none';
    successEl.textContent = 'Order placed! Thank you.';
    successEl.classList.add('visible');
  });
});
