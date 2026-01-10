const API_KEY_STORAGE = "broadcast_api_key";
const ADMIN_TOKEN_STORAGE = "admin_jwt";
const ADMIN_USER_ID_STORAGE = "admin_user_id";

const currentKeyEl = document.getElementById("current-api-key");
const currentKeySaveBtn = document.getElementById("current-api-key-save");
const currentKeyClearBtn = document.getElementById("current-api-key-clear");
const newKeyNameEl = document.getElementById("new-key-name");
const newKeyScopeEl = document.getElementById("new-key-scope");
const newKeyExpireEl = document.getElementById("new-key-expire");
const newKeyOwnerEl = document.getElementById("new-key-owner");
const newKeyCreateBtn = document.getElementById("new-key-create");
const newKeyResultEl = document.getElementById("new-key-result");
const newKeyCopyBtn = document.getElementById("new-key-copy");
const newKeyUseBtn = document.getElementById("new-key-use");
const keysListEl = document.getElementById("keys-list");
const adminUserUsernameEl = document.getElementById("admin-user-username");
const adminUserPasswordEl = document.getElementById("admin-user-password");
const adminUserSaveBtn = document.getElementById("admin-user-save");
const adminUsersListEl = document.getElementById("admin-users-list");
const toastContainer = document.getElementById("toast-container");
const DISPLAY_TIME_ZONE = "Asia/Shanghai";

let lastCreatedKey = "";
let adminUsersCache = [];

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

function getStoredApiKey() {
  if (typeof localStorage === "undefined") {
    return "";
  }
  return (localStorage.getItem(API_KEY_STORAGE) || "").trim();
}

function setStoredApiKey(value) {
  if (typeof localStorage === "undefined") {
    return;
  }
  if (!value) {
    localStorage.removeItem(API_KEY_STORAGE);
  } else {
    localStorage.setItem(API_KEY_STORAGE, value);
  }
}

function getStoredAdminToken() {
  if (typeof localStorage === "undefined") {
    return "";
  }
  return (localStorage.getItem(ADMIN_TOKEN_STORAGE) || "").trim();
}

function getStoredAdminUserId() {
  if (typeof localStorage === "undefined") {
    return "";
  }
  return (localStorage.getItem(ADMIN_USER_ID_STORAGE) || "").trim();
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
  const apiKey = getStoredApiKey();
  if (apiKey) {
    headers.set("X-API-Key", apiKey);
  }
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
      throw new Error(data.detail || "管理员登录已失效，请重新登录。");
    }
    if (!data.token) {
      throw new Error("管理员令牌缺失，请重新登录。");
    }
    storeAdminSession(data);
    return data.token;
  } catch (error) {
    showToast(error.message || "管理员令牌缺失，请重新登录。", "error");
    return "";
  }
}

