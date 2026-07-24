// ============================================================
//  admin-chat.js  —  KapeBara Admin Panel
//  Chat + Feedback sections
//  Uses server API instead of localStorage
// ============================================================

// ════════════════════════════════════════════════════════════
//  CHAT
// ════════════════════════════════════════════════════════════

let selectedUser   = null;  // display name
let selectedUserId = null;  // numeric DB user_id

// ── API Helpers ───────────────────────────────────────────
async function getChatData() {
  try {
    const res = await fetch("api/chat.php?action=all");
    if (!res.ok) throw new Error("Failed to fetch chat data");
    return await res.json();
  } catch (err) {
    console.error("getChatData error:", err);
    return {};
  }
}

async function postAdminReply(userId, text) {
  try {
    const res = await fetch("api/chat.php?action=send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from: "admin", message: text, user_id: userId }),
    });
    if (!res.ok) throw new Error("Failed to send reply");
    return await res.json();
  } catch (err) {
    console.error("postAdminReply error:", err);
    return null;
  }
}

// ── Render user list in sidebar ───────────────────────────
async function renderUserList() {
  const data = await getChatData();
  const usersList = document.getElementById("users-list");
  usersList.innerHTML = "";

  const users = Object.keys(data);
  if (users.length === 0) {
    usersList.innerHTML = `<div class="cs-no-conversations">No customer messages yet.</div>`;
    return;
  }

  // Sort by latest message time (newest first)
  const sortedUsers = users.sort((a, b) => {
    const lastA = data[a][data[a].length - 1];
    const lastB = data[b][data[b].length - 1];
    return new Date(lastB.time) - new Date(lastA.time);
  });

  sortedUsers.forEach((user) => {
    // Count unread messages per user
    let unreadCount = 0;
    const lastUserRead =
      localStorage.getItem(`lastUserRead_${user}`) || "2000-01-01T00:00:00.000Z";
    data[user].forEach((msg) => {
      if (msg.from === "user" && new Date(msg.time) > new Date(lastUserRead)) {
        unreadCount++;
      }
    });

    const btn = document.createElement("button");
    btn.className = "cs-user-btn" + (selectedUser === user ? " active" : "");
    btn.dataset.userId = data[user][0]?.user_id ?? "";

    btn.innerHTML = `
      <span class="cs-user-name">${escHtml(user)}</span>
      ${unreadCount > 0
        ? `<span class="cs-unread-badge">${unreadCount > 9 ? "9+" : unreadCount}</span>`
        : ""}
    `;

    btn.addEventListener("click", () => {
      selectedUser   = user;
      selectedUserId = btn.dataset.userId;

      // Update active state
      document.querySelectorAll(".cs-user-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      // Update header
      document.getElementById("selected-user").textContent = user;

      // Mark messages as read
      const messages = data[user];
      const lastMsgTime = messages[messages.length - 1].time;
      localStorage.setItem(`lastUserRead_${user}`, lastMsgTime);

      // Refresh badge + conversation
      setTimeout(renderUserList, 100);
      renderConversation();
    });

    usersList.appendChild(btn);
  });
}

// ── Render conversation messages ──────────────────────────
async function renderConversation() {
  const conv = document.getElementById("conversation");
  if (!selectedUser) {
    conv.innerHTML = `<div class="cs-empty">Select a conversation to get started.</div>`;
    return;
  }

  conv.innerHTML = `<div class="cs-empty">Loading...</div>`;

  const data = await getChatData();
  const chat = data[selectedUser] || [];

  if (chat.length === 0) {
    conv.innerHTML = `<div class="cs-empty">No messages yet from this customer.</div>`;
    return;
  }

  conv.innerHTML = chat.map((msg) => {
    const isAdmin   = msg.from === "admin";
    const bubbleCls = isAdmin ? "cs-bubble cs-bubble-admin" : "cs-bubble cs-bubble-customer";
    const label     = isAdmin ? "You" : escHtml(selectedUser);

    return `<div class="${bubbleCls}">
      <div class="cs-bubble-label">${label}</div>
      <p class="cs-bubble-text">${escHtml(msg.text)}</p>
    </div>`;
  }).join("");

  scrollConversationToBottom();
}

// ── Send admin reply ──────────────────────────────────────
async function sendAdminReply() {
  if (!selectedUser || !selectedUserId) return;

  const textInput = document.getElementById("reply-input");
  const sendBtn   = document.getElementById("reply-send");
  const text      = textInput.value.trim();
  if (!text) return;

  // Disable while sending
  textInput.disabled = true;
  sendBtn.disabled   = true;

  const result = await postAdminReply(selectedUserId, text);

  textInput.disabled = false;
  sendBtn.disabled   = false;

  if (result && result.success) {
    textInput.value = "";
    renderConversation();
    setTimeout(renderUserList, 100);
  } else {
    alert("Failed to send reply. Please try again.");
  }
}

document.getElementById("reply-send").addEventListener("click", sendAdminReply);

document.getElementById("reply-input").addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendAdminReply();
});

// ── Auto scroll ───────────────────────────────────────────
function scrollConversationToBottom() {
  const conv = document.getElementById("conversation");
  if (conv) {
    setTimeout(() => { conv.scrollTop = conv.scrollHeight; }, 50);
  }
}

