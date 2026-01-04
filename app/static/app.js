const sendForm = document.getElementById("send-form");
const recipientsEl = document.getElementById("recipients");
const subjectRow = document.getElementById("subject-row");
const subjectEl = document.getElementById("subject");
const bodyRow = document.getElementById("message-body-row");
const bodyEl = document.getElementById("message-body");
const htmlRow = document.getElementById("html-row");
const htmlEl = document.getElementById("message-html");
const emailFromRow = document.getElementById("email-from-row");
const emailFromSelect = document.getElementById("email-from");
const emailFromNewEl = document.getElementById("email-from-new");
const emailFromAddBtn = document.getElementById("email-from-add");
const emailFromRefreshBtn = document.getElementById("email-from-refresh");
const emailFromDeleteBtn = document.getElementById("email-from-delete");
const mediaRow = document.getElementById("media-row");
const mediaEl = document.getElementById("media-urls");
const whatsappFromRow = document.getElementById("whatsapp-from-row");
const whatsappFromSelect = document.getElementById("whatsapp-from");
const whatsappFromNewEl = document.getElementById("whatsapp-from-new");
const whatsappFromAddBtn = document.getElementById("whatsapp-from-add");
const whatsappFromRefreshBtn = document.getElementById("whatsapp-from-refresh");
const whatsappFromDeleteBtn = document.getElementById("whatsapp-from-delete");
const whatsappModeRow = document.getElementById("whatsapp-mode-row");
const whatsappTemplateListRow = document.getElementById("whatsapp-template-list-row");
const whatsappTemplateSelect = document.getElementById("whatsapp-template-select");
const whatsappTemplateRefreshBtn = document.getElementById("whatsapp-template-refresh");
const whatsappTemplateSearchEl = document.getElementById("whatsapp-template-search");
const whatsappTemplateMetaEl = document.getElementById("whatsapp-template-meta");
const whatsappTemplateRow = document.getElementById("whatsapp-template-row");
const whatsappTemplateEl = document.getElementById("whatsapp-template-id");
const whatsappTemplateVarsRow = document.getElementById("whatsapp-template-vars-row");
const whatsappTemplateVarsEl = document.getElementById("whatsapp-template-vars");
const twilioProxyToggle = document.getElementById("twilio-proxy-toggle");
const whatsappProxyRow = document.getElementById("whatsapp-proxy-row");
const sendResultEl = document.getElementById("send-result");
const statusResultEl = document.getElementById("status-result");
const toastContainer = document.getElementById("toast-container");

const statusMessageBtn = document.getElementById("status-message-btn");
const statusBatchBtn = document.getElementById("status-batch-btn");
const statusMessageIdEl = document.getElementById("status-message-id");
const statusBatchIdEl = document.getElementById("status-batch-id");
const statusTwilioBtn = document.getElementById("status-twilio-btn");
const statusTwilioIdEl = document.getElementById("status-twilio-id");
const API_KEY_STORAGE = "broadcast_api_key";

function getChannel() {
  const checked = document.querySelector('input[name="channel"]:checked');
  return checked ? checked.value : "email";
}

function getWhatsappMode() {
  const checked = document.querySelector('input[name="whatsapp-mode"]:checked');
  return checked ? checked.value : "text";
}

function shouldUseProxy() {
  return Boolean(twilioProxyToggle && twilioProxyToggle.checked);
}

function parseList(value) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function setSendResult(data) {
  sendResultEl.textContent = JSON.stringify(data, null, 2);
}

function setStatusResult(data) {
  statusResultEl.textContent = JSON.stringify(data, null, 2);
}

function getStoredApiKey() {
  if (typeof localStorage === "undefined") {
    return "";
  }
  return (localStorage.getItem(API_KEY_STORAGE) || "").trim();
}

let emailSendersLoaded = false;
let whatsappSendersLoaded = false;
let emailSendersLoading = false;
let whatsappSendersLoading = false;
let whatsappTemplatesLoaded = false;
let whatsappTemplatesLoading = false;
let whatsappTemplatesState = {
  items: [],
  search: "",
};

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