function formatDate(value) {
  if (!value) {
    return "未记录";
  }
  try {
    const text = String(value).trim();
    if (!text) {
      return "未记录";
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

function formatScope(value) {
  switch ((value || "").toLowerCase()) {
    case "manage":
      return "管理";
    case "send":
      return "发送";
    case "read":
      return "只读";
    default:
      return value || "未知";
  }
}

function renderStoredKey() {
  if (!currentKeyEl) {
    return;
  }
  currentKeyEl.value = getStoredApiKey();
}

function renderOwnerOptions(items) {
  if (!newKeyOwnerEl) {
    return;
  }
  newKeyOwnerEl.innerHTML = "";
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "当前管理员";
  newKeyOwnerEl.appendChild(defaultOption);
  items
    .filter((item) => !item.disabled_at)
    .forEach((item) => {
      const option = document.createElement("option");
      option.value = String(item.id);
      option.textContent = item.username;
      newKeyOwnerEl.appendChild(option);
    });
  const storedId = getStoredAdminUserId();
  if (storedId) {
    newKeyOwnerEl.value = storedId;
  }
}

function renderKeys(items) {
  if (!keysListEl) {
    return;
  }
  keysListEl.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "hint";
    empty.textContent = "暂无 Key，请先生成。";
    keysListEl.appendChild(empty);
    return;
  }
  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "key-item";

    const meta = document.createElement("div");
    meta.className = "key-meta";

    const title = document.createElement("div");
    title.className = "key-title";
    title.textContent = item.name || "未命名";
    meta.appendChild(title);

    const prefix = document.createElement("div");
    prefix.textContent = `前缀：${item.prefix}`;
    meta.appendChild(prefix);

    const scope = document.createElement("div");
    scope.textContent = `权限：${formatScope(item.scope)}`;
    meta.appendChild(scope);

    if (item.admin_username || item.admin_user_id) {
      const owner = document.createElement("div");
      owner.textContent = `所属管理员：${item.admin_username || item.admin_user_id}`;
      meta.appendChild(owner);
    }

    const created = document.createElement("div");
    created.textContent = `创建时间：${formatDate(item.created_at)}`;
    meta.appendChild(created);

    const expires = document.createElement("div");
    expires.textContent = item.expires_at
      ? `过期时间：${formatDate(item.expires_at)}`
      : "过期时间：不过期";
    meta.appendChild(expires);

    const lastUsed = document.createElement("div");
    lastUsed.textContent = `最近使用：${formatDate(item.last_used_at)}`;
    meta.appendChild(lastUsed);

    if (item.revoked_at) {
      const revoked = document.createElement("div");
      revoked.textContent = `已撤销：${formatDate(item.revoked_at)}`;
      meta.appendChild(revoked);
    }

    const actions = document.createElement("div");
    actions.className = "key-actions";
    if (!item.revoked_at) {
      const revokeBtn = document.createElement("button");
      revokeBtn.type = "button";
      revokeBtn.className = "ghost small";
      revokeBtn.textContent = "撤销";
      revokeBtn.addEventListener("click", () => revokeKey(item.id));
      actions.appendChild(revokeBtn);
    } else {
      const revokedTag = document.createElement("span");
      revokedTag.className = "tag tag-muted";
      revokedTag.textContent = "已撤销";
      actions.appendChild(revokedTag);
    }

    card.appendChild(meta);
    card.appendChild(actions);
    keysListEl.appendChild(card);
  });
}

async function loadKeys() {
  try {
    const adminUserId = getStoredAdminUserId();
    const url = adminUserId ? `api/keys?admin_user_id=${adminUserId}` : "api/keys";
    const response = await apiFetch(url);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "加载失败。");
    }
    renderKeys(data.keys || []);
  } catch (error) {
    showToast(error.message || "加载失败。", "error");
  }
}

async function createKey() {
  const name = (newKeyNameEl.value || "").trim();
  const scope = newKeyScopeEl ? newKeyScopeEl.value : "manage";
  const expiresRaw = newKeyExpireEl ? newKeyExpireEl.value.trim() : "";
  let expiresInDays = null;
  if (expiresRaw) {
    const parsed = Number.parseInt(expiresRaw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      showToast("有效期需为正整数。", "error");
      return;
    }
    expiresInDays = parsed;
  }
  let ownerId = null;
  if (newKeyOwnerEl && newKeyOwnerEl.value) {
    const parsedOwner = Number.parseInt(newKeyOwnerEl.value, 10);
    if (Number.isFinite(parsedOwner)) {
      ownerId = parsedOwner;
    }
  }
  const payload = {
    name,
    scope,
    expires_in_days: expiresInDays,
  };
  if (ownerId !== null) {
    payload.admin_user_id = ownerId;
  }
  try {
    const response = await apiFetch("api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "生成失败。");
    }
    lastCreatedKey = data.api_key;
    newKeyResultEl.textContent = data.api_key;
    newKeyNameEl.value = "";
    if (newKeyExpireEl) {
      newKeyExpireEl.value = "";
    }
    if (newKeyScopeEl) {
      newKeyScopeEl.value = data.scope || "manage";
    }
    showToast("Key 已生成。", "success");
    loadKeys();
  } catch (error) {
    showToast(error.message || "生成失败。", "error");
  }
}

async function revokeKey(keyId) {
  try {
    const response = await apiFetch(`api/keys/${keyId}/revoke`, {
      method: "POST",
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "撤销失败。");
    }
    showToast("Key 已撤销。", "success");
    loadKeys();
  } catch (error) {
    showToast(error.message || "撤销失败。", "error");
  }
}

