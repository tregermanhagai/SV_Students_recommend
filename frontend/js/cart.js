const MAX_QTY = 10;

let cartItems = [];

async function loadCart() {
  try {
    const data = await apiFetch('/api/cart');
    return data.items || [];
  } catch {
    return [];
  }
}

async function persistCart() {
  try {
    await apiFetch('/api/cart', {
      method: 'PUT',
      body: JSON.stringify({ items: cartItems }),
    });
  } catch (err) {
    console.error('Failed to save cart:', err);
  }
}

function updateCartIcon() {
  const navCart = document.getElementById('navCart');
  const badge = document.getElementById('cartBadge');
  const totalQty = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  if (totalQty > 0) {
    navCart.style.display = '';
    badge.textContent = String(totalQty);
  } else {
    navCart.style.display = 'none';
  }
}

function renderCart() {
  const listEl = document.getElementById('cartItemsList');
  const emptyEl = document.getElementById('cartEmpty');
  const contentEl = document.getElementById('cartContent');
  const grandTotalEl = document.getElementById('cartGrandTotal');

  updateCartIcon();

  if (cartItems.length === 0) {
    emptyEl.style.display = '';
    contentEl.style.display = 'none';
    return;
  }

  emptyEl.style.display = 'none';
  contentEl.style.display = '';

  let grandTotal = 0;
  listEl.innerHTML = '';

  cartItems.forEach((item) => {
    const subtotal = item.price * item.quantity;
    grandTotal += subtotal;

    const div = document.createElement('div');
    div.className = 'cart-item';
    div.setAttribute('data-test', `cart-item-${item.product}`);
    div.innerHTML = `
      <div class="cart-item-info">
        <div class="cart-item-name" data-test="cart-item-name-${item.product}">${item.name}</div>
        <div class="cart-item-unit-price" data-test="cart-item-price-${item.product}">${item.price} NIS each</div>
      </div>
      <div class="cart-item-controls">
        <div class="qty-stepper">
          <button type="button" class="btn-qty-minus" data-product="${item.product}"
            aria-label="Decrease quantity" data-test="btn-qty-minus-${item.product}">-</button>
          <div class="qty-display" data-test="cart-qty-${item.product}">${item.quantity}</div>
          <button type="button" class="btn-qty-plus" data-product="${item.product}"
            aria-label="Increase quantity" data-test="btn-qty-plus-${item.product}">+</button>
        </div>
        <div class="cart-item-subtotal" data-test="cart-subtotal-${item.product}">${subtotal} NIS</div>
        <button type="button" class="btn btn-danger btn-remove" data-product="${item.product}"
          data-test="btn-remove-${item.product}">Remove</button>
      </div>
    `;
    listEl.appendChild(div);
  });

  grandTotalEl.textContent = `${grandTotal} NIS`;

  listEl.querySelectorAll('.btn-qty-minus').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const key = btn.getAttribute('data-product');
      const item = cartItems.find((i) => i.product === key);
      if (!item || item.quantity <= 1) return;
      item.quantity--;
      renderCart();
      await persistCart();
    });
  });

  listEl.querySelectorAll('.btn-qty-plus').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const key = btn.getAttribute('data-product');
      const item = cartItems.find((i) => i.product === key);
      if (!item || item.quantity >= MAX_QTY) return;
      item.quantity++;
      renderCart();
      await persistCart();
    });
  });

  listEl.querySelectorAll('.btn-remove').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const key = btn.getAttribute('data-product');
      cartItems = cartItems.filter((i) => i.product !== key);
      renderCart();
      await persistCart();
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  requireAuth();

  cartItems = await loadCart();
  renderCart();

  document.getElementById('btnProceedPayment').addEventListener('click', () => {
    if (cartItems.length === 0) return;
    window.location.href = 'payment.html';
  });
});
