// ─── LOAD ALL PRODUCTS INTO TABLE ─────────────────────────
function loadProducts() {
  fetch("api/products.php?action=all")
    .then((res) => res.json())
    .then((products) => {
      const tbody = document.getElementById("products-table-body");
      tbody.innerHTML = "";

      if (!products.length) {
        tbody.innerHTML = `<tr><td colspan="7"><div class="pm-empty">No products found.</div></td></tr>`;
        return;
      }

      tbody.innerHTML = products.map((p) => {
        const stock  = parseInt(p.stock) || 0;
        const price  = parseFloat(p.price || 0).toFixed(2);
        const cat    = (p.category || "drinks").toLowerCase();

        const thumb = p.image
          ? `<img src="assets/img/items/${p.image}"
                   class="pm-thumb"
                   onerror="this.src='assets/img/placeholder.jpeg'">`
          : `<div class="pm-thumb-placeholder"><i class="fa-solid fa-image"></i></div>`;

        const catIcon  = cat === "drinks" ? "fa-mug-hot" : "fa-cookie-bite";
        const catBadge = `<span class="pm-cat pm-cat-${cat}">
                            <i class="fa-solid ${catIcon}"></i> ${cap(cat)}
                          </span>`;

        const statusBadge = stock > 0
          ? `<span class="pm-status pm-status-in">In Stock</span>`
          : `<span class="pm-status pm-status-out">Out of Stock</span>`;

        return `<tr>
          <td>${thumb}</td>
          <td>
            <div class="pm-product-cell">
              <span class="pm-product-name">${escHtml(p.name)}</span>
              <span class="pm-product-desc">${escHtml(p.description || "")}</span>
            </div>
          </td>
          <td>${catBadge}</td>
          <td>₱${price}</td>
          <td class="${stock === 0 ? "pm-muted" : ""}">${stock}</td>
          <td>${statusBadge}</td>
          <td>
            <div class="pm-actions-cell">
              <button class="pm-btn-edit" data-id="${p.id}" data-product='${JSON.stringify(p)}'>
                <i class="fa-solid fa-pen-to-square"></i> Edit
              </button>
              <button class="pm-btn-del" data-id="${p.id}" data-name="${escHtml(p.name)}">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>`;
      }).join("");

      attachTableEvents();
      applyCurrentFilter();
    });
}

// ─── ATTACH EDIT AND DELETE EVENTS ────────────────────────
function attachTableEvents() {
  // DELETE — open confirm modal
  document.querySelectorAll(".pm-btn-del").forEach((btn) => {
    btn.onclick = () => openDeleteModal(btn.dataset.id, btn.dataset.name);
  });

  // EDIT — open edit modal
  document.querySelectorAll(".pm-btn-edit").forEach((btn) => {
    btn.onclick = () => {
      const product = JSON.parse(btn.dataset.product);
      openEditModal(btn.dataset.id, product);
    };
  });
}

// ─── ADD PRODUCT ──────────────────────────────────────────
document.getElementById("add-btn").addEventListener("click", () => {
  // Clear form
  ["product-name", "description", "price", "stock"].forEach(
    (id) => (document.getElementById(id).value = "")
  );
  document.getElementById("category").value = "drinks";
  document.getElementById("image").value = "";
  document.getElementById("image-label-text").textContent = "Click to upload image";

  document.getElementById("add-product-modal").style.display = "flex";
});

document.getElementById("card-add-btn").addEventListener("click", () => {
  const productName = document.getElementById("product-name").value.trim();
  const description = document.getElementById("description").value.trim();
  const price       = document.getElementById("price").value;
  const stock       = document.getElementById("stock").value;
  const category    = document.getElementById("category").value;
  const image       = document.getElementById("image").files[0];

  if (!productName || !description || !price || !stock || !image || !category) {
    alert("Please fill in all the data");
    return;
  }

  if (isNaN(price) || price <= 0 || isNaN(stock) || stock < 0) {
    alert("Price and stock must be valid positive numbers.");
    return;
  }

  const formData = new FormData();
  formData.append("action",      "add");
  formData.append("name",        productName);
  formData.append("description", description);
  formData.append("price",       price);
  formData.append("stock",       stock);
  formData.append("category",    category);
  formData.append("image",       image);

  fetch("api/products.php", { method: "POST", body: formData })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        document.getElementById("add-product-modal").style.display = "none";
        loadProducts();
        showToast("Product added!");
      } else {
        alert(data.message);
      }
    });
});

// Cancel — Add modal (header X and footer Cancel)
document.getElementById("card-cancel-btn").addEventListener("click", () => {
  document.getElementById("add-product-modal").style.display = "none";
});
document.getElementById("card-cancel-btn-2").addEventListener("click", () => {
  document.getElementById("add-product-modal").style.display = "none";
});

