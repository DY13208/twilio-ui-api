const ADMIN_TOKEN_STORAGE = "admin_jwt";
const ADMIN_USER_ID_STORAGE = "admin_user_id";

const usersListEl = document.getElementById("users-list");
const userUsernameEl = document.getElementById("user-username");
const userPasswordEl = document.getElementById("user-password");
const userSaveBtn = document.getElementById("user-save");
const userKeyNameEl = document.getElementById("user-key-name");
const userKeyScopeEl = document.getElementById("user-key-scope");
const userKeyExpireEl = document.getElementById("user-key-expire");
const userKeyCreateBtn = document.getElementById("user-key-create");
const userKeyResultEl = document.getElementById("user-key-result");
const userKeysListEl = document.getElementById("user-keys-list");
const selectedUserHintEl = document.getElementById("selected-user-hint");
const toastContainer = document.getElementById("toast-container");
const DISPLAY_TIME_ZONE = "Asia/Shanghai";

let usersCache = [];
let selectedUserId = null;

function showToast(message, type = "info") {
  if (!toastContainer) {
    return;
  }
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.add("show");
  });
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 220);
  }, 2600);
}

function getStoredAdminToken() {
  if (typeof localStorage === "undefined") {
    return "";
  }
  return (localStorage.getItem(ADMIN_TOKEN_STORAGE) || "").trim();
}

function storeAdminSession(data) {
  if (typeof localStorage === "undefined") {
    return;
  }
  if (data && data.token) {
    localStorage.setItem(ADMIN_TOKEN_STORAGE, data.token);
  }
  if (data && Number.isFinite(data.admin_user_id)) {
    localStorage.setItem(ADMIN_USER_ID_STORAGE, String(data.admin_user_id));
  }
}

