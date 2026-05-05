const PRODUCTS = {
  tshirt: { product: 'tshirt', name: 'T-Shirt with SV College Logo', price: 50 },
  cup:    { product: 'cup',    name: 'Cup with SV College Logo',       price: 20 },
};

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
  if (!navCart) return;
  const totalQty = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  if (totalQty > 0) {
    navCart.style.display = '';
    badge.textContent = String(totalQty);
  } else {
    navCart.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  requireAuth();

  // Kick off the cart fetch immediately but don't block listener attachment.
  // Each click handler awaits this promise — it resolves instantly on repeat clicks.
  const cartReady = loadCart().then((items) => {
    cartItems = items;
    updateCartIcon();
  });

  document.querySelectorAll('[data-product]').forEach((button) => {
    button.addEventListener('click', async () => {
      await cartReady;

      const key = button.getAttribute('data-product');
      const product = PRODUCTS[key];
      if (!product) return;

      const existing = cartItems.find((i) => i.product === key);
      if (existing) {
        if (existing.quantity >= MAX_QTY) return;
        existing.quantity = Math.min(MAX_QTY, existing.quantity + 1);
      } else {
        cartItems.push({ ...product, quantity: 1 });
      }

      updateCartIcon();

      const originalText = button.textContent;
      button.textContent = 'Added!';
      button.disabled = true;
      setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
      }, 800);

      await persistCart();
    });
  });
});
