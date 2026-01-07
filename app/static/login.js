const loginForm = document.getElementById("login-form");
const usernameEl = document.getElementById("login-username");
const passwordEl = document.getElementById("login-password");
const toastContainer = document.getElementById("toast-container");
const ADMIN_TOKEN_STORAGE = "admin_jwt";
const ADMIN_USER_ID_STORAGE = "admin_user_id";

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

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = usernameEl.value.trim();
  const password = passwordEl.value.trim();
  if (!username || !password) {
    showToast("请输入账号和密码。", "error");
    return;
  }
  try {
    const response = await fetch("api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "登录失败。");
    }
    if (!data.token) {
      throw new Error("管理员令牌缺失，请重新登录。");
    }
    storeAdminSession(data);
    window.location.href = "keys";
  } catch (error) {
    showToast(error.message || "登录失败。", "error");
  }
});
