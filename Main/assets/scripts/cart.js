// ─── GUEST CART HELPERS ───────────────────────────────────
function isGuest() {
  return !localStorage.getItem("user_id");
}

function getGuestCart() {
  return JSON.parse(localStorage.getItem("guest_cart") || "[]");
}

function saveGuestCart(cart) {
  localStorage.setItem("guest_cart", JSON.stringify(cart));
}

function addToGuestCart(product) {
  // product = { product_id, name, price, image }
  const cart = getGuestCart();
  const existing = cart.find((i) => i.product_id === product.product_id);
  if (existing) {
    existing.quantity++;
  } else {
    cart.push({ ...product, id: Date.now(), quantity: 1 });
  }
  saveGuestCart(cart);
  loadCart();
}

// ─── LOAD CART ────────────────────────────────────────────
function loadCart() {
  if (isGuest()) {
    const items = getGuestCart();
    renderCartItems(items);
    return;
  }
  fetch("api/cart.php?action=get")
    .then((res) => res.json())
    .then((items) => renderCartItems(items))
    .catch(() => {
      document.getElementById("cart-items").innerHTML =
        "<p>Failed to load cart.</p>";
    });
}

// ─── RENDER CART ITEMS ────────────────────────────────────
function renderCartItems(items) {
  const container = document.getElementById("cart-items");
  const summary = document.getElementById("cart-summary");
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `
      <div class="empty-cart">
        <p>Your cart is empty!</p>
        <a href="catalogue.html">Browse Products</a>
      </div>`;
    if (summary) summary.style.display = "none";
    return;
  }

  container.innerHTML = `
    <table class="cart-table">
      <thead>
        <tr>
          <th>Image</th>
          <th>Product</th>
          <th>Price</th>
          <th>Quantity</th>
          <th>Subtotal</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (item) => `
          <tr>
            <td>
              <img src="assets/img/items/${item.image}" width="60" height="60"
                style="object-fit:cover; border-radius:8px;">
            </td>
            <td>${item.name}</td>
            <td>₱${item.price}</td>
            <td>
              <div class="qty-container">
                <div class="slider">
                  <button class="qty-btn minus" data-id="${item.id}">-</button>
                  <span class="qty">${item.quantity}</span>
                  <button class="qty-btn plus" data-id="${item.id}">+</button>
                </div>
              </div>
            </td>
            <td class="subtotal">₱${(item.price * item.quantity).toFixed(2)}</td>
            <td>
              <button class="remove-btn" data-id="${item.id}">Remove</button>
            </td>
          </tr>`,
          )
          .join("")}
      </tbody>
    </table>`;

  attachCartEvents();
  calculateSelectedTotal();
  if (summary) summary.style.display = "block";
}

// ─── TOTAL CALCULATION ────────────────────────────────────
function calculateSelectedTotal() {
  let totalItems = 0;
  let totalPrice = 0;

  document.querySelectorAll("tbody tr").forEach((row) => {
    const qty = parseInt(row.querySelector(".qty").textContent);
    const price = parseFloat(row.children[2].textContent.replace("₱", ""));
    totalItems += qty;
    totalPrice += qty * price;
  });
  totalPrice += 100;
  document.getElementById("total-items").textContent = totalItems;
  document.getElementById("total-price").textContent =
    "₱" + totalPrice.toFixed(2);
}

// ─── ATTACH EVENTS ────────────────────────────────────────
function attachCartEvents() {
  document.querySelectorAll(".qty-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cartId = btn.dataset.id;

      const qtySpan = btn.parentElement.querySelector(".qty");
      let currentQty = parseInt(qtySpan.textContent);

      if (btn.classList.contains("plus")) {
        currentQty++;
      } else {
        currentQty--;
      }

      if (currentQty < 1) return;

      updateQty(cartId, currentQty);
    });
  });

  document.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cartId = btn.dataset.id;
      removeItem(cartId);
    });
  });
}

