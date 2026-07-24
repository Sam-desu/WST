// ─── BUILD ONE CARD ───────────────────────────────────────
function createCard(item) {
  return `
        <div class="card">
            <a href="item.html?id=${item.id}">
                <img src="assets/img/items/${item.image}" alt="${item.name}"/>
            </a>
            <h3>${item.name}</h3>
            <p>${item.description}</p>
            <div class="card-footer">
                <span>₱${item.price}</span>
                <div class="btn-group">
                    <button class="buy" 
                            onclick="addToCart(${item.id}); window.location.href='CART.html'">
                        Buy
                    </button>
                    <button class="cart" 
                            onclick="addToCart(${item.id})">
                        Add
                    </button>
                </div>
            </div>
        </div>`;
}

function addToCart(productId) {
  if (!localStorage.getItem("user_id")) {
    fetch(`api/products.php?action=single&id=${productId}`)
      .then((res) => res.json())
      .then((product) => {
        addToGuestCart({
          product_id: product.id,
          name:       product.name,
          price:      product.price,
          image:      product.image,
        });
        document.getElementById("toasty").classList.add("active");
        setTimeout(() => document.getElementById("toasty").classList.remove("active"), 1500);
      });
    return;
  }


  fetch("api/cart.php", {
    method: "POST",
    body: new URLSearchParams({ action: "add", product_id: productId }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        document.getElementById("toasty").classList.add("active");
        setTimeout(() => document.getElementById("toasty").classList.remove("active"), 1500);
      }
    });
}

// ─── LOAD A SECTION ───────────────────────────────────────
function loadSection(category, containerId) {
  const container = document.getElementById(containerId);

  // show loading state while fetching
  container.innerHTML = "<p>Loading...</p>";

  fetch(`api/products.php?action=get&category=${category}`)
    .then((res) => res.json())
    .then((products) => {
      if (products.length === 0) {
        container.innerHTML = "<p>No products found.</p>";
        return;
      }
      container.innerHTML = products.map(createCard).join("");
    })
    .catch((err) => {
      container.innerHTML = "<p>Failed to load products.</p>";
      console.error(err);
    });
}

// ─── RUN ON PAGE LOAD ─────────────────────────────────────
loadSection("drinks", "drinks-grid");
loadSection("snacks", "snacks-grid");

const searchInput = document.getElementById("searchInput");
const searchResults = document.getElementById("searchResults");

if (searchInput && searchResults) {
  searchInput.addEventListener("input", function () {
    const keyword = this.value.trim();

    if (keyword === "") {
      searchResults.innerHTML = "";
      searchResults.style.display = "none";
      return;
    }

    fetch(`api/products.php?action=search&search=${encodeURIComponent(keyword)}`)
      .then((res) => res.json())
      .then((products) => {
        if (!products.length) {
          searchResults.innerHTML = `<div class="search-result-empty">No products found</div>`;
          searchResults.style.display = "block";
          return;
        }

        searchResults.innerHTML = products.map(product => `
          <div class="search-result-item" onclick="window.location.href='item.html?id=${product.id}'">
            <img src="assets/img/items/${product.image}" alt="${product.name}">
            <div class="search-result-info">
              <h6>${product.name}</h6>
              <p>${product.category} • ₱${product.price}</p>
            </div>
          </div>
        `).join("");

        searchResults.style.display = "block";
      })
      .catch((err) => {
        console.error("Search error:", err);
        searchResults.innerHTML = `<div class="search-result-empty">Search failed</div>`;
        searchResults.style.display = "block";
      });
  });

  document.addEventListener("click", function (e) {
    const wrapper = document.querySelector(".search-wrapper");
    if (wrapper && !wrapper.contains(e.target)) {
      searchResults.style.display = "none";
    }
  });
}