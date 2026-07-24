// ============================================================
//  users.js  —  KapeBara Admin Panel
// ============================================================

let currentFilterUser  = 'all';
let allUsersCache  = [];
let editingUserId  = null;
let deletingUserId = null;

// ── Avatar colour palette (bg / text) ─────────────────────
const AVATAR_COLORS = [
  ['#e8f0fe', '#1a56bd'],
  ['#fef3e2', '#92520a'],
  ['#e8f5ee', '#1a6b3a'],
  ['#fbe9f7', '#8b2279'],
  ['#f0f0ff', '#4338ca'],
  ['#fdf2e9', '#9b440a'],
  ['#e9f5ff', '#1654a0'],
  ['#f5f5e8', '#5a6a0a'],
];

function avatarColor(name) {
    let hash = 0;
    for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % AVATAR_COLORS.length;
    return AVATAR_COLORS[hash];
}

function initials(name) {
    if (!name || name.startsWith('Guest')) return 'G';
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

// ── Load & filter ─────────────────────────────────────────
async function loadUsers(filter = 'all') {
    currentFilterUser = filter;

    document.querySelectorAll('.um-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });

    const res  = await fetch(`api/users/get_users.php?type=${filter}`);
    const json = await res.json();
    if (json.status !== 'success') return;

    allUsersCache = json.data;
    filterAndRender();
}

function filterAndRender() {
    const q = document.getElementById('user-search').value.toLowerCase();
    const list = allUsersCache.filter(u =>
        u.name.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q))
    );
    renderUsersTable(list);
}

// ── Render table ──────────────────────────────────────────
function renderUsersTable(users) {
    document.getElementById('user-count').textContent =
        `${users.length} user${users.length !== 1 ? 's' : ''}`;

    const tbody = document.getElementById('users-table-body');

    if (!users.length) {
        tbody.innerHTML = `<tr><td colspan="7"><div class="um-empty">No users found.</div></td></tr>`;
        return;
    }

    tbody.innerHTML = users.map(u => {
        const isRegistered = u.source === 'registered';

        // Avatar
        const [bg, fg] = avatarColor(u.name);
        const ini = initials(u.name);
        const avatar = `<span class="um-avatar" style="background:${bg};color:${fg}">${ini}</span>`;

        // Badge
        const badge = isRegistered
            ? `<span class="badge-registered">Registered</span>`
            : `<span class="badge-guest">Guest</span>`;

        // Actions
        const actions = isRegistered
            ? `<button class="um-btn-edit" onclick="openEditUser(${u.id})">
                   <i class="fa-solid fa-pen-to-square"></i> Edit
               </button>
               <button class="um-btn-del" onclick="openDeleteUser(${u.id}, '${escHtml(u.name)}', '${escHtml(u.email)}')">
                   <i class="fa-solid fa-trash"></i>
               </button>`
            : `<span class="um-view-only">View orders only</span>`;

        // Joined date (strip time)
        const joined = u.created_at ? u.created_at.split(' ')[0] : '—';

        return `<tr data-user-id="${u.id || ''}">
            <td>
              <div class="um-name-cell">
                ${avatar}
                <span class="um-name-text">${escHtml(u.name)}</span>
              </div>
            </td>
            <td class="um-muted">${escHtml(u.email  || '—')}</td>
            <td class="um-muted">${escHtml(u.phone  || '—')}</td>
            <td>${escHtml(u.city || u.address || '—')}</td>
            <td class="um-muted">${joined}</td>
            <td>${badge}</td>
            <td><div class="um-actions-cell">${actions}</div></td>
        </tr>`;
    }).join('');
}

// ── Edit ──────────────────────────────────────────────────
function openEditUser(id) {
    editingUserId = id;
    const u = allUsersCache.find(x => x.id == id);
    if (!u) return;

    document.getElementById('edit-user-name').value    = u.name    || '';
    document.getElementById('edit-user-email').value   = u.email   || '';
    document.getElementById('edit-user-phone').value   = u.phone   || '';
    document.getElementById('edit-user-address').value = u.address || '';
    document.getElementById('edit-user-city').value    = u.city    || '';

    document.getElementById('edit-user-modal').style.display = 'flex';
}

async function saveEditUser() {
    const payload = {
        id:      editingUserId,
        name:    document.getElementById('edit-user-name').value,
        email:   document.getElementById('edit-user-email').value,
        phone:   document.getElementById('edit-user-phone').value,
        address: document.getElementById('edit-user-address').value,
        city:    document.getElementById('edit-user-city').value,
    };

    const res  = await fetch('api/users/update_user.php', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
    });
    const json = await res.json();

    if (json.status === 'success') {
        document.getElementById('edit-user-modal').style.display = 'none';
        loadUsers(currentFilterUser);
        showToast('User updated successfully!');
    } else {
        alert('Error: ' + json.message);
    }
}

// ── Delete ────────────────────────────────────────────────
function openDeleteUser(id, name, email) {
    deletingUserId = id;
    document.getElementById('delete-user-msg').textContent =
        `You are about to delete ${name} (${email}). This cannot be undone.`;
    document.getElementById('delete-user-modal').style.display = 'flex';
}

async function confirmDeleteUser() {
    const res  = await fetch('api/users/delete_users.php', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: deletingUserId }),
    });
    const json = await res.json();

    if (json.status === 'success') {
        document.getElementById('delete-user-modal').style.display = 'none';
        loadUsers(currentFilterUser);
        showToast('User deleted.');
    } else {
        alert('Error: ' + json.message);
    }
}

// ── Close modals on backdrop click ────────────────────────
['edit-user-modal', 'delete-user-modal'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', function(e) {
        if (e.target === this) this.style.display = 'none';
    });
});

// ── Utility ───────────────────────────────────────────────
function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => loadUsers('all'));