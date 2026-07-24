// ─── LOAD ALL ORDERS INTO TABLE ───────────────────────────
function loadOrders() {
  const tbody = document.getElementById("orders-table-body");
  tbody.innerHTML = `<tr><td colspan="7"><div class="om-empty">Loading orders...</div></td></tr>`;

  fetch("api/adminOrders.php")
    .then((res) => res.json())
    .then((data) => {
      tbody.innerHTML = "";

      if (!data.success || !data.orders.length) {
        tbody.innerHTML = `<tr><td colspan="7"><div class="om-empty">No orders found.</div></td></tr>`;
        return;
      }

      tbody.innerHTML = data.orders.map((o) => {
        const customer = o.customer_name  || "Guest";
        const email    = o.customer_email || "—";
        const total    = parseFloat(o.total || 0).toFixed(2);
        const date     = o.created_at
          ? new Date(o.created_at).toLocaleDateString("en-US", {
              year: "numeric", month: "short", day: "numeric",
            })
          : "—";

        const statusBadge = `<span class="om-status om-status-${o.status?.toLowerCase()}">${capOm(o.status || "—")}</span>`;

        // Build items tooltip / summary
        const itemCount  = o.items?.length || 0;
        const itemsLabel = itemCount === 0
          ? "No items"
          : o.items.map(i => `${i.name} x${i.quantity}`).join(", ");

        const itemsCell = itemCount === 0
          ? `<span class="om-muted">—</span>`
          : `<span class="om-items-summary" title="${escOm(itemsLabel)}">
               ${escOm(o.items[0].name)}${itemCount > 1 ? ` <span class="om-more">+${itemCount - 1} more</span>` : ""}
             </span>`;

        return `<tr>
          <td><span class="om-order-id">#${o.id}</span></td>
          <td>
            <div class="om-customer-cell">
              <span class="om-customer-name">${escOm(customer)}</span>
              <span class="om-customer-email">${escOm(email)}</span>
            </div>
          </td>
          <td>${itemsCell}</td>
          <td><span class="om-total">₱${total}</span></td>
          <td>${statusBadge}</td>
          <td><span class="om-date">${date}</span></td>
          <td>
            <button class="om-btn-del" data-id="${o.id}" data-customer="${escOm(customer)}">
              <i class="fa-solid fa-trash"></i>
            </button>
          </td>
        </tr>`;
      }).join("");

      attachOrderEvents();
    })
    .catch(() => {
      tbody.innerHTML = `<tr><td colspan="7"><div class="om-empty">Failed to load orders.</div></td></tr>`;
    });
}

// ─── ATTACH DELETE EVENTS ──────────────────────────────────
function attachOrderEvents() {
  document.querySelectorAll(".om-btn-del").forEach((btn) => {
    btn.onclick = () => openOrderDeleteModal(btn.dataset.id, btn.dataset.customer);
  });
}

// ─── DELETE MODAL ──────────────────────────────────────────
let deletingOrderId = null;

function openOrderDeleteModal(id, customer) {
  deletingOrderId = id;
  document.getElementById("delete-order-msg").textContent =
    `Order #${id} from "${customer}" will be permanently removed. This cannot be undone.`;
  document.getElementById("delete-order-modal").style.display = "flex";
}

document.getElementById("confirm-order-delete-btn").addEventListener("click", () => {
  fetch("api/adminOrders.php", {
    method: "POST",
    body: new URLSearchParams({ action: "delete", id: deletingOrderId }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        document.getElementById("delete-order-modal").style.display = "none";
        loadOrders();
        showOrderToast("Order deleted.");
      } else {
        alert("Failed to delete order.");
      }
    });
});

document.getElementById("delete-order-modal")?.addEventListener("click", function (e) {
  if (e.target === this) this.style.display = "none";
});

document.querySelectorAll(".om-cancel-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.getElementById("delete-order-modal").style.display = "none";
  });
});

// ─── TOAST ─────────────────────────────────────────────────
function showOrderToast(msg) {
  const toast = document.getElementById("om-toasty");
  const msgEl = toast.querySelector(".om-toast-msg");
  if (msgEl) msgEl.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2800);
}

// ─── UTILITIES ─────────────────────────────────────────────
function escOm(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&#39;");
}

function capOm(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─── RUN ON PAGE LOAD ──────────────────────────────────────
loadOrders();