const channelFilterEl = document.getElementById("channel-filter");
const markReadBtn = document.getElementById("mark-read-btn");
const chatStatsEl = document.getElementById("chat-stats");
const totalCountEl = document.getElementById("total-count");
const unreadCountEl = document.getElementById("unread-count");
const loadMoreBtn = document.getElementById("load-more-btn");
const toastContainer = document.getElementById("toast-container");
const selectedUserTitleEl = document.getElementById("selected-user-title");
const selectedUserMetaEl = document.getElementById("selected-user-meta");

// 用户列表相关元素
const userChannelFilterEl = document.getElementById("user-channel-filter");
const userFromEl = document.getElementById("user-from");
const userToEl = document.getElementById("user-to");
const userRefreshBtn = document.getElementById("user-refresh");
const userTbodyEl = document.getElementById("user-tbody");
const userTotalEl = document.getElementById("user-total");
const userPrevBtn = document.getElementById("user-prev");
const userNextBtn = document.getElementById("user-next");

const chatMessagesTbodyEl = document.getElementById("chat-messages-tbody");
const messageModalEl = document.getElementById("message-modal");
const modalContentEl = document.getElementById("modal-content");
const modalCloseBtn = document.getElementById("modal-close");

const API_KEY_STORAGE = "broadcast_api_key";
let currentUserAddress = "";
let currentChannel = "";
let currentOffset = 0;
let currentLimit = 50;
let hasMore = false;
let selectedMessageIds = new Set();

let userOffset = 0;
let userLimit = 20;
let userHasMore = false;
let selectedUser = null;

function getStoredApiKey() {
  if (typeof localStorage === "undefined") {
    return "";
  }
  return (localStorage.getItem(API_KEY_STORAGE) || "").trim();
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

async function apiFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  const apiKey = getStoredApiKey();
  if (apiKey) {
    headers.set("X-API-Key", apiKey);
  }
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    showToast("API Key 无效或未设置", "error");
  }
  return response;
}

function formatDateTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatChannel(channel) {
  const normalized = (channel || "").toLowerCase();
  if (normalized === "email") {
    return "Email";
  }
  if (normalized === "whatsapp") {
    return "WhatsApp";
  }
  return channel || "";
}

function formatChannels(channels) {
  if (!Array.isArray(channels) || channels.length === 0) {
    return "-";
  }
  return channels.map(formatChannel).join(", ");
}

function formatStatus(status) {
  const statusMap = {
    queued: "排队中",
    accepted: "已接受",
    delivered: "已送达",
    read: "已读",
    failed: "失败",
  };
  return statusMap[status] || status;
}

function getStatusClass(status) {
  return (status || "").toLowerCase();
}

function updateSelectedUser(user) {
  if (!selectedUserTitleEl || !selectedUserMetaEl) {
    return;
  }
  if (!user) {
    selectedUserTitleEl.textContent = "请选择上方用户";
    selectedUserMetaEl.textContent = "";
    return;
  }
  selectedUserTitleEl.textContent = user.user_address || "未知用户";
  const metaParts = [];
  const channels = formatChannels(user.channels);
  if (channels && channels !== "-") {
    metaParts.push(`渠道: ${channels}`);
  }
  metaParts.push(`消息: ${user.total_messages || 0}`);
  metaParts.push(`未读: ${user.unread_count || 0}`);
  if (user.last_message_at) {
    metaParts.push(`最近: ${formatDateTime(user.last_message_at)}`);
  }
  selectedUserMetaEl.textContent = metaParts.join(" · ");
}

