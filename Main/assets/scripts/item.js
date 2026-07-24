// ─── GET PRODUCT ID FROM URL ──────────────────────────────
const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

// redirect to catalogue if no id in URL
if (!productId) window.location.href = "catalogue.html";

// ─── LOAD PRODUCT DETAILS ─────────────────────────────────
function loadProduct() {
  fetch(`api/products.php?action=single&id=${productId}`)
    .then((res) => res.json())
    .then((product) => {
      document.getElementById("page-title").textContent =
        product.name + " | KapeBara";
      document.getElementById("product-name").textContent = product.name;
      document.getElementById("product-title").textContent = product.name;
      document.getElementById("product-price").textContent =
        "₱ " + product.price;
      document.getElementById("product-description").textContent =
        product.description;
      document.getElementById("product-category").textContent =
        product.category;
      document.getElementById("product-image").src =
        "assets/img/items/" + product.image;
      document.getElementById("product-image").alt = product.name;
      document.querySelector(".addtocart").onclick = () =>
        addToCart(product.id);
      document.querySelector(".buywithvoucher").onclick = () => {
        addToCart(product.id);
        window.location.href = "CART.html";
      };
    });
}

// ─── LOAD SOLD COUNT ──────────────────────────────────────
function loadSold() {
  fetch(`api/sold.php?action=single&id=${productId}`)
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        document.getElementById("totalSold").textContent = data.sold;
      }
    });
}

// ─── LOAD COMMENTS ────────────────────────────────────────
function loadComments() {
  fetch(`api/comments.php?action=get&product_id=${productId}`)
    .then((res) => res.json())
    .then((data) => {
      // FIX: unwrap the comments array from the response object
      if (!data.success) {
        console.error("Failed to load comments:", data.message);
        return;
      }

      const comments = data.comments;
      const list = document.getElementById("comments-list");

      if (comments.length === 0) {
        list.innerHTML = "<p>No comments yet. Be the first!</p>";
        return;
      }

      // build each comment
      list.innerHTML = comments
        .map(
          (c) => `
        <div class="comment" data-stars="${c.rating}">
          <strong>${c.user_name}:</strong>
          <span class="rating">${"⭐".repeat(c.rating)}</span>
          ${c.comment}
        </div>
      `,
        )
        .join("");

      // update review count and average rating
      updateRating(comments);
    });
}

// ─── UPDATE STAR RATING DISPLAY ───────────────────────────
function updateRating(comments) {
  const total = comments.reduce((sum, c) => sum + parseInt(c.rating), 0);
  const average = total / comments.length;
  const stars = "⭐".repeat(Math.round(average));

  document.getElementById("productRating").textContent = stars;
  document.getElementById("totalComments").textContent = comments.length;
}

// ─── STAR RATING INTERACTION ──────────────────────────────
const stars = document.querySelectorAll(".star-rating .star");
const ratingValue = document.getElementById("ratingValue");

stars.forEach((star) => {
  star.addEventListener("click", () => {
    const value = star.getAttribute("data-value");
    ratingValue.value = value;
    stars.forEach((s) => {
      s.style.opacity = s.getAttribute("data-value") <= value ? "1" : "0.4";
    });
  });

  star.addEventListener("mouseover", () => {
    const value = star.getAttribute("data-value");
    stars.forEach((s) => {
      s.style.opacity = s.getAttribute("data-value") <= value ? "1" : "0.4";
    });
  });
});

// ─── STAR FILTER ──────────────────────────────────────────
document.querySelectorAll(".star-filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".star-filter-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const filter = btn.getAttribute("data-stars");
    document.querySelectorAll(".comment").forEach((comment) => {
      const commentStars = comment.getAttribute("data-stars");
      comment.style.display =
        filter === "all" || commentStars === filter ? "block" : "none";
    });
  });
});

// ─── RUN ON PAGE LOAD ─────────────────────────────────────
loadProduct();
loadComments();
loadSold();