function setSelectPlaceholder(selectEl, message) {
  selectEl.innerHTML = "";
  const option = document.createElement("option");
  option.value = "";
  option.textContent = message;
  option.disabled = true;
  option.selected = true;
  selectEl.appendChild(option);
}

function formatEmailSender(sender) {
  if (sender.from_name) {
    return `${sender.from_name} <${sender.from_email}>`;
  }
  return sender.from_email;
}

function renderEmailSenders(senders, selectedValue) {
  emailFromSelect.innerHTML = "";
  if (!senders.length) {
    setSelectPlaceholder(emailFromSelect, "未配置发件人");
    return;
  }
  senders.forEach((sender) => {
    const option = document.createElement("option");
    option.value = sender.from_email;
    option.textContent = formatEmailSender(sender);
    emailFromSelect.appendChild(option);
  });
  const preferred =
    selectedValue && senders.some((sender) => sender.from_email === selectedValue)
      ? selectedValue
      : senders[0].from_email;
  emailFromSelect.value = preferred;
}

async function loadEmailSenders(options = {}) {
  const { selectedValue = null, showToast: showToastFlag = false } = options;
  if (emailSendersLoading) {
    return;
  }
  emailSendersLoading = true;
  try {
    const response = await apiFetch("api/email/senders");
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "加载发件人失败。");
    }
    renderEmailSenders(data.senders || [], selectedValue);
    emailSendersLoaded = true;
    if (showToastFlag) {
      const count = (data.senders || []).length;
      const message = count ? `发件人列表已刷新（${count}）` : "暂无发件人";
      showToast(message, count ? "success" : "info");
    }
  } catch (error) {
    emailSendersLoaded = false;
    setSelectPlaceholder(emailFromSelect, "发件人加载失败");
    showToast(error.message || "发件人加载失败。", "error");
  } finally {
    emailSendersLoading = false;
  }
}

function renderWhatsappSenders(senders, selectedValue) {
  whatsappFromSelect.innerHTML = "";
  if (!senders.length) {
    setSelectPlaceholder(whatsappFromSelect, "未配置发送人");
    return;
  }
  senders.forEach((sender) => {
    const option = document.createElement("option");
    option.value = sender;
    option.textContent = sender;
    whatsappFromSelect.appendChild(option);
  });
  const preferred =
    selectedValue && senders.includes(selectedValue) ? selectedValue : senders[0];
  whatsappFromSelect.value = preferred;
}

async function loadWhatsappSenders(options = {}) {
  const { selectedValue = null, showToast: showToastFlag = false } = options;
  if (whatsappSendersLoading) {
    return;
  }
  whatsappSendersLoading = true;
  try {
    const response = await apiFetch("api/whatsapp/senders");
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "加载发送人失败。");
    }
    renderWhatsappSenders(data.senders || [], selectedValue);
    whatsappSendersLoaded = true;
    if (showToastFlag) {
      const count = (data.senders || []).length;
      const message = count ? `发送人列表已刷新（${count}）` : "暂无发送人";
      showToast(message, count ? "success" : "info");
    }
  } catch (error) {
    whatsappSendersLoaded = false;
    setSelectPlaceholder(whatsappFromSelect, "发送人加载失败");
    showToast(error.message || "发送人加载失败。", "error");
  } finally {
    whatsappSendersLoading = false;
  }
}

function formatWhatsappTemplate(template) {
  const name = template.friendly_name || template.sid;
  const sidSuffix = template.friendly_name ? ` (${template.sid})` : "";
  const language = template.language ? ` [${template.language}]` : "";
  return `${name}${sidSuffix}${language}`;
}

function createTag(text, variant) {
  const tag = document.createElement("span");
  tag.classList.add("tag");
  if (variant) {
    tag.classList.add(`tag-${variant}`);
  }
  tag.textContent = text;
  return tag;
}

function setTemplateMetaTags(tags) {
  if (!whatsappTemplateMetaEl) {
    return;
  }
  whatsappTemplateMetaEl.innerHTML = "";
  if (!tags.length) {
    whatsappTemplateMetaEl.appendChild(createTag("暂无详情", "muted"));
    return;
  }
  tags.forEach((tag) => {
    whatsappTemplateMetaEl.appendChild(createTag(tag.text, tag.variant));
  });
}