function showMessageDetail(message) {
  modalContentEl.innerHTML = "";

  const sections = [
    {
      title: "基本信息",
      content: [
        { label: "消息ID", value: message.id },
        { label: "批次ID", value: message.batch_id },
        { label: "渠道", value: formatChannel(message.channel) },
        { label: "状态", value: formatStatus(message.status) },
      ],
    },
    {
      title: "地址信息",
      content: [
        { label: "发件人", value: message.from_address },
        { label: "收件人", value: message.to_address },
      ],
    },
  ];

  if (message.subject) {
    sections.push({ title: "主题", content: [{ label: "", value: message.subject }] });
  }

  if (message.body) {
    sections.push({ title: "内容", content: [{ label: "", value: message.body }] });
  }

  if (message.provider_message_id) {
    sections.push({
      title: "提供商信息",
      content: [{ label: "Provider Message ID", value: message.provider_message_id }],
    });
  }

  if (message.error) {
    sections.push({ title: "错误信息", content: [{ label: "错误", value: message.error }] });
  }

  sections.push({
    title: "时间信息",
    content: [
      { label: "创建时间", value: formatDateTime(message.created_at) },
      { label: "更新时间", value: formatDateTime(message.updated_at) },
      { label: "已读时间", value: message.read_at ? formatDateTime(message.read_at) : "未读" },
    ],
  });

  sections.forEach((section) => {
    const sectionDiv = document.createElement("div");
    sectionDiv.className = "modal-section";

    const titleDiv = document.createElement("div");
    titleDiv.className = "modal-section-title";
    titleDiv.textContent = section.title;
    sectionDiv.appendChild(titleDiv);

    const contentDiv = document.createElement("div");
    contentDiv.className = "modal-section-content";

    section.content.forEach((item) => {
      const itemDiv = document.createElement("div");
      itemDiv.style.marginBottom = "0.5rem";
      if (item.label) {
        itemDiv.innerHTML = `<strong>${item.label}:</strong> ${item.value}`;
      } else {
        itemDiv.textContent = item.value;
      }
      contentDiv.appendChild(itemDiv);
    });

    sectionDiv.appendChild(contentDiv);
    modalContentEl.appendChild(sectionDiv);
  });

  messageModalEl.style.display = "flex";
}

function createMessageRow(message, options = {}) {
  const { withCheckbox = true, showAsSent = false } = options;
  const isUnread = !message.read_at;
  const tr = document.createElement("tr");
  tr.className = isUnread ? "unread" : "";
  tr.dataset.messageId = message.id;

  const getDisplayText = (text, maxLength = 50) => {
    if (!text) return "";
    if (text.length > maxLength) {
      return text.substring(0, maxLength) + "...";
    }
    return text;
  };

  let addressText = "";
  if (showAsSent) {
    addressText = message.to_address || "";
  } else if (message.from_address === currentUserAddress) {
    addressText = `发送至: ${message.to_address || ""}`;
  } else {
    addressText = `来自: ${message.from_address || ""}`;
  }

  let contentText = "";
  if (message.subject) {
    contentText = message.subject;
  } else if (message.body) {
    if (message.body.startsWith("template:")) {
      contentText = message.body;
    } else {
      contentText = message.body;
    }
  }

  if (withCheckbox) {
    const checkboxTd = document.createElement("td");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "message-checkbox";
    checkbox.dataset.messageId = message.id;
    if (selectedMessageIds.has(message.id)) {
      checkbox.checked = true;
    }
    checkbox.addEventListener("change", handleCheckboxChange);
    checkbox.addEventListener("click", (e) => e.stopPropagation());
    checkboxTd.appendChild(checkbox);
    tr.appendChild(checkboxTd);
  }

  const channelTd = document.createElement("td");
  const channelSpan = document.createElement("span");
  channelSpan.className = "message-channel";
  channelSpan.textContent = formatChannel(message.channel);
  channelTd.appendChild(channelSpan);
  tr.appendChild(channelTd);

  const statusTd = document.createElement("td");
  const statusSpan = document.createElement("span");
  statusSpan.className = `message-status ${getStatusClass(message.status)}`;
  statusSpan.textContent = formatStatus(message.status);
  statusTd.appendChild(statusSpan);
  tr.appendChild(statusTd);

  const addressTd = document.createElement("td");
  addressTd.className = "message-cell";
  addressTd.title = addressText;
  addressTd.textContent = getDisplayText(addressText, 30);
  tr.appendChild(addressTd);

  const contentTd = document.createElement("td");
  contentTd.className = "message-cell";
  contentTd.title = contentText;
  contentTd.textContent = getDisplayText(contentText, 40);
  tr.appendChild(contentTd);

  const timeTd = document.createElement("td");
  timeTd.textContent = formatDateTime(message.created_at);
  tr.appendChild(timeTd);

  tr.addEventListener("click", (e) => {
    if (e.target.type !== "checkbox") {
      showMessageDetail(message);
    }
  });

  return tr;
}

