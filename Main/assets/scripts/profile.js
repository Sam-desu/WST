// ── Section switcher ──────────────────────────────────────
function show(id, btn) {
  document
    .querySelectorAll(".p-section")
    .forEach((s) => s.classList.remove("active"));
  document
    .querySelectorAll(".p-nav-btn")
    .forEach((b) => b.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  if (btn) btn.classList.add("active");
}

// ── Orders: toggle detail row ─────────────────────────────
function toggleOrd(btn, rowId) {
  const row = document.getElementById(rowId);
  row.classList.toggle("open");
  const icon = btn.querySelector("i");
  icon.className = row.classList.contains("open")
    ? "fa-solid fa-chevron-up"
    : "fa-solid fa-chevron-down";
}

// ── Addresses ─────────────────────────────────────────────
function toggleAddAddr() {
  const panel = document.getElementById("addAddrPanel");
  panel.classList.toggle("open");
}

function addAddr() {
  const label = document.getElementById("newLabel").value;
  const bgy = document.getElementById("newBgy").value.trim();
  const street = document.getElementById("newStreet").value.trim();
  const city = document.getElementById("newCity2").value.trim();
  const zip = document.getElementById("newZip").value.trim();

  if (!street || !city) {
    toast("Please fill in Street and City.");
    return;
  }

  const card = document.createElement("div");
  card.className = "addr-card";
  card.innerHTML = `
    <div>
      <span class="addr-badge">${label}</span>
      <div class="addr-txt">${street}, ${bgy}, ${city} ${zip}</div>
    </div>
    <div class="addr-acts">
      <button class="kb-btn kb-btn-out kb-btn-sm"><i class="fa-solid fa-pen"></i></button>
      <button class="kb-btn kb-btn-del kb-btn-sm" onclick="delAddr(this)"><i class="fa-solid fa-trash"></i></button>
    </div>`;
  document.getElementById("addrList").appendChild(card);
  toggleAddAddr();
  toast("Address saved!");
}

function delAddr(btn) {
  btn.closest(".addr-card").remove();
  toast("Address removed.");
}

// ── Payment methods ───────────────────────────────────────
function removePay(btn) {
  btn.closest(".pay-card").remove();
  toast("Payment method removed.");
}

// ── Profile ───────────────────────────────────────────────
// Store original values for cancel
let _origProfile = {};

// Load profile data from localStorage (set during login) into form fields
function loadProfile() {
  document.getElementById("iName").value =
    localStorage.getItem("user_name") || "";
  document.getElementById("iEmail").value =
    localStorage.getItem("user_email") || "";
  document.getElementById("iPhone").value =
    localStorage.getItem("user_phone") || "";
  document.getElementById("iAddr").value =
    localStorage.getItem("user_address") || "";
  document.getElementById("iCity").value =
    localStorage.getItem("user_city") || "";

  document.getElementById("sidebarName").textContent =
    localStorage.getItem("user_name") || "Guest";
}

function saveProfile() {
  const name = document.getElementById("iName").value.trim();
  const email = document.getElementById("iEmail").value.trim();
  const phone = document.getElementById("iPhone").value.trim();
  const address = document.getElementById("iAddr").value.trim();
  const city = document.getElementById("iCity").value.trim();

  if (!name || !email) {
    toast("Name and email are required.");
    return;
  }

  const fd = new FormData();
  fd.append("action", "update");
  fd.append("name", name);
  fd.append("email", email);
  fd.append("phone", phone);
  fd.append("address", address);
  fd.append("city", city);

  fetch("api/auth.php", { method: "POST", body: fd })
    .then((r) => r.json())
    .then((data) => {
      if (data.success) {
        // Update localStorage so navbar and other pages stay in sync
        const user = JSON.parse(localStorage.getItem("kb_user") || "{}");
        user.name = data.name;
        user.email = data.email;
        user.phone = data.phone;
        user.address = data.address;
        user.city = data.city;
        localStorage.setItem("kb_user", JSON.stringify(user));

        document.getElementById("sidebarName").textContent = data.name;
        _origProfile = { ...user };
        toast(data.message);
      } else {
        toast(data.message || "Update failed.");
      }
    })
    .catch(() => toast("Network error. Please try again."));
}

function cancelProfile() {
  // Restore fields to last saved state
  document.getElementById("iName").value = _origProfile.name || "";
  document.getElementById("iEmail").value = _origProfile.email || "";
  document.getElementById("iPhone").value = _origProfile.phone || "";
  document.getElementById("iAddr").value = _origProfile.address || "";
  document.getElementById("iCity").value = _origProfile.city || "";
  toast("Changes cancelled.");
}

// ── Password ──────────────────────────────────────────────
function pwStrength(val) {
  const fill = document.getElementById("pwFill");
  const hint = document.getElementById("pwHint");
  const len = val.length;
  let pct = 0,
    label = "",
    color = "";
  if (len === 0) {
    pct = 0;
    label = "Enter a new password";
    color = "#ccc";
  } else if (len < 6) {
    pct = 25;
    label = "Too short";
    color = "#e74c3c";
  } else if (len < 10) {
    pct = 55;
    label = "Fair";
    color = "#f39c12";
  } else if (len < 14) {
    pct = 80;
    label = "Good";
    color = "#2ecc71";
  } else {
    pct = 100;
    label = "Strong";
    color = "#27ae60";
  }
  fill.style.width = pct + "%";
  fill.style.background = color;
  hint.textContent = label;
}

function updatePw() {
  const cur = document.getElementById("curPw").value;
  const nw = document.getElementById("newPw").value;
  const conf = document.getElementById("confPw").value;
  if (!cur || !nw || !conf) {
    toast("Please fill in all fields.");
    return;
  }
  if (nw !== conf) {
    toast("Passwords do not match.");
    return;
  }
  if (nw.length < 8) {
    toast("Password too short.");
    return;
  }
  toast("Password updated!");
}

// ── Toast ─────────────────────────────────────────────────
function toast(msg) {
  const wrap = document.getElementById("toastWrap");
  const t = document.createElement("div");
  t.className = "kb-toast";
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(() => t.classList.add("show"), 10);
  setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.remove(), 300);
  }, 3000);
}



loadProfile();