async function apiFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  const adminToken = getStoredAdminToken();
  if (adminToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${adminToken}`);
  }
  return fetch(url, { credentials: "same-origin", ...options, headers });
}

async function ensureAdminToken() {
  const existing = getStoredAdminToken();
  if (existing) {
    return existing;
  }
  try {
    const response = await fetch("api/admin/token", { credentials: "same-origin" });
    let data = {};
    try {
      data = await response.json();
    } catch (error) {
      data = {};
    }
    if (!response.ok) {
      throw new Error(data.detail || "Admin session expired. Please log in again.");
    }
    if (!data.token) {
      throw new Error("Admin token is missing. Please log in again.");
    }
    storeAdminSession(data);
    return data.token;
  } catch (error) {
    showToast(error.message || "Admin token is missing. Please log in again.", "error");
    return "";
  }
}

function formatDate(value) {
  if (!value) {
    return "-";
  }
  try {
    const text = String(value).trim();
    if (!text) {
      return "-";
    }
    const hasTimezone = /[zZ]|[+\-]\d{2}:?\d{2}$/.test(text);
    const normalized = hasTimezone ? text : `${text}Z`;
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: DISPLAY_TIME_ZONE,
    });
  } catch (error) {
    return value;
  }
}

function setSelectedUser(user) {
  selectedUserId = user ? user.id : null;
  if (selectedUserHintEl) {
    selectedUserHintEl.textContent = user
      ? `Selected user: ${user.username}`
      : "Select a user to manage keys.";
  }
  const disabled = !selectedUserId;
  if (userKeyNameEl) {
    userKeyNameEl.disabled = disabled;
  }
  if (userKeyScopeEl) {
    userKeyScopeEl.disabled = disabled;
  }
  if (userKeyExpireEl) {
    userKeyExpireEl.disabled = disabled;
  }
  if (userKeyCreateBtn) {
    userKeyCreateBtn.disabled = disabled;
  }
}

function renderUsers(items) {
  if (!usersListEl) {
    return;
  }
  usersListEl.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "hint";
    empty.textContent = "No users yet.";
    usersListEl.appendChild(empty);
    return;
  }
  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "user-item";

    const meta = document.createElement("div");
    meta.className = "key-meta";

    const title = document.createElement("div");
    title.className = "key-title";
    title.textContent = item.username;
    meta.appendChild(title);

    const created = document.createElement("div");
    created.textContent = `Created: ${formatDate(item.created_at)}`;
    meta.appendChild(created);

    if (item.disabled_at) {
      const disabled = document.createElement("div");
      disabled.textContent = `Disabled: ${formatDate(item.disabled_at)}`;
      meta.appendChild(disabled);
    }

    const actions = document.createElement("div");
    actions.className = "key-actions";

    const selectBtn = document.createElement("button");
    selectBtn.type = "button";
    selectBtn.className = "secondary small";
    selectBtn.textContent = "Select";
    selectBtn.addEventListener("click", () => selectUser(item.id));
    actions.appendChild(selectBtn);

    if (item.disabled_at) {
      const enableBtn = document.createElement("button");
      enableBtn.type = "button";
      enableBtn.className = "ghost small";
      enableBtn.textContent = "Enable";
      enableBtn.addEventListener("click", () => enableUser(item.id));
      actions.appendChild(enableBtn);
    } else {
      const disableBtn = document.createElement("button");
      disableBtn.type = "button";
      disableBtn.className = "ghost small";
      disableBtn.textContent = "Disable";
      disableBtn.addEventListener("click", () => disableUser(item.id));
      actions.appendChild(disableBtn);
    }

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "ghost small";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => deleteUser(item.id));
    actions.appendChild(deleteBtn);

    card.appendChild(meta);
    card.appendChild(actions);
    usersListEl.appendChild(card);
  });
}

function renderUserKeys(items) {
  if (!userKeysListEl) {
    return;
  }
  userKeysListEl.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "hint";
    empty.textContent = "No keys for this user.";
    userKeysListEl.appendChild(empty);
    return;
  }
  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "key-item";

    const meta = document.createElement("div");
    meta.className = "key-meta";

    const title = document.createElement("div");
    title.className = "key-title";
    title.textContent = item.name || "(unnamed)";
    meta.appendChild(title);

    const prefix = document.createElement("div");
    prefix.textContent = `Prefix: ${item.prefix}`;
    meta.appendChild(prefix);

    const scopeRow = document.createElement("div");
    scopeRow.textContent = `Scope: ${item.scope || "manage"}`;
    meta.appendChild(scopeRow);

    const created = document.createElement("div");
    created.textContent = `Created: ${formatDate(item.created_at)}`;
    meta.appendChild(created);

    const expires = document.createElement("div");
    expires.textContent = item.expires_at
      ? `Expires: ${formatDate(item.expires_at)}`
      : "Expires: never";
    meta.appendChild(expires);

    const lastUsed = document.createElement("div");
    lastUsed.textContent = `Last used: ${formatDate(item.last_used_at)}`;
    meta.appendChild(lastUsed);

    if (item.revoked_at) {
      const revoked = document.createElement("div");
      revoked.textContent = `Revoked: ${formatDate(item.revoked_at)}`;
      meta.appendChild(revoked);
    }

    const actions = document.createElement("div");
    actions.className = "key-actions";

    if (!item.revoked_at) {
      const scopeSelect = document.createElement("select");
      ["manage", "send", "read"].forEach((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        scopeSelect.appendChild(option);
      });
      scopeSelect.value = item.scope || "manage";
      actions.appendChild(scopeSelect);

      const updateBtn = document.createElement("button");
      updateBtn.type = "button";
      updateBtn.className = "secondary small";
      updateBtn.textContent = "Update scope";
      updateBtn.addEventListener("click", () => updateKeyScope(item.id, scopeSelect.value));
      actions.appendChild(updateBtn);

      const revokeBtn = document.createElement("button");
      revokeBtn.type = "button";
      revokeBtn.className = "ghost small";
      revokeBtn.textContent = "Revoke";
      revokeBtn.addEventListener("click", () => revokeKey(item.id));
      actions.appendChild(revokeBtn);
    } else {
      const revokedTag = document.createElement("span");
      revokedTag.className = "tag tag-muted";
      revokedTag.textContent = "Revoked";
      actions.appendChild(revokedTag);
    }

    card.appendChild(meta);
    card.appendChild(actions);
    userKeysListEl.appendChild(card);
  });
}

async function loadUsers() {
  try {
    const response = await apiFetch("api/admin/users");
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Failed to load users.");
    }
    usersCache = data.users || [];
    renderUsers(usersCache);
    if (selectedUserId) {
      const selected = usersCache.find((user) => user.id === selectedUserId);
      if (selected) {
        setSelectedUser(selected);
      }
    }
  } catch (error) {
    showToast(error.message || "Failed to load users.", "error");
  }
}

async function loadUserKeys() {
  if (!selectedUserId) {
    renderUserKeys([]);
    return;
  }
  try {
    const response = await apiFetch(`api/keys?admin_user_id=${selectedUserId}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Failed to load keys.");
    }
    renderUserKeys(data.keys || []);
  } catch (error) {
    showToast(error.message || "Failed to load keys.", "error");
  }
}