// ─── UPDATE QUANTITY ──────────────────────────────────────
function updateQty(cartId, newQty) {
  if (isGuest()) {
    const cart = getGuestCart();
    const item = cart.find((i) => i.id == cartId);
    if (!item) return;
    item.quantity = newQty;
    saveGuestCart(cart);
    loadCart();
    return;
  }

  fetch("api/cart.php", {
    method: "POST",
    body: new URLSearchParams({
      action: "update",
      cart_id: cartId,
      quantity: newQty,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) loadCart();
    });
}

// ─── REMOVE ITEM ──────────────────────────────────────────
function removeItem(cartId) {
  document.getElementById("toasty").classList.add("active");
  setTimeout(() => {
    document.getElementById("toasty").classList.remove("active");
  }, 1500);

  if (isGuest()) {
    const cart = getGuestCart().filter((i) => i.id != cartId);
    saveGuestCart(cart);
    loadCart();
    return;
  }

  fetch("api/cart.php", {
    method: "POST",
    body: new URLSearchParams({
      action: "remove",
      cart_id: cartId,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) loadCart();
    });
}

// ─── CHECKOUT ─────────────────────────────────────────────
function checkout() {
  if (!confirm("Proceed to payment?")) return;

  if (isGuest()) {
    const name  = localStorage.getItem("user_name");
    const email = localStorage.getItem("guest_email");

    // If they haven't filled in address/contact yet, stop and ask
    if (!name || !email) {
      alert("Please fill in your delivery details first (click Edit).");
      return;
    }

    const cart = getGuestCart();
    if (cart.length === 0) {
      alert("Your cart is empty!");
      return;
    }

    // Send cart + guest info to a dedicated guest-payment endpoint
    fetch("api/guest_payment.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, cart }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          window.location.href = data.checkout_url;
        } else {
          alert(data.message);
          console.error(data.error);
        }
      })
      .catch((err) => {
        alert("Something went wrong!");
        console.error(err);
      });
    return;
  }

  // Logged-in flow unchanged
  fetch("api/payment.php")
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        window.location.href = data.checkout_url;
      } else {
        alert(data.message);
        console.error(data.error);
      }
    })
    .catch((err) => {
      alert("Something went wrong!");
      console.error(err);
    });
}

// ─── LOAD CART COUNT  ────────────────────────────────────
function updateCartCount() {
  if (isGuest()) {
    const count = getGuestCart().reduce((sum, i) => sum + i.quantity, 0);
    const badge = document.getElementById("cartItemCount");
    if (badge) badge.textContent = count;
    return;
  }

  fetch("api/cart.php?action=count")
    .then((res) => res.json())
    .then((data) => {
      const cart = document.getElementById("cartItemCount");
      if (cart) cart.textContent = data.count;
    });
}

// ─── ADDRESS DISPLAY ─────────────────────────────────────
function updateAddress() {
  const address = localStorage.getItem("user_address");
  const phone   = localStorage.getItem("user_phone");
  const city    = localStorage.getItem("user_city");
  const name    = localStorage.getItem("user_name");
  const email   = localStorage.getItem("user_email");

  const div = document.getElementById("display-email");
  div.style.display = isGuest() ? "flex" : "none";

  document.getElementById("name").textContent    = name    || "Guest";
  document.getElementById("address").textContent = address || "—";
  document.getElementById("phone").textContent   = phone   || "—";
  document.getElementById("city").textContent    = city    || "—";
  document.getElementById("email").textContent   = localStorage.getItem("guest_email") || "—";

}

function openEditCard() {
  document.getElementById("editCard").classList.add("active");
  document.getElementById("edit-name").value    = localStorage.getItem("user_name")    || "";
  document.getElementById("edit-phone").value   = localStorage.getItem("user_phone")   || "";
  document.getElementById("edit-city").value    = localStorage.getItem("user_city")    || "";
  document.getElementById("edit-address").value = localStorage.getItem("user_address") || "";
  
  // Show email field only for guests
  const emailRow = document.getElementById("edit-email-row");
  if (emailRow) {
    emailRow.style.display = isGuest() ? "block" : "none";
    document.getElementById("edit-email").value = localStorage.getItem("guest_email");
  }
}

function closeCard() {
  document.getElementById("editCard").classList.remove("active");
}

function editAddress() {
  const name    = document.getElementById("edit-name").value.trim();
  const address = document.getElementById("edit-address").value.trim();
  const phone   = document.getElementById("edit-phone").value.trim();
  const city    = document.getElementById("edit-city").value.trim();

  if (!name || !address || !phone || !city) {
    alert("Please fill up all fields");
    return;
  }

  // Guest: just save to localStorage, no DB call needed
  if (isGuest()) {
    localStorage.setItem("user_name",    name);
    localStorage.setItem("user_address", address);
    localStorage.setItem("user_phone",   phone);
    localStorage.setItem("user_city",    city);

    localStorage.setItem("guest_email", document.getElementById("edit-email").value.trim());
    alert("Address saved!");
    closeCard();
    updateAddress();
    return;
  }

  const id = localStorage.getItem("user_id");

  fetch("api/cart.php", {
    method: "POST",
    body: new URLSearchParams({
      action: "edit",
      id,
      name,
      address,
      city,
      phone,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        localStorage.setItem("user_name",    data.name);
        localStorage.setItem("user_id",      data.id);
        localStorage.setItem("user_phone",   data.phone);
        localStorage.setItem("user_address", data.address);
        localStorage.setItem("user_city",    data.city);
        alert("Address Updated!");
        window.location.href = "CART.html";
      } else {
        alert(data.message);
      }
    });
}


// ─── RUN ON PAGE LOAD ─────────────────────────────────────
updateAddress();
loadCart();
updateCartCount();
console.log("user_id raw value:", localStorage.getItem("user_id"));
console.log("isGuest result:", isGuest());
console.log("guest_email:", localStorage.getItem("guest_email"));
console.log("user_name:", localStorage.getItem("user_name"));
