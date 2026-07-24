// ─── LOAD ALL COMMENTS INTO TABLE ─────────────────────────
function loadComments() {
  fetch("api/adminComments.php?action=all")
    .then((res) => res.json())
    .then((comments) => {
      const tbody = document.getElementById("comments-table-body");
      tbody.innerHTML = "";

      if (!comments.length) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="cm-empty">No comments found.</div></td></tr>`;
        return;
      }

      tbody.innerHTML = comments
        .map((c) => {
          const rating = parseInt(c.rating) || 0;
          const stars = renderStars(rating);
          const date = c.created_at
            ? new Date(c.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })
            : "—";

          return `<tr>
            <td><span class="cm-username"><i class="fa-solid fa-circle-user"></i> ${escCm(c.user_name)}</span></td>
            <td><span class="cm-product">${escCm(c.product_name || "Unknown Product")}</span></td>
            <td><div class="cm-stars">${stars}</div></td>
            <td><span class="cm-comment-text">${escCm(c.comment)}</span></td>
            <td><span class="cm-date">${date}</span></td>
            <td>
              <button class="cm-btn-del" data-id="${c.id}" data-user="${escCm(c.user_name)}">
                <i class="fa-solid fa-trash"></i>
              </button>
            </td>
          </tr>`;
        })
        .join("");

      attachCommentEvents();
    });
}

// ─── STAR RENDERER ────────────────────────────────────────
function renderStars(rating) {
  let html = "";
  for (let i = 1; i <= 5; i++) {
    html += `<i class="fa-solid fa-star ${i <= rating ? "cm-star-filled" : "cm-star-empty"}"></i>`;
  }
  return html;
}

// ─── ATTACH DELETE EVENT ──────────────────────────────────
function attachCommentEvents() {
  document.querySelectorAll(".cm-btn-del").forEach((btn) => {
    btn.onclick = () => openCommentDeleteModal(btn.dataset.id, btn.dataset.user);
  });
}

// ─── DELETE MODAL ─────────────────────────────────────────
let deletingCommentId = null;

function openCommentDeleteModal(id, userName) {
  deletingCommentId = id;
  document.getElementById("delete-comment-msg").textContent =
    `The comment by "${userName}" will be permanently removed. This cannot be undone.`;
  document.getElementById("delete-comment-modal").style.display = "flex";
}

document.getElementById("confirm-comment-delete-btn").addEventListener("click", () => {
  fetch("api/adminComments.php", {
    method: "POST",
    body: new URLSearchParams({ action: "delete", id: deletingCommentId }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        document.getElementById("delete-comment-modal").style.display = "none";
        loadComments();
        showCommentToast("Comment deleted.");
      } else {
        alert("Failed to delete comment.");
      }
    });
});

document.getElementById("cancel-comment-delete-btn").addEventListener("click", () => {
  document.getElementById("delete-comment-modal").style.display = "none";
});

// ─── CLOSE MODAL ON BACKDROP CLICK ───────────────────────
document.getElementById("delete-comment-modal")?.addEventListener("click", function (e) {
  if (e.target === this) this.style.display = "none";
});

// ─── TOAST ────────────────────────────────────────────────
function showCommentToast(msg) {
  const toast = document.getElementById("cm-toasty");
  const msgEl = toast.querySelector(".cm-toast-msg");
  if (msgEl) msgEl.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2800);
}

// ─── UTILITY ──────────────────────────────────────────────
function escCm(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── RUN ON PAGE LOAD ─────────────────────────────────────
loadComments();