function statusVariant(status) {
  const value = (status || "").toLowerCase();
  if (value.includes("approve") || value.includes("active")) {
    return "success";
  }
  if (value.includes("pending") || value.includes("review")) {
    return "warn";
  }
  if (value.includes("reject") || value.includes("fail")) {
    return "error";
  }
  return "muted";
}

function renderWhatsappTemplateMeta(selectedSid) {
  if (!whatsappTemplateMetaEl) {
    return;
  }
  const match = whatsappTemplatesState.items.find((item) => item.sid === selectedSid);
  if (!match) {
    setTemplateMetaTags([{ text: "请选择模板查看详情", variant: "muted" }]);
    return;
  }
  const tags = [];
  if (match.status) {
    tags.push({ text: `状态: ${match.status}`, variant: statusVariant(match.status) });
  }
  if (match.language) {
    tags.push({ text: `语言: ${match.language}`, variant: "muted" });
  }
  if (match.variables && match.variables.length) {
    tags.push({ text: `变量: ${match.variables.join(", ")}`, variant: "muted" });
  } else {
    tags.push({ text: "变量: 无", variant: "muted" });
  }
  if (match.whatsapp_eligibility && match.whatsapp_eligibility.length) {
    tags.push({
      text: `WhatsApp 资格: ${match.whatsapp_eligibility.join(", ")}`,
      variant: "success",
    });
  } else {
    tags.push({ text: "WhatsApp 资格: 未知", variant: "muted" });
  }
  setTemplateMetaTags(tags);
}

function renderWhatsappTemplates(templates, selectedSid) {
  whatsappTemplatesState.items = templates;
  whatsappTemplateSelect.innerHTML = "";
  if (!templates.length) {
    setSelectPlaceholder(whatsappTemplateSelect, "未找到模板");
    setTemplateMetaTags([{ text: "未找到模板", variant: "muted" }]);
    return;
  }
  templates.forEach((template) => {
    const option = document.createElement("option");
    option.value = template.sid;
    option.textContent = formatWhatsappTemplate(template);
    whatsappTemplateSelect.appendChild(option);
  });
  const hasSelected = selectedSid && templates.some((item) => item.sid === selectedSid);
  const preferred = hasSelected ? selectedSid : templates[0].sid;
  whatsappTemplateSelect.value = preferred;
  if (preferred && (!selectedSid || hasSelected)) {
    whatsappTemplateEl.value = preferred;
  }
  renderWhatsappTemplateMeta(whatsappTemplateSelect.value);
}

