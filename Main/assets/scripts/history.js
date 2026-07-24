// ── FORMAT DATE ──────────────────────────────────────
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// ── STATUS BADGE CLASS ───────────────────────────────
function statusClass(status) {
  const s = (status || '').toLowerCase();
  if (s === 'pending') return 'status-pending';
  if (s === 'paid')    return 'status-paid';
  if (s === 'failed')  return 'status-failed';
  return 'status-default';
}

// ── BUILD ITEMS HTML ─────────────────────────────────
function buildItemsHtml(items) {
  if (!items || items.length === 0) {
    return `<p class="no-items">No item details available.</p>`;
  }

  const rows = items.map(item => {
    const subtotal = (item.price * item.quantity).toFixed(2);
    const imgSrc   = item.image
      ? `assets/img/items/${item.image}`
      : 'assets/img/placeholder.jpeg';

    return `
      <div class="item-row">
        <img class="item-img" src="${imgSrc}" alt="${item.name}" onerror="this.style.display='none'">
        <div class="item-info">
          <span class="item-name">${item.name}</span>
          <span class="item-qty">x${item.quantity}</span>
        </div>
        <span class="item-price">₱${subtotal}</span>
      </div>`;
  }).join('');

  return `<div class="items-list">${rows}</div>`;
}

// ── LOAD ORDERS ──────────────────────────────────────
async function loadOrders() {
  try {
    const res  = await fetch('api/orders.php');
    const data = await res.json();

    document.getElementById('loading-state').style.display = 'none';

    if (!data.success && data.message === 'Please login first!') {
      window.location.href = 'login.html';
      return;
    }

    if (!data.success) {
      document.getElementById('error-state').style.display = 'block';
      document.getElementById('error-msg').textContent = data.message || 'Failed to load orders.';
      return;
    }

    const orders = data.orders;

    if (orders.length === 0) {
      document.getElementById('empty-state').style.display = 'block';
      return;
    }

    // ── RENDER ORDERS ────────────────────────────────
    const list = document.getElementById('orders-list');

    orders.forEach((order, i) => {
      const itemCount  = order.items ? order.items.length : 0;
      const itemLabel  = itemCount === 1 ? '1 item' : `${itemCount} items`;
      const card       = document.createElement('div');
      card.className   = 'order-card';
      card.style.animationDelay = `${i * 0.07}s`;

      card.innerHTML = `
        <div class="order-header">
          <div class="order-id">Order #${order.id}</div>
          <div class="order-date">
            <i class="fa fa-clock"></i>
            ${formatDate(order.created_at)}
          </div>
        </div>

        <div class="order-body">
          <div class="order-total">
            ₱${parseFloat(order.total).toFixed(2)}
            <span>Total (incl. shipping)</span>
          </div>
          <div class="status-badge ${statusClass(order.status)}">
            ${order.status}
          </div>
        </div>

        <button class="toggle-items-btn" aria-expanded="false">
          <i class="fa fa-chevron-down toggle-icon"></i>
          Show ${itemLabel}
        </button>

        <div class="items-panel" hidden>
          ${buildItemsHtml(order.items)}
        </div>
      `;

      list.appendChild(card);

      // ── TOGGLE LOGIC ─────────────────────────────
      const btn   = card.querySelector('.toggle-items-btn');
      const panel = card.querySelector('.items-panel');
      const icon  = card.querySelector('.toggle-icon');

      btn.addEventListener('click', () => {
        const isOpen = !panel.hidden;
        panel.hidden  = isOpen;
        icon.style.transform  = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
        btn.setAttribute('aria-expanded', String(!isOpen));
        btn.innerHTML = isOpen
          ? `<i class="fa fa-chevron-down toggle-icon" style="transform:rotate(0deg)"></i> Show ${itemLabel}`
          : `<i class="fa fa-chevron-down toggle-icon" style="transform:rotate(180deg)"></i> Hide ${itemLabel}`;
      });
    });

  } catch (err) {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('error-state').style.display   = 'block';
    document.getElementById('error-msg').textContent = 'Could not connect to the server.';
  }
}

loadOrders();