// ─── EDIT PRODUCT ─────────────────────────────────────────
let editingProductId = null;

function openEditModal(id, product) {
  editingProductId = id;

  document.getElementById("edit-product-name").value = product.name        || "";
  document.getElementById("edit-description").value  = product.description || "";
  document.getElementById("edit-price").value        = product.price       || "";
  document.getElementById("edit-stock").value        = product.stock       || "";
  document.getElementById("edit-category").value     = product.category    || "drinks";
  document.getElementById("edit-image").value        = "";
  document.getElementById("edit-image-label-text").textContent = "Click to upload new image";

  document.getElementById("edit-product-modal").style.display = "flex";
}

document.getElementById("card-edit-btn").addEventListener("click", () => {
  const productName = document.getElementById("edit-product-name").value.trim();
  const description = document.getElementById("edit-description").value.trim();
  const price       = document.getElementById("edit-price").value;
  const stock       = document.getElementById("edit-stock").value;
  const category    = document.getElementById("edit-category").value;
  const image       = document.getElementById("edit-image").files[0];

  if (!productName || !description || !price || !stock || !category) {
    alert("Please fill in all the data");
    return;
  }

  if (isNaN(price) || price <= 0 || isNaN(stock) || stock < 0) {
    alert("Price and stock must be valid positive numbers.");
    return;
  }

  const formData = new FormData();
  formData.append("id",          editingProductId);
  formData.append("action",      "edit");
  formData.append("name",        productName);
  formData.append("description", description);
  formData.append("price",       price);
  formData.append("stock",       stock);
  formData.append("category",    category);
  if (image) formData.append("image", image);

  fetch("api/products.php", { method: "POST", body: formData })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        document.getElementById("edit-product-modal").style.display = "none";
        loadProducts();
        showToast("Product updated!");
      } else {
        alert(data.message);
      }
    });
});

// Cancel — Edit modal (header X and footer Cancel)
document.getElementById("card-editcancel-btn").addEventListener("click", () => {
  document.getElementById("edit-product-modal").style.display = "none";
});
document.getElementById("card-editcancel-btn-2").addEventListener("click", () => {
  document.getElementById("edit-product-modal").style.display = "none";
});

// ─── DELETE PRODUCT ───────────────────────────────────────
let deletingProductId = null;

function openDeleteModal(id, name) {
  deletingProductId = id;
  document.getElementById("delete-product-msg").textContent =
    `"${name}" will be permanently removed. This cannot be undone.`;
  document.getElementById("delete-product-modal").style.display = "flex";
}

document.getElementById("confirm-delete-btn").addEventListener("click", () => {
  fetch("api/products.php", {
    method: "POST",
    body: new URLSearchParams({ action: "delete", id: deletingProductId }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        document.getElementById("delete-product-modal").style.display = "none";
        loadProducts();
        showToast("Product deleted.");
      } else {
        alert(data.message);
      }
    });
});

// ─── FILTER TABS ──────────────────────────────────────────
let currentFilter = "all";

function filterProducts(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll(".pm-tab").forEach((b) => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  applyCurrentFilter();
}

function applyCurrentFilter() {
  const rows = document.querySelectorAll("#products-table-body tr");
  rows.forEach((row) => {
    const stockCell = row.cells[4];
    if (!stockCell) return;
    const stock = parseInt(stockCell.textContent) || 0;

    if (currentFilter === "all") {
      row.style.display = "";
    } else if (currentFilter === "in-stock") {
      row.style.display = stock > 0 ? "" : "none";
    } else if (currentFilter === "out-of-stock") {
      row.style.display = stock === 0 ? "" : "none";
    }
  });
}

// ─── CLOSE MODALS ON BACKDROP CLICK ──────────────────────
["add-product-modal", "edit-product-modal", "delete-product-modal"].forEach((id) => {
  document.getElementById(id)?.addEventListener("click", function (e) {
    if (e.target === this) this.style.display = "none";
  });
});

// ─── TOAST ────────────────────────────────────────────────
function showToast(msg) {
  const toast = document.getElementById("toasty");
  const msgEl = toast.querySelector(".pm-toast-msg");
  if (msgEl) msgEl.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2800);
}

// ─── FILE LABEL UPDATER ───────────────────────────────────
function updateFileLabel(inputId, labelId) {
  const file  = document.getElementById(inputId)?.files[0];
  const label = document.getElementById(labelId);
  if (label) label.textContent = file ? file.name : "Click to upload image";
}

// ─── UTILITIES ────────────────────────────────────────────
function escHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&#39;");
}

function cap(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─── RUN ON PAGE LOAD ─────────────────────────────────────
loadProducts();