function renderAdminUsers(items) {
  if (!adminUsersListEl) {
    return;
  }
  adminUsersListEl.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "hint";
    empty.textContent = "暂无用户。";
    adminUsersListEl.appendChild(empty);
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
    created.textContent = `创建时间：${formatDate(item.created_at)}`;
    meta.appendChild(created);

    if (item.disabled_at) {
      const disabled = document.createElement("div");
      disabled.textContent = `已停用：${formatDate(item.disabled_at)}`;
      meta.appendChild(disabled);
    }

    const actions = document.createElement("div");
    actions.className = "key-actions";
    if (item.disabled_at) {
      const enableBtn = document.createElement("button");
      enableBtn.type = "button";
      enableBtn.className = "secondary small";
      enableBtn.textContent = "启用";
      enableBtn.addEventListener("click", () => enableAdminUser(item.id));
      actions.appendChild(enableBtn);
    } else {
      const disableBtn = document.createElement("button");
      disableBtn.type = "button";
      disableBtn.className = "ghost small";
      disableBtn.textContent = "停用";
      disableBtn.addEventListener("click", () => disableAdminUser(item.id));
      actions.appendChild(disableBtn);
    }

    card.appendChild(meta);
    card.appendChild(actions);
    adminUsersListEl.appendChild(card);
  });
}

async function loadAdminUsers() {
  try {
    const response = await apiFetch("api/admin/users");
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "加载失败。");
    }
    adminUsersCache = data.users || [];
    renderAdminUsers(adminUsersCache);
    renderOwnerOptions(adminUsersCache);
  } catch (error) {
    showToast(error.message || "加载失败。", "error");
  }
}

async function saveAdminUser() {
  const username = (adminUserUsernameEl.value || "").trim();
  const password = (adminUserPasswordEl.value || "").trim();
  if (!username || !password) {
    showToast("请输入用户名和密码。", "error");
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
      throw new Error(data.detail || "保存失败。");
    }
    adminUserUsernameEl.value = "";
    adminUserPasswordEl.value = "";
    showToast("用户已保存。", "success");
    loadAdminUsers();
  } catch (error) {
    showToast(error.message || "保存失败。", "error");
  }
}

async function disableAdminUser(userId) {
  try {
    const response = await apiFetch(`api/admin/users/${userId}/disable`, {
      method: "POST",
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "停用失败。");
    }
    showToast("用户已停用。", "success");
    loadAdminUsers();
  } catch (error) {
    showToast(error.message || "停用失败。", "error");
  }
}

async function enableAdminUser(userId) {
  try {
    const response = await apiFetch(`api/admin/users/${userId}/enable`, {
      method: "POST",
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "启用失败。");
    }
    showToast("用户已启用。", "success");
    loadAdminUsers();
  } catch (error) {
    showToast(error.message || "启用失败。", "error");
  }
}

newKeyCreateBtn.addEventListener("click", createKey);
if (adminUserSaveBtn) {
  adminUserSaveBtn.addEventListener("click", saveAdminUser);
}
newKeyCopyBtn.addEventListener("click", async () => {
  if (!lastCreatedKey) {
    showToast("暂无新 Key。", "error");
    return;
  }
  try {
    await navigator.clipboard.writeText(lastCreatedKey);
    showToast("已复制。", "success");
  } catch (error) {
    showToast("复制失败。", "error");
  }
});

newKeyUseBtn.addEventListener("click", () => {
  if (!lastCreatedKey) {
    showToast("暂无新 Key。", "error");
    return;
  }
  setStoredApiKey(lastCreatedKey);
  renderStoredKey();
  showToast("已设为当前 Key。", "success");
});

currentKeySaveBtn.addEventListener("click", () => {
  const value = (currentKeyEl.value || "").trim();
  if (!value) {
    showToast("请输入 Key。", "error");
    return;
  }
  setStoredApiKey(value);
  showToast("已保存。", "success");
});

currentKeyClearBtn.addEventListener("click", () => {
  setStoredApiKey("");
  renderStoredKey();
  showToast("已清除。", "success");
});

async function initAdmin() {
  const token = await ensureAdminToken();
  if (!token) {
    return;
  }
  loadKeys();
  loadAdminUsers();
}

renderStoredKey();
initAdmin();
