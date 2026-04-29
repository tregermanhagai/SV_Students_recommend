const STORE_PRODUCTS = {
  tshirt: {
    product: 'tshirt',
    name: 'T-Shirt with SV College Logo',
    price: 50,
    quantity: 1,
    size: ''
  },
  cup: {
    product: 'cup',
    name: 'Cup with SV College Logo',
    price: 20,
    quantity: 1,
    size: ''
  }
};

document.addEventListener('DOMContentLoaded', () => {
  requireAuth();

  document.querySelectorAll('[data-product]').forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.getAttribute('data-product');
      const item = STORE_PRODUCTS[key];
      if (!item) return;

      localStorage.setItem('sv_cart', JSON.stringify(item));
      window.location.href = 'cart.html';
    });
  });
});
