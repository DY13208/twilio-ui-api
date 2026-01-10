const ADMIN_TOKEN_STORAGE = "admin_jwt";

const sendgridLogEnabledEl = document.getElementById("sendgrid-log-enabled");
const sendgridLogMaxLinesEl = document.getElementById("sendgrid-log-max-lines");
const sendgridLogAutoCloseEl = document.getElementById("sendgrid-log-auto-close");
const sendgridLogSaveBtn = document.getElementById("sendgrid-log-save");
const sendgridLogRefreshBtn = document.getElementById("sendgrid-log-refresh");
const sendgridLogPathEl = document.getElementById("sendgrid-log-path");
const toastContainer = document.getElementById("toast-container");

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
}

function parsePositiveInt(value) {
  const trimmed = (value || "").trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return NaN;
  }
  return parsed;
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
      throw new Error("Admin token missing. Please log in again.");
    }
    storeAdminSession(data);
    return data.token;
  } catch (error) {
    showToast(error.message || "Admin token missing. Please log in again.", "error");
    return "";
  }
}

function renderSendgridLogSettings(data) {
  if (!sendgridLogEnabledEl || !data) {
    return;
  }
  sendgridLogEnabledEl.checked = Boolean(data.enabled);
  if (sendgridLogAutoCloseEl) {
    sendgridLogAutoCloseEl.checked = Boolean(data.auto_close);
  }
  if (sendgridLogMaxLinesEl) {
    sendgridLogMaxLinesEl.value = data.max_lines ? String(data.max_lines) : "";
  }
  if (sendgridLogPathEl) {
    sendgridLogPathEl.textContent = data.path
      ? `Log path: ${data.path}`
      : "Log path: not configured.";
  }
}

async function loadSendgridLogSettings() {
  if (!sendgridLogEnabledEl) {
    return;
  }
  try {
    const response = await apiFetch("api/admin/settings/sendgrid-webhook-log");
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Failed to load webhook log settings.");
    }
    renderSendgridLogSettings(data);
  } catch (error) {
    showToast(error.message || "Failed to load webhook log settings.", "error");
  }
}

async function saveSendgridLogSettings() {
  if (!sendgridLogEnabledEl) {
    return;
  }
  const maxLines = sendgridLogMaxLinesEl ? parsePositiveInt(sendgridLogMaxLinesEl.value) : null;
  if (Number.isNaN(maxLines)) {
    showToast("Max lines must be a positive integer.", "error");
    return;
  }
  const payload = {
    enabled: sendgridLogEnabledEl.checked,
    auto_close: sendgridLogAutoCloseEl ? sendgridLogAutoCloseEl.checked : false,
    max_lines: maxLines,
  };
  try {
    const response = await apiFetch("api/admin/settings/sendgrid-webhook-log", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Failed to save webhook log settings.");
    }
    renderSendgridLogSettings(data);
    showToast("Webhook log settings saved.", "success");
  } catch (error) {
    showToast(error.message || "Failed to save webhook log settings.", "error");
  }
}

async function initSettings() {
  if (!sendgridLogEnabledEl) {
    return;
  }
  const token = await ensureAdminToken();
  if (!token) {
    return;
  }
  loadSendgridLogSettings();
}

if (sendgridLogSaveBtn) {
  sendgridLogSaveBtn.addEventListener("click", saveSendgridLogSettings);
}
if (sendgridLogRefreshBtn) {
  sendgridLogRefreshBtn.addEventListener("click", loadSendgridLogSettings);
}

initSettings();