function selectUser(userId) {
  const user = usersCache.find((item) => item.id === userId);
  if (!user) {
    return;
  }
  setSelectedUser(user);
  loadUserKeys();
}

async function saveUser() {
  const username = (userUsernameEl.value || "").trim();
  const password = (userPasswordEl.value || "").trim();
  if (!username || !password) {
    showToast("Username and password are required.", "error");
    return;
  }
  try {
    const response = await apiFetch("api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Save failed.");
    }
    userUsernameEl.value = "";
    userPasswordEl.value = "";
    showToast("User saved.", "success");
    await loadUsers();
    if (data && data.id) {
      selectUser(data.id);
    }
  } catch (error) {
    showToast(error.message || "Save failed.", "error");
  }
}

async function disableUser(userId) {
  try {
    const response = await apiFetch(`api/admin/users/${userId}/disable`, {
      method: "POST",
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Disable failed.");
    }
    showToast("User disabled.", "success");
    loadUsers();
  } catch (error) {
    showToast(error.message || "Disable failed.", "error");
  }
}

async function enableUser(userId) {
  try {
    const response = await apiFetch(`api/admin/users/${userId}/enable`, {
      method: "POST",
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Enable failed.");
    }
    showToast("User enabled.", "success");
    loadUsers();
  } catch (error) {
    showToast(error.message || "Enable failed.", "error");
  }
}

async function deleteUser(userId) {
  if (!confirm("Delete this user and revoke their keys?")) {
    return;
  }
  try {
    const response = await apiFetch(`api/admin/users/${userId}`, {
      method: "DELETE",
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Delete failed.");
    }
    showToast("User deleted.", "success");
    if (selectedUserId === userId) {
      selectedUserId = null;
      setSelectedUser(null);
      renderUserKeys([]);
    }
    loadUsers();
  } catch (error) {
    showToast(error.message || "Delete failed.", "error");
  }
}

async function createUserKey() {
  if (!selectedUserId) {
    showToast("Select a user first.", "error");
    return;
  }
  const name = (userKeyNameEl.value || "").trim();
  const scope = userKeyScopeEl ? userKeyScopeEl.value : "manage";
  const expiresRaw = userKeyExpireEl ? userKeyExpireEl.value.trim() : "";
  let expiresInDays = null;
  if (expiresRaw) {
    const parsed = Number.parseInt(expiresRaw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      showToast("Expires in days must be a positive number.", "error");
      return;
    }
    expiresInDays = parsed;
  }
  try {
    const response = await apiFetch("api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        scope,
        expires_in_days: expiresInDays,
        admin_user_id: selectedUserId,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Create key failed.");
    }
    userKeyResultEl.textContent = data.api_key;
    userKeyNameEl.value = "";
    if (userKeyExpireEl) {
      userKeyExpireEl.value = "";
    }
    showToast("Key created.", "success");
    loadUserKeys();
  } catch (error) {
    showToast(error.message || "Create key failed.", "error");
  }
}

async function updateKeyScope(keyId, scope) {
  try {
    const response = await apiFetch(`api/keys/${keyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Update failed.");
    }
    showToast("Scope updated.", "success");
    loadUserKeys();
  } catch (error) {
    showToast(error.message || "Update failed.", "error");
  }
}

async function revokeKey(keyId) {
  try {
    const response = await apiFetch(`api/keys/${keyId}/revoke`, {
      method: "POST",
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Revoke failed.");
    }
    showToast("Key revoked.", "success");
    loadUserKeys();
  } catch (error) {
    showToast(error.message || "Revoke failed.", "error");
  }
}

async function init() {
  const token = await ensureAdminToken();
  if (!token) {
    return;
  }
  setSelectedUser(null);
  loadUsers();
}

if (userSaveBtn) {
  userSaveBtn.addEventListener("click", saveUser);
}

if (userKeyCreateBtn) {
  userKeyCreateBtn.addEventListener("click", createUserKey);
}

init();