// ── Notification badge (sidebar nav icon) ─────────────────
async function updateAdminNotificationBadge() {
  const badge = document.getElementById("admin-notification-badge");
  if (!badge) return;

  const data = await getChatData();
  let totalUnread = 0;

  Object.keys(data).forEach((user) => {
    const lastUserRead =
      localStorage.getItem(`lastUserRead_${user}`) || "2000-01-01T00:00:00.000Z";
    data[user].forEach((msg) => {
      if (msg.from === "user" && new Date(msg.time) > new Date(lastUserRead)) {
        totalUnread++;
      }
    });
  });

  if (totalUnread > 0) {
    badge.textContent = totalUnread > 9 ? "9+" : totalUnread;
    badge.style.display = "flex";
  } else {
    badge.style.display = "none";
  }
}

// ── Hook into showContent ─────────────────────────────────
const _prevShowContent = window.showContent;
window.showContent = function (id) {
  _prevShowContent(id);
  if (id === "contact") {
    renderUserList();
    renderConversation();
    setTimeout(updateAdminNotificationBadge, 100);
  }
  if (id === "feedback") {
    loadFeedbackAdmin();
  }
};

setInterval(updateAdminNotificationBadge, 5000);

// ════════════════════════════════════════════════════════════
//  FEEDBACK
// ════════════════════════════════════════════════════════════

const AVATAR_COLORS_feedback = [
  ["#e8f0fe", "#1a56bd"], ["#fef3e2", "#92520a"], ["#e8f5ee", "#1a6b3a"],
  ["#fbe9f7", "#8b2279"], ["#f0f0ff", "#4338ca"], ["#fdf2e9", "#9b440a"],
];

function fbAvatarColor(name) {
  let hash = 0;
  for (const ch of (name || "?")) hash = (hash * 31 + ch.charCodeAt(0)) % AVATAR_COLORS_feedback.length;
  return AVATAR_COLORS_feedback[hash];
}

function fbInitials(name) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

let allFeedbackCache = [];
let currentFbFilter  = "all";

function loadFeedbackAdmin() {
  fetch("api/Feedback.php?action=all")
    .then((res) => res.json())
    .then((rows) => {
      allFeedbackCache = rows;
      applyFeedbackFilter();
    })
    .catch((err) => console.error("Admin feedback load error:", err));
}

function filterFeedback(filter, btn) {
  currentFbFilter = filter;
  document.querySelectorAll(".fb-tab").forEach((b) => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  applyFeedbackFilter();
}

function applyFeedbackFilter() {
  let rows = allFeedbackCache;

  if (currentFbFilter === "5") {
    rows = rows.filter((r) => parseInt(r.rating) === 5);
  } else if (currentFbFilter === "4") {
    rows = rows.filter((r) => parseInt(r.rating) === 4);
  } else if (currentFbFilter === "low") {
    rows = rows.filter((r) => parseInt(r.rating) <= 3);
  }

  renderFeedbackTable(rows);
}

function renderFeedbackTable(rows) {
  const tbody = document.getElementById("feedback-table-body");
  if (!tbody) return;

  const count = document.getElementById("fb-count");
  if (count) count.textContent = `${rows.length} review${rows.length !== 1 ? "s" : ""}`;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="fb-empty">No feedback found.</div></td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((item) => {
    const rating   = parseInt(item.rating) || 0;
    const [bg, fg] = fbAvatarColor(item.name);
    const ini      = fbInitials(item.name);

    const stars = `<div class="fb-stars">
      ${"★".repeat(rating).split("").map(() => `<span class="fb-star-filled">★</span>`).join("")}
      ${"★".repeat(5 - rating).split("").map(() => `<span class="fb-star-empty">★</span>`).join("")}
    </div>`;

    const photo = item.photo
      ? `<img src="assets/img/feedback/${item.photo}"
               class="fb-photo"
               onclick="openLightbox('assets/img/feedback/${item.photo}')"
               onerror="this.style.display='none'">`
      : `<span class="fb-no-photo">—</span>`;

    const date = item.created_at ? item.created_at.split(" ")[0] : "—";

    return `<tr>
      <td>
        <div class="fb-name-cell">
          <span class="fb-avatar" style="background:${bg};color:${fg}">${ini}</span>
          <span>${escHtml(item.name)}</span>
        </div>
      </td>
      <td style="color:#aaa;font-size:12px">${escHtml(item.email)}</td>
      <td>${stars}</td>
      <td><span class="fb-cat">${escHtml(item.category)}</span></td>
      <td>${escHtml(item.subject)}</td>
      <td>
        <span class="fb-msg" title="${escHtml(item.message)}">${escHtml(item.message)}</span>
      </td>
      <td>${photo}</td>
      <td class="fb-date">${date}</td>
    </tr>`;
  }).join("");
}

// ── Lightbox ──────────────────────────────────────────────
function openLightbox(src) {
  const lb  = document.getElementById("fb-lightbox");
  const img = document.getElementById("fb-lightbox-img");
  if (!lb || !img) return;
  img.src = src;
  lb.classList.add("open");
}

function closeLightbox() {
  const lb = document.getElementById("fb-lightbox");
  if (lb) lb.classList.remove("open");
}

// ── Utility ───────────────────────────────────────────────
function escHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&#39;");
}

// ── Init ──────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  renderUserList();
  updateAdminNotificationBadge();
  loadFeedbackAdmin();
});