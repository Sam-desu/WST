// ============================================================
//  chat.js  —  KapeBara User Chat Widget
//  Uses server API instead of localStorage
// ============================================================

// ── API Helpers ───────────────────────────────────────────
async function fetchUserMessages() {
  try {
    const res = await fetch("api/chat.php?action=get");
    if (!res.ok) throw new Error("Failed to fetch messages");
    return await res.json();
  } catch (err) {
    console.error("fetchUserMessages error:", err);
    return [];
  }
}

async function postUserMessage(text) {
  try {
    const res = await fetch("api/chat.php?action=send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from: "user", message: text }),
    });
    if (!res.ok) throw new Error("Failed to send message");
    return await res.json();
  } catch (err) {
    console.error("postUserMessage error:", err);
    return null;
  }
}

// ── Utilities ─────────────────────────────────────────────
function getCurrentUserId() {
  return localStorage.getItem("user_name") || "guest";
}

function isUserLoggedIn() {
  return localStorage.getItem("user_name") !== null;
}

// ── AI Chat ───────────────────────────────────────────────
function renderAIChat() {
  const popup = document.getElementById("chat-popup");
  popup.style.maxHeight = "580px";
  popup.style.minHeight = "420px";

  const backBtn = document.getElementById("chat-back-btn");
  if (backBtn) backBtn.style.display = "block";

  const content = document.getElementById("chat-content");
  content.innerHTML = `
    <div><strong>AI Chat (sample questions)</strong></div>
    <div class="mt-2">
      <button class="btn btn-sm btn-light w-100 mb-1" data-q="what is your best drink?">What is your best drink?</button>
      <button class="btn btn-sm btn-light w-100 mb-1" data-q="what is your best snack?">What is your best snack?</button>
      <button class="btn btn-sm btn-light w-100 mb-1" data-q="what are your opening hours?">What are your opening hours?</button>
      <button class="btn btn-sm btn-light w-100 mb-1" data-q="do you have gluten free options?">Do you have gluten free options?</button>
      <button class="btn btn-sm btn-light w-100 mb-1" data-q="do you offer delivery?">Do you offer delivery?</button>
    </div>
    <div id="ai-response" class="mt-2" style="min-height:60px"></div>
    <div class="input-row">
      <input id="ai-input" type="text" placeholder="Ask AI..." />
      <button id="ai-send" class="btn btn-sm btn-primary">Send</button>
    </div>
  `;

  content.querySelectorAll("button[data-q]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const q = btn.dataset.q;
      processAIQuestion(q);
      btn.remove();
    });
  });

  function sendAIMessage() {
    const q = document.getElementById("ai-input").value.trim();
    if (!q) return;
    processAIQuestion(q);
    document.getElementById("ai-input").value = "";
  }

  document.getElementById("ai-send").addEventListener("click", sendAIMessage);
  document.getElementById("ai-input").addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendAIMessage();
  });
}

function processAIQuestion(q) {
  const responses = {
    "what is your best drink?":
      "Our best seller drink is the Kape Amerikano! It's smooth, rich, and perfectly balanced. Many customers also love our Kape Vanilla and Kape Mocha.",
    "what is your best snack?":
      "We have amazing snacks that pair perfectly with our coffee! Our customers love our freshly baked pastries and cookies. Visit our catalogue to see all options!",
    "what are your opening hours?":
      "We're open daily from 7:00 AM to 10:00 PM. Come visit us anytime for your coffee fix!",
    "do you have gluten free options?":
      "Yes, we have gluten-free snacks available! Just ask our staff in-store and they'll be happy to help you.",
    "do you offer delivery?":
      "Yes! We offer delivery services. You can order through our website or contact us directly for delivery options.",
  };

  const answer =
    responses[q.toLowerCase()] ||
    "I'm not sure about that, but our best seller is Kape Amerikano! Feel free to ask another question or contact our admin for more help.";

  document.getElementById("ai-response").innerHTML =
    `<div class="chat-message chat-msg-bot">${answer}</div>`;
}