function createUserRow(user) {
  const tr = document.createElement("tr");
  tr.className = "user-row";
  tr.dataset.userAddress = user.user_address || "";

  const addressTd = document.createElement("td");
  addressTd.className = "message-cell";
  addressTd.title = user.user_address || "";
  addressTd.textContent = user.user_address || "-";
  tr.appendChild(addressTd);

  const channelsText = formatChannels(user.channels);
  const channelsTd = document.createElement("td");
  channelsTd.className = "message-cell";
  channelsTd.title = channelsText;
  channelsTd.textContent = channelsText;
  tr.appendChild(channelsTd);

  const totalTd = document.createElement("td");
  totalTd.textContent = user.total_messages || 0;
  tr.appendChild(totalTd);

  const unreadTd = document.createElement("td");
  unreadTd.textContent = user.unread_count || 0;
  tr.appendChild(unreadTd);

  const lastTd = document.createElement("td");
  lastTd.textContent = user.last_message_at ? formatDateTime(user.last_message_at) : "-";
  tr.appendChild(lastTd);

  if (currentUserAddress && user.user_address === currentUserAddress) {
    tr.classList.add("active");
    selectedUser = user;
    updateSelectedUser(user);
  }

  tr.addEventListener("click", () => {
    setActiveUser(user, tr);
  });

  return tr;
}

function setActiveUser(user, row) {
  if (!user || !user.user_address) {
    return;
  }
  selectedUser = user;
  currentUserAddress = user.user_address;
  updateSelectedUser(user);

  const activeRow = document.querySelector("tr.user-row.active");
  if (activeRow) {
    activeRow.classList.remove("active");
  }
  if (row) {
    row.classList.add("active");
  }

  loadChatHistory(true);
}

function handleCheckboxChange(event) {
  const messageId = parseInt(event.target.dataset.messageId);
  if (event.target.checked) {
    selectedMessageIds.add(messageId);
  } else {
    selectedMessageIds.delete(messageId);
  }
  updateMarkReadButton();
}

function updateMarkReadButton() {
  const unreadSelected = Array.from(selectedMessageIds).some((id) => {
    const messageRow = document.querySelector(`tr[data-message-id="${id}"]`);
    return messageRow && messageRow.classList.contains("unread");
  });
  markReadBtn.disabled = !unreadSelected || selectedMessageIds.size === 0;
}

function clearMessages() {
  chatMessagesTbodyEl.innerHTML = "";
  selectedMessageIds.clear();
  updateMarkReadButton();
}

function renderMessages(messages, append = false) {
  if (!append) {
    clearMessages();
  }

  if (messages.length === 0) {
    if (!append) {
      chatMessagesTbodyEl.innerHTML = '<tr><td colspan="6" class="empty-state">暂无聊天记录</td></tr>';
    }
    return;
  }

  chatMessagesTbodyEl.innerHTML = "";
  messages.forEach((message) => {
    const messageRow = createMessageRow(message, { withCheckbox: true });
    chatMessagesTbodyEl.appendChild(messageRow);
  });

  updateMarkReadButton();
}

function renderUserList(users) {
  userTbodyEl.innerHTML = "";
  if (!users.length) {
    userTbodyEl.innerHTML = '<tr><td colspan="5" class="empty-state">暂无用户</td></tr>';
    return;
  }

  users.forEach((user) => {
    const userRow = createUserRow(user);
    userTbodyEl.appendChild(userRow);
  });
}

function updateUserStats(total) {
  userTotalEl.textContent = total || 0;
  userPrevBtn.disabled = userOffset === 0;
  userNextBtn.disabled = !userHasMore;
}

