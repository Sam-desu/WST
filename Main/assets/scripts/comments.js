const ratingLabels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

/* Tracks which product_ids have been reviewed this session */
const reviewed = new Set();

// ── Status badge helper ─────────────────────────────────────
function statusBadge(s) {
  const sl = (s || "").toLowerCase();
  if (sl.includes("complet") || sl.includes("deliver"))
    return `<span class="bs s-ok">${s}</span>`;
  if (sl.includes("cancel")) return `<span class="bs s-cxl">${s}</span>`;
  if (sl.includes("process")) return `<span class="bs s-prc">${s}</span>`;
  return `<span class="bs s-pnd">${s}</span>`;
}

// ── Escape helpers ──────────────────────────────────────────
function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

function escapeAttr(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

// ── Load unique ordered products ────────────────────────────
async function loadOrders() {
  try {
    const res = await fetch("api/order-list.php");
    const data = await res.json();
    const tbody = document.getElementById("orders-tbody");

    if (!data.success) {
      tbody.innerHTML = `<tr class="ord-row"><td colspan="4" style="text-align:center;color:#7a6454;padding:22px">${data.message}</td></tr>`;
      return;
    }

    if (!data.products || !data.products.length) {
      tbody.innerHTML = `
        <tr class="ord-row">
          <td colspan="4" style="text-align:center;color:#7a6454;padding:22px">
            No ordered products found.
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = "";

    data.products.forEach((product) => {
      const action = reviewed.has(product.product_id)
        ? `<span class="badge-reviewed">&#10003; Reviewed</span>`
        : `<button class="btn-review"
               onclick="openModal(${product.product_id},'${escapeAttr(product.name)}')">
               &#9733; Review
           </button>`;

      const row = document.createElement("tr");
      row.className = "ord-row";
      row.innerHTML = `
        <td><img src="assets/img/items/${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;"></td>
        <td>${escapeHtml(product.name)}</td>
        <td style="font-weight:600;white-space:nowrap">
          &#8369;${product.price.toFixed(2)}
          <span style="color:#7a6454;font-weight:400;font-size:.85em">&times;${product.total_qty}</span>
        </td>
        <td><div class="actions-col">${action}</div></td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) {
    document.getElementById("orders-tbody").innerHTML = `
      <tr class="ord-row">
        <td colspan="5" style="text-align:center;color:#7a6454;padding:22px">
          Failed to load orders.
        </td>
      </tr>`;
    console.error(err);
  }
}

// ── Modal helpers ───────────────────────────────────────────
function openModal(productId, productName) {
  document.getElementById("modal-product-id").value = productId;
  document.getElementById("modal-product-name").textContent = productName;
  document.getElementById("modal-comment").value = "";
  document.getElementById("modal-rating").value = "0";
  document.getElementById("modal-error").className = "modal-msg";
  document.getElementById("modal-success").className = "modal-msg";
  document.getElementById("rating-label").textContent = "Tap a star to rate";
  setStars(0);
  document.getElementById("review-modal").classList.add("open");
}

function closeModal() {
  document.getElementById("review-modal").classList.remove("open");
}

/* Close on backdrop click */
document.getElementById("review-modal").addEventListener("click", function (e) {
  if (e.target === this) closeModal();
});

// ── Star rating ─────────────────────────────────────────────
function setStars(val) {
  document.querySelectorAll(".star-btn").forEach((s) => {
    s.classList.toggle("lit", parseInt(s.dataset.value) <= val);
  });
  document.getElementById("rating-label").textContent = val
    ? ratingLabels[val]
    : "Tap a star to rate";
}

document.querySelectorAll(".star-btn").forEach((s) => {
  s.addEventListener("click", function () {
    const v = parseInt(this.dataset.value);
    document.getElementById("modal-rating").value = v;
    setStars(v);
  });
  s.addEventListener("mouseover", function () {
    setStars(parseInt(this.dataset.value));
  });
  s.addEventListener("mouseout", function () {
    setStars(parseInt(document.getElementById("modal-rating").value));
  });
});

// ── Submit review ───────────────────────────────────────────
async function submitReview() {
  const productId = document.getElementById("modal-product-id").value;
  const comment   = document.getElementById("modal-comment").value.trim();
  const rating    = document.getElementById("modal-rating").value;
  const errEl     = document.getElementById("modal-error");
  const okEl      = document.getElementById("modal-success");

  errEl.className = "modal-msg";
  okEl.className  = "modal-msg";

  if (!rating || rating === "0") {
    errEl.textContent = "Please select a star rating.";
    errEl.className   = "modal-msg err";
    return;
  }
  if (!comment) {
    errEl.textContent = "Please write a comment.";
    errEl.className   = "modal-msg err";
    return;
  }

  const body = new URLSearchParams({
    action:     "add",
    product_id: productId,
    comment,
    rating,
    user_name:  localStorage.getItem("user_name"),
  });

  try {
    const res  = await fetch("api/comments.php", { method: "POST", body });
    const data = await res.json();

    if (data.success) {
      okEl.textContent = "Review submitted — thank you!";
      okEl.className   = "modal-msg ok";

      /* Mark product as reviewed so the button turns into a badge */
      reviewed.add(parseInt(productId));

      setTimeout(() => {
        closeModal();
        loadOrders();
      }, 1400);
    } else {
      errEl.textContent = data.message || "Something went wrong.";
      errEl.className   = "modal-msg err";
    }
  } catch (err) {
    errEl.textContent = "Request failed. Please try again.";
    errEl.className   = "modal-msg err";
  }
}

// ── Init ────────────────────────────────────────────────────
loadOrders();