// ── Admin Chat ────────────────────────────────────────────
async function renderAdminChat() {
  const popup = document.getElementById("chat-popup");
  popup.style.maxHeight = "580px";
  popup.style.minHeight = "420px";

  const backBtn = document.getElementById("chat-back-btn");
  if (backBtn) backBtn.style.display = "block";

  // Show loading state
  document.getElementById("chat-content").innerHTML = `
    <div><strong>Admin Chat</strong></div>
    <div id="admin-conversation" style="max-height:280px;overflow-y:auto;display:flex;flex-direction:column;gap:5px;margin-top:8px;">
      <em>Loading messages...</em>
    </div>
    <div class="input-row">
      <input id="admin-input" type="text" placeholder="Type a message to admin" disabled />
      <button id="admin-send" class="btn btn-sm btn-primary" disabled>Send</button>
    </div>
  `;

  // Fetch messages from server
  const history = await fetchUserMessages();

  const messagesHtml = history
    .map((msg) => {
      const cls = msg.from === "admin" ? "chat-msg-admin" : "chat-msg-user";
      return `<div class="chat-message ${cls}">
        <small>${msg.from === "admin" ? "Admin" : "You"}:</small> ${msg.text}
      </div>`;
    })
    .join("");

  document.getElementById("chat-content").innerHTML = `
    <div><strong>Admin Chat</strong></div>
    <div id="admin-conversation" style="max-height:280px;overflow-y:auto;display:flex;flex-direction:column;gap:5px;margin-top:8px;">
      ${messagesHtml || "<em>No messages yet. Say hi!</em>"}
    </div>
    <div class="input-row">
      <input id="admin-input" type="text" placeholder="Type a message to admin" />
      <button id="admin-send" class="btn btn-sm btn-primary">Send</button>
    </div>
  `;

  // Scroll to bottom
  setTimeout(() => {
    const conv = document.getElementById("admin-conversation");
    if (conv) conv.scrollTop = conv.scrollHeight;
  }, 50);

  async function sendAdminMessage() {
    const input = document.getElementById("admin-input");
    const sendBtn = document.getElementById("admin-send");
    const text = input.value.trim();
    if (!text) return;

    // Disable while sending
    input.disabled = true;
    sendBtn.disabled = true;

    const result = await postUserMessage(text);
    if (result && result.success) {
      input.value = "";
    } else {
      alert("Failed to send message. Please try again.");
    }

    // Re-render to show new message
    renderAdminChat();
  }

  document.getElementById("admin-send").addEventListener("click", sendAdminMessage);
  document.getElementById("admin-input").addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendAdminMessage();
  });
}

// ── Main Menu ─────────────────────────────────────────────
function showMainMenu() {
  const popup = document.getElementById("chat-popup");
  popup.style.maxHeight = "280px";
  popup.style.minHeight = "240px";

  const backBtn = document.getElementById("chat-back-btn");
  if (backBtn) backBtn.style.display = "none";

  const content = document.getElementById("chat-content");
  content.innerHTML = `
    <div class="chat-option-list">
      <button id="btn-ai-chat" class="btn btn-outline-secondary">AI Chat</button>
      <button id="btn-admin-chat" class="btn btn-outline-primary">Admin Chat</button>
    </div>
  `;

  document.getElementById("btn-ai-chat").addEventListener("click", renderAIChat);
  document.getElementById("btn-admin-chat").addEventListener("click", renderAdminChat);
}

// ── Open / Close ──────────────────────────────────────────
document.getElementById("open-chat-btn").addEventListener("click", () => {
  if (!isUserLoggedIn()) {
    alert("Please login to use the chat feature!");
    window.location.href = "login.html";
    return;
  }

  const popup = document.getElementById("chat-popup");
  const wasActive = popup.classList.contains("active");
  popup.classList.toggle("active");
  popup.setAttribute("aria-hidden", String(!popup.classList.contains("active")));

  if (!wasActive) {
    showMainMenu();
    // Mark messages as read
    localStorage.setItem("lastChatRead", new Date().toISOString());
    setTimeout(updateNotificationBadge, 100);
  }

  document.getElementById("chat-content").scrollTop = 0;
});

const chatBackBtn = document.getElementById("chat-back-btn");
if (chatBackBtn) {
  chatBackBtn.addEventListener("click", showMainMenu);
}

document.getElementById("close-chat-btn").addEventListener("click", () => {
  const popup = document.getElementById("chat-popup");
  popup.classList.remove("active");
  popup.setAttribute("aria-hidden", "true");
});

// ── Notification Badge ────────────────────────────────────
async function updateNotificationBadge() {
  const badge = document.getElementById("chat-notification-badge");
  if (!badge) return;

  const history = await fetchUserMessages();
  const lastReadTime = localStorage.getItem("lastChatRead") || 0;

  const unread = history.filter(
    (msg) => msg.from === "admin" && new Date(msg.time) > new Date(lastReadTime)
  ).length;

  if (unread > 0) {
    badge.textContent = unread > 9 ? "9+" : unread;
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }
}

// Check for new messages every 5 seconds
setInterval(updateNotificationBadge, 5000);

document.addEventListener("DOMContentLoaded", updateNotificationBadge);