function formatDateTimeForQuery(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

async function loadUserList(reset = true) {
  if (reset) {
    userOffset = 0;
  }

  userTbodyEl.innerHTML = '<tr><td colspan="5" class="loading">加载中...</td></tr>';

  try {
    const params = new URLSearchParams({
      limit: userLimit.toString(),
      offset: userOffset.toString(),
    });
    const channel = userChannelFilterEl.value.trim();
    if (channel) {
      params.set("channel", channel);
    }
    const fromValue = formatDateTimeForQuery(userFromEl.value);
    const toValue = formatDateTimeForQuery(userToEl.value);
    if (fromValue) {
      params.set("created_from", fromValue);
    }
    if (toValue) {
      params.set("created_to", toValue);
    }

    const response = await apiFetch(`api/users?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "加载用户失败");
    }

    const users = data.users || [];
    renderUserList(users);
    userHasMore = users.length === userLimit;
    updateUserStats(data.total || 0);
  } catch (error) {
    userTbodyEl.innerHTML = `<tr><td colspan="5" class="empty-state">错误: ${error.message}</td></tr>`;
    showToast(error.message || "加载用户失败", "error");
  }
}

function updateStats(total, unread) {
  totalCountEl.textContent = total;
  unreadCountEl.textContent = unread;
  chatStatsEl.style.display = "flex";
}

async function loadChatHistory(reset = true) {
  if (!currentUserAddress) {
    chatMessagesTbodyEl.innerHTML = '<tr><td colspan="6" class="empty-state">请先从上方选择用户</td></tr>';
    chatStatsEl.style.display = "none";
    return;
  }

  if (reset) {
    currentOffset = 0;
    currentChannel = channelFilterEl.value;
  }

  chatMessagesTbodyEl.innerHTML = '<tr><td colspan="6" class="loading">加载中...</td></tr>';

  try {
    const params = new URLSearchParams({
      limit: currentLimit.toString(),
      offset: currentOffset.toString(),
    });
    if (currentChannel) {
      params.set("channel", currentChannel);
    }

    const response = await apiFetch(
      `api/chat/${encodeURIComponent(currentUserAddress)}?${params.toString()}`
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "加载聊天记录失败");
    }

    renderMessages(data.messages || [], !reset);
    updateStats(data.total || 0, data.unread_count || 0);

    hasMore = (data.messages || []).length === currentLimit;
    loadMoreBtn.style.display = hasMore ? "block" : "none";

    if (reset && (data.messages || []).length > 0) {
      showToast(`已加载 ${data.messages.length} 条消息`, "success");
    }
  } catch (error) {
    chatMessagesTbodyEl.innerHTML = `<tr><td colspan="6" class="empty-state">错误: ${error.message}</td></tr>`;
    showToast(error.message || "加载聊天记录失败", "error");
  }
}

async function markMessagesRead() {
  const messageIds = Array.from(selectedMessageIds).filter((id) => {
    const messageEl = document.querySelector(`[data-message-id="${id}"]`);
    return messageEl && messageEl.classList.contains("unread");
  });

  if (messageIds.length === 0) {
    showToast("请选择未读消息", "error");
    return;
  }

  try {
    const response = await apiFetch("api/chat/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message_ids: messageIds }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "标记已读失败");
    }

    messageIds.forEach((id) => {
      const messageRow = document.querySelector(`tr[data-message-id="${id}"]`);
      if (messageRow) {
        messageRow.classList.remove("unread");
        const checkbox = messageRow.querySelector(`input[data-message-id="${id}"]`);
        if (checkbox) {
          checkbox.checked = false;
        }
        selectedMessageIds.delete(id);
      }
    });

    showToast(`已标记 ${data.updated} 条消息为已读`, "success");
    updateMarkReadButton();

    const unreadCount = parseInt(unreadCountEl.textContent) || 0;
    unreadCountEl.textContent = Math.max(0, unreadCount - data.updated);
  } catch (error) {
    showToast(error.message || "标记已读失败", "error");
  }
}

channelFilterEl.addEventListener("change", () => {
  if (currentUserAddress) {
    loadChatHistory(true);
  }
});

markReadBtn.addEventListener("click", markMessagesRead);

loadMoreBtn.addEventListener("click", () => {
  currentOffset += currentLimit;
  loadChatHistory(false);
});

if (!getStoredApiKey()) {
  showToast("请先在 Key 管理页面设置 API Key", "info");
}

// 用户列表事件
userRefreshBtn.addEventListener("click", () => {
  loadUserList(true);
});

userChannelFilterEl.addEventListener("change", () => {
  loadUserList(true);
});

userFromEl.addEventListener("change", () => {
  loadUserList(true);
});

userToEl.addEventListener("change", () => {
  loadUserList(true);
});

userPrevBtn.addEventListener("click", () => {
  if (userOffset === 0) return;
  userOffset = Math.max(0, userOffset - userLimit);
  loadUserList(false);
});

userNextBtn.addEventListener("click", () => {
  if (!userHasMore) return;
  userOffset += userLimit;
  loadUserList(false);
});

// 初始加载用户列表
loadUserList(true);

// 弹窗关闭事件
modalCloseBtn.addEventListener("click", () => {
  messageModalEl.style.display = "none";
});

messageModalEl.addEventListener("click", (e) => {
  if (e.target === messageModalEl) {
    messageModalEl.style.display = "none";
  }
});