async function loadWhatsappTemplates(options = {}) {
  const {
    selectedSid = null,
    pageToken = null,
    search = "",
    showToast: showToastFlag = false,
    useProxy = false,
  } = options;
  if (whatsappTemplatesLoading) {
    return;
  }
  whatsappTemplatesLoading = true;
  try {
    const templates = [];
    const seenTokens = new Set();
    let nextToken = pageToken;
    const fetchAll = !pageToken;
    while (true) {
      const params = new URLSearchParams({ limit: "200" });
      if (nextToken) {
        params.set("page_token", nextToken);
      }
      if (search) {
        params.set("search", search);
      }
      params.set("use_proxy", useProxy ? "true" : "false");
      const response = await apiFetch(`api/whatsapp/templates?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "加载模板失败。");
      }
      templates.push(...(data.templates || []));
      const incomingToken = data.next_page_token;
      if (!fetchAll || !incomingToken || seenTokens.has(incomingToken)) {
        break;
      }
      seenTokens.add(incomingToken);
      nextToken = incomingToken;
    }
    whatsappTemplatesState.search = search;
    renderWhatsappTemplates(templates, selectedSid);
    whatsappTemplatesLoaded = true;
    if (showToastFlag) {
      const count = templates.length;
      if (count) {
        const message = search
          ? `模板搜索完成（${count}）`
          : `模板列表已刷新（${count}）`;
        showToast(message, "success");
      } else {
        showToast("未找到模板", "info");
      }
    }
  } catch (error) {
    whatsappTemplatesLoaded = false;
    setSelectPlaceholder(whatsappTemplateSelect, "模板加载失败");
    showToast(error.message || "模板加载失败。", "error");
    setTemplateMetaTags([{ text: "模板加载失败", variant: "error" }]);
  } finally {
    whatsappTemplatesLoading = false;
  }
}

function ensureEmailSenders() {
  if (!emailSendersLoaded) {
    loadEmailSenders({ selectedValue: emailFromSelect.value.trim() || null });
  }
}

function ensureWhatsappSenders() {
  if (!whatsappSendersLoaded) {
    loadWhatsappSenders({ selectedValue: whatsappFromSelect.value.trim() || null });
  }
}

function ensureWhatsappTemplates() {
  if (!whatsappTemplatesLoaded) {
    const selected = whatsappTemplateEl.value.trim() || null;
    const search = whatsappTemplateSearchEl.value.trim();
    loadWhatsappTemplates({ selectedSid: selected, search, useProxy: shouldUseProxy() });
  }
}

function toggleFields() {
  const channel = getChannel();
  const isEmail = channel === "email";
  const isWhatsappTemplate = !isEmail && getWhatsappMode() === "template";
  subjectRow.style.display = isEmail ? "block" : "none";
  htmlRow.style.display = isEmail ? "block" : "none";
  bodyRow.style.display = isEmail || !isWhatsappTemplate ? "block" : "none";
  mediaRow.style.display = isEmail || isWhatsappTemplate ? "none" : "block";
  emailFromRow.style.display = isEmail ? "block" : "none";
  whatsappFromRow.style.display = isEmail ? "none" : "block";
  whatsappProxyRow.style.display = isEmail ? "none" : "block";
  whatsappModeRow.style.display = isEmail ? "none" : "block";
  whatsappTemplateListRow.style.display =
    isEmail || !isWhatsappTemplate ? "none" : "block";
  whatsappTemplateRow.style.display = isEmail || !isWhatsappTemplate ? "none" : "block";
  whatsappTemplateVarsRow.style.display = isEmail || !isWhatsappTemplate ? "none" : "block";
}

document.querySelectorAll('input[name="channel"]').forEach((input) => {
  input.addEventListener("change", toggleFields);
});

document.querySelectorAll('input[name="whatsapp-mode"]').forEach((input) => {
  input.addEventListener("change", toggleFields);
});

toggleFields();
setSelectPlaceholder(emailFromSelect, "点击刷新列表加载");
setSelectPlaceholder(whatsappFromSelect, "点击刷新列表加载");
setSelectPlaceholder(whatsappTemplateSelect, "点击获取模板");
setTemplateMetaTags([{ text: "点击获取模板查看详情", variant: "muted" }]);

if (twilioProxyToggle) {
  twilioProxyToggle.addEventListener("change", () => {
    whatsappTemplatesLoaded = false;
  });
}

if (!getStoredApiKey()) {
  showToast("请先在 Key 管理页面设置 API Key", "info");
}

emailFromSelect.addEventListener("focus", ensureEmailSenders);
emailFromSelect.addEventListener("click", ensureEmailSenders);
whatsappFromSelect.addEventListener("focus", ensureWhatsappSenders);
whatsappFromSelect.addEventListener("click", ensureWhatsappSenders);
whatsappTemplateSelect.addEventListener("focus", ensureWhatsappTemplates);
whatsappTemplateSelect.addEventListener("click", ensureWhatsappTemplates);
whatsappTemplateSelect.addEventListener("change", () => {
  const value = whatsappTemplateSelect.value.trim();
  if (value) {
    whatsappTemplateEl.value = value;
  }
  renderWhatsappTemplateMeta(value);
});

emailFromRefreshBtn.addEventListener("click", () => {
  loadEmailSenders({
    selectedValue: emailFromSelect.value.trim() || null,
    showToast: true,
  });
});

whatsappFromRefreshBtn.addEventListener("click", () => {
  loadWhatsappSenders({
    selectedValue: whatsappFromSelect.value.trim() || null,
    showToast: true,
  });
});

whatsappTemplateRefreshBtn.addEventListener("click", () => {
  const selected = whatsappTemplateEl.value.trim() || null;
  const search = whatsappTemplateSearchEl.value.trim();
  loadWhatsappTemplates({
    selectedSid: selected,
    search,
    pageToken: null,
    useProxy: shouldUseProxy(),
    showToast: true,
  });
});

whatsappTemplateSearchEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    const selected = whatsappTemplateEl.value.trim() || null;
    const search = whatsappTemplateSearchEl.value.trim();
    loadWhatsappTemplates({
      selectedSid: selected,
      search,
      pageToken: null,
      useProxy: shouldUseProxy(),
      showToast: true,
    });
  }
});

emailFromAddBtn.addEventListener("click", async () => {
  const rawValue = emailFromNewEl.value.trim();
  if (!rawValue) {
    showToast("请输入要加入白名单的发件人邮箱。", "error");
    return;
  }
  try {
    const response = await apiFetch("api/email/senders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from_email: rawValue }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "加入白名单失败。");
    }
    renderEmailSenders(data.senders || [], data.from_email);
    emailSendersLoaded = true;
    emailFromNewEl.value = "";
    const isAdded = data.status === "added";
    const message = isAdded ? "已加入白名单" : "白名单已存在";
    showToast(`${message}：${data.from_email}`, isAdded ? "success" : "info");
  } catch (error) {
    showToast(error.message || "加入白名单失败。", "error");
  }
});

emailFromDeleteBtn.addEventListener("click", async () => {
  const selected = emailFromSelect.value.trim();
  if (!selected) {
    showToast("请选择要删除的发件人。", "error");
    return;
  }
  try {
    const response = await apiFetch("api/email/senders", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from_email: selected }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "删除白名单失败。");
    }
    renderEmailSenders(data.senders || [], null);
    emailSendersLoaded = true;
    let message = "删除结果未知";
    let type = "info";
    if (data.status === "deleted") {
      message = "已删除白名单";
      type = "success";
    } else if (data.status === "protected") {
      message = "默认发件人不可删除";
      type = "error";
    } else if (data.status === "not_found") {
      message = "白名单不存在";
      type = "error";
    }
    showToast(`${message}：${data.from_email}`, type);
  } catch (error) {
    showToast(error.message || "删除白名单失败。", "error");
  }
});

whatsappFromAddBtn.addEventListener("click", async () => {
  const rawValue = whatsappFromNewEl.value.trim();
  if (!rawValue) {
    showToast("请输入要加入白名单的发送人。", "error");
    return;
  }
  try {
    const response = await apiFetch("api/whatsapp/senders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from_address: rawValue }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "加入白名单失败。");
    }
    renderWhatsappSenders(data.senders || [], data.from_address);
    whatsappSendersLoaded = true;
    whatsappFromNewEl.value = "";
    const isAdded = data.status === "added";
    const message = isAdded ? "已加入白名单" : "白名单已存在";
    showToast(`${message}：${data.from_address}`, isAdded ? "success" : "info");
  } catch (error) {
    showToast(error.message || "加入白名单失败。", "error");
  }
});

whatsappFromDeleteBtn.addEventListener("click", async () => {
  const selected = whatsappFromSelect.value.trim();
  if (!selected) {
    showToast("请选择要删除的发送人。", "error");
    return;
  }
  try {
    const response = await apiFetch("api/whatsapp/senders", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from_address: selected }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "删除白名单失败。");
    }
    renderWhatsappSenders(data.senders || [], null);
    whatsappSendersLoaded = true;
    let message = "删除结果未知";
    let type = "info";
    if (data.status === "deleted") {
      message = "已删除白名单";
      type = "success";
    } else if (data.status === "protected") {
      message = "默认发送人不可删除";
      type = "error";
    } else if (data.status === "not_found") {
      message = "白名单不存在";
      type = "error";
    }
    showToast(`${message}：${data.from_address}`, type);
  } catch (error) {
    showToast(error.message || "删除白名单失败。", "error");
  }
});

sendForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const channel = getChannel();
  const recipients = parseList(recipientsEl.value);

  if (!recipients.length) {
    setSendResult({ error: "请填写收件人。" });
    return;
  }

  const payload = { recipients };
  let endpoint = "api/send/email";

  if (channel === "email") {
    payload.subject = subjectEl.value.trim();
    payload.text = bodyEl.value.trim();
    payload.html = htmlEl.value.trim() || null;
    const fromEmail = emailFromSelect.value.trim();
    if (!fromEmail) {
      setSendResult({ error: "请先选择发件人或添加白名单。" });
      return;
    }
    payload.from_email = fromEmail;
    if (!payload.subject || (!payload.text && !payload.html)) {
      setSendResult({ error: "发送邮件需要主题和内容。" });
      return;
    }
  } else {
    endpoint = "api/send/whatsapp";
    const mode = getWhatsappMode();
    payload.use_proxy = shouldUseProxy();
    const fromAddress = whatsappFromSelect.value.trim();
    if (!fromAddress) {
      setSendResult({ error: "请先选择发送人或添加白名单。" });
      return;
    }
    payload.from_address = fromAddress;
    if (mode === "template") {
      const contentSid = whatsappTemplateEl.value.trim();
      if (!contentSid) {
        setSendResult({ error: "请输入模板 ID。" });
        return;
      }
      payload.content_sid = contentSid;
      const varsRaw = whatsappTemplateVarsEl.value.trim();
      if (varsRaw) {
        try {
          const parsed = JSON.parse(varsRaw);
          if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
            throw new Error("模板变量需为 JSON 对象。");
          }
          payload.content_variables = parsed;
        } catch (error) {
          setSendResult({
            error: error.message || "模板变量 JSON 格式不正确。",
          });
          return;
        }
      }
    } else {
      payload.body = bodyEl.value.trim();
      payload.media_urls = parseList(mediaEl.value);
      if (!payload.body) {
        setSendResult({ error: "发送 WhatsApp 需要内容。" });
        return;
      }
    }
  }

  setSendResult({ status: "发送中..." });

  try {
    const response = await apiFetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    setSendResult(data);
  } catch (error) {
    setSendResult({ error: error.message || "请求失败。" });
  }
});

statusMessageBtn.addEventListener("click", async () => {
  const messageId = statusMessageIdEl.value.trim();
  if (!messageId) {
    setStatusResult({ error: "请填写消息 ID。" });
    return;
  }
  setStatusResult({ status: "加载中..." });
  try {
    const response = await apiFetch(`api/status/${encodeURIComponent(messageId)}`);
    const data = await response.json();
    setStatusResult(data);
  } catch (error) {
    setStatusResult({ error: error.message || "请求失败。" });
  }
});

if (statusTwilioBtn && statusTwilioIdEl) {
  statusTwilioBtn.addEventListener("click", async () => {
    const messageSid = statusTwilioIdEl.value.trim();
    if (!messageSid) {
      setStatusResult({ error: "请输入 Twilio 消息 SID。" });
      return;
    }
    setStatusResult({ status: "加载中..." });
    try {
      const params = new URLSearchParams({
        use_proxy: shouldUseProxy() ? "true" : "false",
      });
      const response = await apiFetch(
        `api/status/twilio/${encodeURIComponent(messageSid)}?${params.toString()}`
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "请求失败。");
      }
      setStatusResult(data);
    } catch (error) {
      setStatusResult({ error: error.message || "请求失败。" });
    }
  });
}

statusBatchBtn.addEventListener("click", async () => {
  const batchId = statusBatchIdEl.value.trim();
  if (!batchId) {
    setStatusResult({ error: "请填写批次 ID。" });
    return;
  }
  setStatusResult({ status: "加载中..." });
  try {
    const response = await apiFetch(`api/batch/${encodeURIComponent(batchId)}`);
    const data = await response.json();
    setStatusResult(data);
  } catch (error) {
    setStatusResult({ error: error.message || "请求失败。" });
  }
});
