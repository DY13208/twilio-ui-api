const API_KEY_STORAGE = "broadcast_api_key";
const DISPLAY_TIME_ZONE = "Asia/Shanghai";
const CHINA_UTC_OFFSET_MS = 8 * 60 * 60 * 1000;

const toastContainer = document.getElementById("toast-container");

const smsSendForm = document.getElementById("sms-send-form");
const smsRecipientsEl = document.getElementById("sms-recipients");
const smsMessageRow = document.getElementById("sms-message-row");
const smsMessageEl = document.getElementById("sms-message");
const smsTemplateRow = document.getElementById("sms-template-row");
const smsTemplateSelect = document.getElementById("sms-template-select");
const smsTemplateRefreshBtn = document.getElementById("sms-template-refresh");
const smsTemplateVarsRow = document.getElementById("sms-template-vars-row");
const smsTemplateVarsEl = document.getElementById("sms-template-vars");
const smsFromNumberEl = document.getElementById("sms-from-number");
const smsMessagingServiceEl = document.getElementById("sms-messaging-service");
const smsRateEl = document.getElementById("sms-rate");
const smsBatchEl = document.getElementById("sms-batch");
const smsAppendOptOutEl = document.getElementById("sms-append-opt-out");
const smsSendResultEl = document.getElementById("sms-send-result");

const smsTemplateIdEl = document.getElementById("sms-template-id");
const smsTemplateNameEl = document.getElementById("sms-template-name");
const smsTemplateBodyEl = document.getElementById("sms-template-body");
const smsTemplateVariablesEl = document.getElementById("sms-template-variables");
const smsTemplateCreateBtn = document.getElementById("sms-template-create");
const smsTemplateUpdateBtn = document.getElementById("sms-template-update");
const smsTemplateDisableBtn = document.getElementById("sms-template-disable");
const smsTemplateEnableBtn = document.getElementById("sms-template-enable");
const smsTemplateClearBtn = document.getElementById("sms-template-clear");
const smsTemplateListRefreshBtn = document.getElementById("sms-template-list-refresh");
const smsTemplateListEl = document.getElementById("sms-template-list");

const smsContactSearchEl = document.getElementById("sms-contact-search");
const smsContactTagEl = document.getElementById("sms-contact-tag");
const smsContactIncludeDisabledEl = document.getElementById(
  "sms-contact-include-disabled"
);
const smsContactRefreshBtn = document.getElementById("sms-contact-refresh");
const smsContactIdEl = document.getElementById("sms-contact-id");
const smsContactPhoneEl = document.getElementById("sms-contact-phone");
const smsContactNameEl = document.getElementById("sms-contact-name");
const smsContactTagsEl = document.getElementById("sms-contact-tags");
const smsContactCreateBtn = document.getElementById("sms-contact-create");
const smsContactUpdateBtn = document.getElementById("sms-contact-update");
const smsContactDisableBtn = document.getElementById("sms-contact-disable");
const smsContactEnableBtn = document.getElementById("sms-contact-enable");
const smsContactClearBtn = document.getElementById("sms-contact-clear");
const smsContactImportFileEl = document.getElementById("sms-contact-import-file");
const smsContactImportGroupEl = document.getElementById("sms-contact-import-group");
const smsContactImportBtn = document.getElementById("sms-contact-import");
const smsContactExportBtn = document.getElementById("sms-contact-export");
const smsContactListEl = document.getElementById("sms-contact-list");
const smsContactTotalEl = document.getElementById("sms-contact-total");
const smsContactPrevBtn = document.getElementById("sms-contact-prev");
const smsContactNextBtn = document.getElementById("sms-contact-next");
const smsContactResultEl = document.getElementById("sms-contact-result");

const smsGroupIdEl = document.getElementById("sms-group-id");
const smsGroupNameEl = document.getElementById("sms-group-name");
const smsGroupDescriptionEl = document.getElementById("sms-group-description");
const smsGroupCreateBtn = document.getElementById("sms-group-create");
const smsGroupUpdateBtn = document.getElementById("sms-group-update");
const smsGroupDeleteBtn = document.getElementById("sms-group-delete");
const smsGroupClearBtn = document.getElementById("sms-group-clear");
const smsGroupRefreshBtn = document.getElementById("sms-group-refresh");
const smsGroupListEl = document.getElementById("sms-group-list");
const smsGroupMemberIdsEl = document.getElementById("sms-group-member-ids");
const smsGroupMemberPhonesEl = document.getElementById("sms-group-member-phones");
const smsGroupMemberAddBtn = document.getElementById("sms-group-member-add");
const smsGroupMemberRemoveBtn = document.getElementById("sms-group-member-remove");
const smsGroupMembersEl = document.getElementById("sms-group-members");
const smsGroupResultEl = document.getElementById("sms-group-result");

const smsCampaignIdEl = document.getElementById("sms-campaign-id");
const smsCampaignNameEl = document.getElementById("sms-campaign-name");
const smsCampaignMessageEl = document.getElementById("sms-campaign-message");
const smsCampaignTemplateEl = document.getElementById("sms-campaign-template");
const smsCampaignTemplateVarsEl = document.getElementById("sms-campaign-template-vars");
const smsCampaignVariantAEl = document.getElementById("sms-campaign-variant-a");
const smsCampaignVariantBEl = document.getElementById("sms-campaign-variant-b");
const smsCampaignAbSplitEl = document.getElementById("sms-campaign-ab-split");
const smsCampaignScheduleEl = document.getElementById("sms-campaign-schedule");
const smsCampaignFromEl = document.getElementById("sms-campaign-from");
const smsCampaignServiceEl = document.getElementById("sms-campaign-service");
const smsCampaignRateEl = document.getElementById("sms-campaign-rate");
const smsCampaignBatchEl = document.getElementById("sms-campaign-batch");
const smsCampaignAppendOptOutEl = document.getElementById("sms-campaign-append-opt-out");
const smsCampaignGroupsEl = document.getElementById("sms-campaign-groups");
const smsCampaignTagsEl = document.getElementById("sms-campaign-tags");
const smsCampaignRecipientsEl = document.getElementById("sms-campaign-recipients");
const smsCampaignCreateBtn = document.getElementById("sms-campaign-create");
const smsCampaignUpdateBtn = document.getElementById("sms-campaign-update");
const smsCampaignClearBtn = document.getElementById("sms-campaign-clear");
const smsCampaignFilterEl = document.getElementById("sms-campaign-filter");
const smsCampaignRefreshBtn = document.getElementById("sms-campaign-refresh");
const smsCampaignListEl = document.getElementById("sms-campaign-list");
const smsCampaignResultEl = document.getElementById("sms-campaign-result");

const smsKeywordIdEl = document.getElementById("sms-keyword-id");
const smsKeywordTextEl = document.getElementById("sms-keyword-text");
const smsKeywordMatchEl = document.getElementById("sms-keyword-match");
const smsKeywordResponseEl = document.getElementById("sms-keyword-response");
const smsKeywordEnabledEl = document.getElementById("sms-keyword-enabled");
const smsKeywordCreateBtn = document.getElementById("sms-keyword-create");
const smsKeywordUpdateBtn = document.getElementById("sms-keyword-update");
const smsKeywordDeleteBtn = document.getElementById("sms-keyword-delete");
const smsKeywordClearBtn = document.getElementById("sms-keyword-clear");
const smsKeywordListEl = document.getElementById("sms-keyword-list");

const smsOptOutIdEl = document.getElementById("sms-optout-id");
const smsOptOutPhoneEl = document.getElementById("sms-optout-phone");
const smsOptOutReasonEl = document.getElementById("sms-optout-reason");
const smsOptOutSourceEl = document.getElementById("sms-optout-source");
const smsOptOutCreateBtn = document.getElementById("sms-optout-create");
const smsOptOutDeleteBtn = document.getElementById("sms-optout-delete");
const smsOptOutRefreshBtn = document.getElementById("sms-optout-refresh");
const smsOptOutClearBtn = document.getElementById("sms-optout-clear");
const smsOptOutListEl = document.getElementById("sms-optout-list");

const smsBlacklistIdEl = document.getElementById("sms-blacklist-id");
const smsBlacklistPhoneEl = document.getElementById("sms-blacklist-phone");
const smsBlacklistReasonEl = document.getElementById("sms-blacklist-reason");
const smsBlacklistCreateBtn = document.getElementById("sms-blacklist-create");
const smsBlacklistDeleteBtn = document.getElementById("sms-blacklist-delete");
const smsBlacklistRefreshBtn = document.getElementById("sms-blacklist-refresh");
const smsBlacklistClearBtn = document.getElementById("sms-blacklist-clear");
const smsBlacklistListEl = document.getElementById("sms-blacklist-list");

const smsStatsFromEl = document.getElementById("sms-stats-from");
const smsStatsToEl = document.getElementById("sms-stats-to");
const smsStatsRefreshBtn = document.getElementById("sms-stats-refresh");
const smsStatsResultEl = document.getElementById("sms-stats-result");
const smsCampaignStatsIdEl = document.getElementById("sms-campaign-stats-id");
const smsCampaignStatsRefreshBtn = document.getElementById("sms-campaign-stats-refresh");
const smsCampaignStatsResultEl = document.getElementById("sms-campaign-stats-result");

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

async function readJson(response) {
  try {
    return await response.json();
  } catch (error) {
    return {};
  }
}

function parseList(value) {
  return String(value || "")
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseCommaList(value) {
  return String(value || "")
    .split(/[,，]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseNumberList(value) {
  return parseCommaList(value)
    .map((item) => parseInt(item, 10))
    .filter((item) => Number.isFinite(item));
}

function parseJsonSafe(raw, label = "JSON") {
  const text = String(raw || "").trim();
  if (!text) {
    return null;
  }
  try {
    const parsed = JSON.parse(text);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      throw new Error(`${label} 需要是对象`);
    }
    return parsed;
  } catch (error) {
    throw new Error(error.message || `${label} 格式错误`);
  }
}

function parseServerDate(value) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const text = String(value).trim();
  if (!text) {
    return null;
  }
  const hasTimezone = /[zZ]|[+\-]\d{2}:?\d{2}$/.test(text);
  const normalized = hasTimezone ? text : `${text}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseChinaDateInput(value) {
  if (!value) {
    return null;
  }
  const text = String(value).trim();
  if (!text) {
    return null;
  }
  const match = text.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/
  );
  if (!match) {
    return null;
  }
  const [, year, month, day, hour, minute, second] = match;
  const utcMillis =
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second || 0)
    ) - CHINA_UTC_OFFSET_MS;
  const date = new Date(utcMillis);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(dateString) {
  const date = parseServerDate(dateString);
  if (!date) {
    return "-";
  }
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: DISPLAY_TIME_ZONE,
  });
}

function formatDateTimeInput(dateString) {
  const date = parseServerDate(dateString);
  if (!date) {
    return "";
  }
  const chinaMillis = date.getTime() + CHINA_UTC_OFFSET_MS;
  const chinaDate = new Date(chinaMillis);
  return chinaDate.toISOString().slice(0, 16);
}

function formatDateTimeForQuery(value) {
  const date = parseChinaDateInput(value);
  if (!date) {
    return null;
  }
  return date.toISOString();
}

function setSelectPlaceholder(selectEl, message) {
  if (!selectEl) {
    return;
  }
  selectEl.innerHTML = "";
  const option = document.createElement("option");
  option.value = "";
  option.textContent = message;
  option.disabled = true;
  option.selected = true;
  selectEl.appendChild(option);
}

function createTag(text, variant) {
  const tag = document.createElement("span");
  tag.className = "tag";
  if (variant) {
    tag.classList.add(`tag-${variant}`);
  }
  tag.textContent = text;
  return tag;
}

function createActionButton(text, variant, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `${variant} small`;
  button.textContent = text;
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    onClick();
  });
  return button;
}

function createKeyItem(titleText, metaLines = [], tags = []) {
  const wrapper = document.createElement("div");
  wrapper.className = "key-item";

  const meta = document.createElement("div");
  meta.className = "key-meta";

  const title = document.createElement("div");
  title.className = "key-title";
  title.textContent = titleText;
  meta.appendChild(title);

  metaLines.forEach((line) => {
    if (!line) {
      return;
    }
    const div = document.createElement("div");
    div.textContent = line;
    meta.appendChild(div);
  });

  if (tags.length) {
    const tagRow = document.createElement("div");
    tagRow.className = "row";
    tags.forEach((tag) => tagRow.appendChild(tag));
    meta.appendChild(tagRow);
  }

  const actions = document.createElement("div");
  actions.className = "key-actions";

  wrapper.appendChild(meta);
  wrapper.appendChild(actions);

  return { wrapper, actions };
}

function truncate(text, maxLength = 60) {
  const value = String(text || "");
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength)}...`;
}

function setResult(el, data) {
  if (!el) {
    return;
  }
  if (typeof data === "string") {
    el.textContent = data;
    return;
  }
  el.textContent = JSON.stringify(data, null, 2);
}

let smsTemplates = [];
let smsTemplatesLoaded = false;
let smsTemplatesLoading = false;
let smsContactOffset = 0;
const smsContactLimit = 20;
let smsContactHasMore = false;
let selectedGroupId = null;

function getSmsSendMode() {
  const checked = document.querySelector('input[name="sms-send-mode"]:checked');
  return checked ? checked.value : "text";
}

function toggleSmsSendMode() {
  const mode = getSmsSendMode();
  const isTemplate = mode === "template";
  smsMessageRow.style.display = isTemplate ? "none" : "block";
  smsTemplateRow.style.display = isTemplate ? "block" : "none";
  smsTemplateVarsRow.style.display = isTemplate ? "block" : "none";
}

function renderSmsTemplateSelects(items) {
  const activeItems = items.filter((item) => !item.disabled_at);
  if (smsTemplateSelect) {
    const current = smsTemplateSelect.value;
    smsTemplateSelect.innerHTML = "";
    if (!activeItems.length) {
      setSelectPlaceholder(smsTemplateSelect, "暂无可用模板");
    } else {
      activeItems.forEach((item) => {
        const option = document.createElement("option");
        option.value = String(item.id);
        option.textContent = `${item.name} (#${item.id})`;
        smsTemplateSelect.appendChild(option);
      });
      const currentValid =
        current && activeItems.some((item) => String(item.id) === current);
      smsTemplateSelect.value = currentValid
        ? current
        : String(activeItems[0].id);
    }
  }

  if (smsCampaignTemplateEl) {
    const current = smsCampaignTemplateEl.value;
    smsCampaignTemplateEl.innerHTML = "";
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = "不使用模板";
    smsCampaignTemplateEl.appendChild(emptyOption);
    activeItems.forEach((item) => {
      const option = document.createElement("option");
      option.value = String(item.id);
      option.textContent = `${item.name} (#${item.id})`;
      smsCampaignTemplateEl.appendChild(option);
    });
    const currentValid =
      current && activeItems.some((item) => String(item.id) === current);
    smsCampaignTemplateEl.value = currentValid ? current : "";
  }
}

function renderSmsTemplateList(items) {
  smsTemplateListEl.innerHTML = "";
  if (!items.length) {
    smsTemplateListEl.innerHTML = '<div class="hint">暂无模板</div>';
    return;
  }

  items.forEach((item) => {
    const tags = [];
    if (item.disabled_at) {
      tags.push(createTag("已停用", "warn"));
    } else {
      tags.push(createTag("可用", "success"));
    }
    if (item.variables && item.variables.length) {
      tags.push(createTag(`变量 ${item.variables.length}`, "muted"));
    }
    const metaLines = [
      item.body ? truncate(item.body, 80) : "",
      `ID: ${item.id} · 更新: ${formatDateTime(item.updated_at)}`,
    ];
    const { wrapper, actions } = createKeyItem(`${item.name}`, metaLines, tags);
    actions.appendChild(
      createActionButton("填入", "secondary", () => fillSmsTemplateForm(item))
    );
    const toggleLabel = item.disabled_at ? "启用" : "停用";
    actions.appendChild(
      createActionButton(toggleLabel, "ghost", () => {
        if (item.disabled_at) {
          enableSmsTemplate(item.id);
        } else {
          disableSmsTemplate(item.id);
        }
      })
    );
    smsTemplateListEl.appendChild(wrapper);
  });
}

async function loadSmsTemplates(showToastFlag = false) {
  if (smsTemplatesLoading) {
    return;
  }
  smsTemplatesLoading = true;
  try {
    const response = await apiFetch("api/sms/templates");
    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(data.detail || "加载模板失败");
    }
    smsTemplates = data.templates || [];
    renderSmsTemplateList(smsTemplates);
    renderSmsTemplateSelects(smsTemplates);
    smsTemplatesLoaded = true;
    if (showToastFlag) {
      showToast(`模板列表已更新（${smsTemplates.length}）`, "success");
    }
  } catch (error) {
    smsTemplatesLoaded = false;
    smsTemplateListEl.innerHTML = '<div class="hint">模板加载失败</div>';
    setSelectPlaceholder(smsTemplateSelect, "模板加载失败");
    if (smsCampaignTemplateEl) {
      setSelectPlaceholder(smsCampaignTemplateEl, "模板加载失败");
    }
    showToast(error.message || "加载模板失败", "error");
  } finally {
    smsTemplatesLoading = false;
  }
}

function fillSmsTemplateForm(item) {
  smsTemplateIdEl.value = item.id || "";
  smsTemplateNameEl.value = item.name || "";
  smsTemplateBodyEl.value = item.body || "";
  smsTemplateVariablesEl.value = (item.variables || []).join(", ");
}

function clearSmsTemplateForm() {
  smsTemplateIdEl.value = "";
  smsTemplateNameEl.value = "";
  smsTemplateBodyEl.value = "";
  smsTemplateVariablesEl.value = "";
}

async function createSmsTemplate() {
  const name = smsTemplateNameEl.value.trim();
  const body = smsTemplateBodyEl.value.trim();
  if (!name || !body) {
    showToast("请填写模板名称和内容", "error");
    return;
  }
  const variables = parseCommaList(smsTemplateVariablesEl.value);
  const payload = { name, body };
  if (variables.length) {
    payload.variables = variables;
  }

  try {
    const response = await apiFetch("api/sms/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(data.detail || "创建模板失败");
    }
    fillSmsTemplateForm(data);
    showToast("模板已创建", "success");
    loadSmsTemplates();
  } catch (error) {
    showToast(error.message || "创建模板失败", "error");
  }
}

async function updateSmsTemplate() {
  const templateId = parseInt(smsTemplateIdEl.value, 10);
  if (!templateId) {
    showToast("请输入模板 ID", "error");
    return;
  }
  const payload = {};
  const name = smsTemplateNameEl.value.trim();
  const body = smsTemplateBodyEl.value.trim();
  const variables = parseCommaList(smsTemplateVariablesEl.value);
  if (name) {
    payload.name = name;
  }
  if (body) {
    payload.body = body;
  }
  if (variables.length) {
    payload.variables = variables;
  }
  if (!Object.keys(payload).length) {
    showToast("请输入要更新的字段", "error");
    return;
  }

  try {
    const response = await apiFetch(`api/sms/templates/${templateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(data.detail || "更新模板失败");
    }
    fillSmsTemplateForm(data);
    showToast("模板已更新", "success");
    loadSmsTemplates();
  } catch (error) {
    showToast(error.message || "更新模板失败", "error");
  }
}

async function disableSmsTemplate(templateId) {
  if (!templateId) {
    showToast("请输入模板 ID", "error");
    return;
  }
  try {
    const response = await apiFetch(`api/sms/templates/${templateId}`, {
      method: "DELETE",
    });
    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(data.detail || "停用模板失败");
    }
    showToast("模板已停用", "success");
    fillSmsTemplateForm(data);
    loadSmsTemplates();
  } catch (error) {
    showToast(error.message || "停用模板失败", "error");
  }
}

async function enableSmsTemplate(templateId) {
  if (!templateId) {
    showToast("请输入模板 ID", "error");
    return;
  }
  try {
    const response = await apiFetch(`api/sms/templates/${templateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disabled: false }),
    });
    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(data.detail || "启用模板失败");
    }
    showToast("模板已启用", "success");
    fillSmsTemplateForm(data);
    loadSmsTemplates();
  } catch (error) {
    showToast(error.message || "启用模板失败", "error");
  }
}

async function handleSmsSend(event) {
  event.preventDefault();
  setResult(smsSendResultEl, "发送中...");
  try {
    const recipients = parseList(smsRecipientsEl.value);
    if (!recipients.length) {
      throw new Error("请填写收件人");
    }
    const payload = { recipients };
    const fromNumber = smsFromNumberEl.value.trim();
    const serviceSid = smsMessagingServiceEl.value.trim();
    if (fromNumber) {
      payload.from_number = fromNumber;
    }
    if (serviceSid) {
      payload.messaging_service_sid = serviceSid;
    }
    const rate = parseInt(smsRateEl.value, 10);
    if (Number.isFinite(rate) && rate > 0) {
      payload.rate_per_minute = rate;
    }
    const batch = parseInt(smsBatchEl.value, 10);
    if (Number.isFinite(batch) && batch > 0) {
      payload.batch_size = batch;
    }
    payload.append_opt_out = smsAppendOptOutEl.checked;

    const mode = getSmsSendMode();
    if (mode === "template") {
      const templateId = parseInt(smsTemplateSelect.value, 10);
      if (!templateId) {
        throw new Error("请选择短信模板");
      }
      payload.template_id = templateId;
      const vars = parseJsonSafe(smsTemplateVarsEl.value, "模板变量");
      if (vars !== null) {
        payload.template_variables = vars;
      }
    } else {
      const message = smsMessageEl.value.trim();
      if (!message) {
        throw new Error("请输入短信内容");
      }
      payload.message = message;
    }

    const response = await apiFetch("api/send/sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(data.detail || "短信发送失败");
    }
    setResult(smsSendResultEl, data);
    showToast("短信发送请求已提交", "success");
  } catch (error) {
    setResult(smsSendResultEl, { error: error.message });
    showToast(error.message || "短信发送失败", "error");
  }
}

function renderSmsContactList(contacts) {
  smsContactListEl.innerHTML = "";
  if (!contacts.length) {
    smsContactListEl.innerHTML = '<div class="hint">暂无联系人</div>';
    return;
  }
  contacts.forEach((contact) => {
    const tags = [];
    (contact.tags || []).forEach((tag) => tags.push(createTag(tag, "muted")));
    if (contact.disabled_at) {
      tags.push(createTag("已停用", "warn"));
    }
    const metaLines = [
      `ID: ${contact.id}`,
      contact.name ? `姓名: ${contact.name}` : null,
      contact.tags && contact.tags.length ? `标签: ${contact.tags.join(", ")}` : null,
      `更新: ${formatDateTime(contact.updated_at)}`,
    ];
    const title = contact.phone || "未知号码";
    const { wrapper, actions } = createKeyItem(title, metaLines, tags);
    actions.appendChild(
      createActionButton("编辑", "secondary", () => fillSmsContactForm(contact))
    );
    const toggleLabel = contact.disabled_at ? "启用" : "停用";
    actions.appendChild(
      createActionButton(toggleLabel, "ghost", () => {
        if (contact.disabled_at) {
          enableSmsContact(contact.id);
        } else {
          disableSmsContact(contact.id);
        }
      })
    );
    smsContactListEl.appendChild(wrapper);
  });
}

async function loadSmsContacts(reset = true) {
  if (reset) {
    smsContactOffset = 0;
  }
  smsContactListEl.innerHTML = '<div class="hint">加载中...</div>';

  try {
    const params = new URLSearchParams({
      limit: smsContactLimit.toString(),
      offset: smsContactOffset.toString(),
    });
    const search = smsContactSearchEl.value.trim();
    const tag = smsContactTagEl.value.trim();
    if (search) {
      params.set("search", search);
    }
    if (tag) {
      params.set("tag", tag);
    }
    if (smsContactIncludeDisabledEl.checked) {
      params.set("include_disabled", "true");
    }

    const response = await apiFetch(`api/sms/contacts?${params.toString()}`);
    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(data.detail || "加载联系人失败");
    }

    const contacts = data.contacts || [];
    renderSmsContactList(contacts);
    smsContactHasMore = smsContactOffset + smsContactLimit < (data.total || 0);
    smsContactTotalEl.textContent = data.total || 0;
    smsContactPrevBtn.disabled = smsContactOffset === 0;
    smsContactNextBtn.disabled = !smsContactHasMore;
  } catch (error) {
    smsContactListEl.innerHTML = `<div class="hint">错误: ${error.message}</div>`;
    showToast(error.message || "加载联系人失败", "error");
  }
}

function fillSmsContactForm(contact) {
  smsContactIdEl.value = contact.id || "";
  smsContactPhoneEl.value = contact.phone || "";
  smsContactNameEl.value = contact.name || "";
  smsContactTagsEl.value = (contact.tags || []).join(", ");
}

function clearSmsContactForm() {
  smsContactIdEl.value = "";
  smsContactPhoneEl.value = "";
  smsContactNameEl.value = "";
  smsContactTagsEl.value = "";
}

async function createSmsContact() {
  const phone = smsContactPhoneEl.value.trim();
  if (!phone) {
    showToast("请输入手机号", "error");
    return;
  }
  const payload = { phone };
  const name = smsContactNameEl.value.trim();
  const tags = parseCommaList(smsContactTagsEl.value);
  if (name) {
    payload.name = name;
  }
  if (tags.length) {
    payload.tags = tags;
  }

  try {
    const response = await apiFetch("api/sms/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(data.detail || "新增联系人失败");
    }
    fillSmsContactForm(data);
    setResult(smsContactResultEl, data);
    showToast("联系人已保存", "success");
    loadSmsContacts(true);
  } catch (error) {
    showToast(error.message || "新增联系人失败", "error");
  }
}

async function updateSmsContact() {
  const contactId = parseInt(smsContactIdEl.value, 10);
  if (!contactId) {
    showToast("请输入联系人 ID", "error");
    return;
  }
  const payload = {};
  const name = smsContactNameEl.value.trim();
  const tags = parseCommaList(smsContactTagsEl.value);
  if (name) {
    payload.name = name;
  }
  if (tags.length) {
    payload.tags = tags;
  }
  if (!Object.keys(payload).length) {
    showToast("请输入要更新的字段", "error");
    return;
  }

  try {
    const response = await apiFetch(`api/sms/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(data.detail || "更新联系人失败");
    }
    fillSmsContactForm(data);
    setResult(smsContactResultEl, data);
    showToast("联系人已更新", "success");
    loadSmsContacts(false);
  } catch (error) {
    showToast(error.message || "更新联系人失败", "error");
  }
}

async function disableSmsContact(contactId) {
  if (!contactId) {
    showToast("请输入联系人 ID", "error");
    return;
  }
  try {
    const response = await apiFetch(`api/sms/contacts/${contactId}`, {
      method: "DELETE",
    });
    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(data.detail || "停用联系人失败");
    }
    setResult(smsContactResultEl, data);
    showToast("联系人已停用", "success");
    loadSmsContacts(false);
  } catch (error) {
    showToast(error.message || "停用联系人失败", "error");
  }
}

async function enableSmsContact(contactId) {
  if (!contactId) {
    showToast("请输入联系人 ID", "error");
    return;
  }
  try {
    const response = await apiFetch(`api/sms/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disabled: false }),
    });
    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(data.detail || "启用联系人失败");
    }
    setResult(smsContactResultEl, data);
    showToast("联系人已启用", "success");
    loadSmsContacts(false);
  } catch (error) {
    showToast(error.message || "启用联系人失败", "error");
  }
}

async function importSmsContacts() {
  const file = smsContactImportFileEl.files[0];
  if (!file) {
    showToast("请选择 CSV 文件", "error");
    return;
  }
  const formData = new FormData();
  formData.append("file", file);
  const groupId = smsContactImportGroupEl.value.trim();
  const params = new URLSearchParams();
  if (groupId) {
    params.set("group_id", groupId);
  }
  try {
    const response = await apiFetch(
      `api/sms/contacts/import?${params.toString()}`,
      {
        method: "POST",
        body: formData,
      }
    );
    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(data.detail || "导入失败");
    }
    setResult(smsContactResultEl, data);
    showToast("联系人导入完成", "success");
    smsContactImportFileEl.value = "";
    loadSmsContacts(true);
    if (selectedGroupId) {
      loadSmsGroupMembers(selectedGroupId);
    }
  } catch (error) {
    showToast(error.message || "导入失败", "error");
  }
}

async function exportSmsContacts() {
  try {
    const params = new URLSearchParams();
    if (smsContactIncludeDisabledEl.checked) {
      params.set("include_disabled", "true");
    }
    const response = await apiFetch(
      `api/sms/contacts/export?${params.toString()}`
    );
    if (!response.ok) {
      const data = await readJson(response);
      throw new Error(data.detail || "导出失败");
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sms_contacts.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    showToast("联系人已导出", "success");
  } catch (error) {
    showToast(error.message || "导出失败", "error");
  }
}

function renderSmsGroupList(groups) {
  smsGroupListEl.innerHTML = "";
  if (!groups.length) {
    smsGroupListEl.innerHTML = '<div class="hint">暂无分组</div>';
    return;
  }
  groups.forEach((group) => {
    const tags = [createTag(`成员 ${group.member_count || 0}`, "muted")];
    if (selectedGroupId === group.id) {
      tags.push(createTag("已选中", "success"));
    }
    const metaLines = [
      group.description ? truncate(group.description, 80) : null,
      `ID: ${group.id} · 更新: ${formatDateTime(group.updated_at)}`,
    ];
    const { wrapper, actions } = createKeyItem(group.name, metaLines, tags);
    actions.appendChild(
      createActionButton("选择", "secondary", () => {
        selectedGroupId = group.id;
        smsGroupIdEl.value = group.id;
        loadSmsGroupMembers(group.id);
        renderSmsGroupList(groups);
      })
    );
    actions.appendChild(
      createActionButton("编辑", "ghost", () => fillSmsGroupForm(group))
    );
    actions.appendChild(
      createActionButton("删除", "ghost", () => deleteSmsGroup(group.id))
    );
    smsGroupListEl.appendChild(wrapper);
  });
}

async function loadSmsGroups(showToastFlag = false) {
  try {
    const response = await apiFetch("api/sms/groups");
    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(data.detail || "加载分组失败");
    }
    renderSmsGroupList(data.groups || []);
    if (showToastFlag) {
      showToast("分组列表已更新", "success");
    }
  } catch (error) {
    smsGroupListEl.innerHTML = `<div class="hint">错误: ${error.message}</div>`;
    showToast(error.message || "加载分组失败", "error");
  }
}

function fillSmsGroupForm(group) {
  smsGroupIdEl.value = group.id || "";
  smsGroupNameEl.value = group.name || "";
  smsGroupDescriptionEl.value = group.description || "";
}

function clearSmsGroupForm() {
  smsGroupIdEl.value = "";
  smsGroupNameEl.value = "";
  smsGroupDescriptionEl.value = "";
}

async function createSmsGroup() {
  const name = smsGroupNameEl.value.trim();
  if (!name) {
    showToast("请输入分组名称", "error");
    return;
  }
  const payload = { name };
  const description = smsGroupDescriptionEl.value.trim();
  if (description) {
    payload.description = description;
  }
  try {
    const response = await apiFetch("api/sms/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(data.detail || "创建分组失败");
    }
    fillSmsGroupForm(data);
    setResult(smsGroupResultEl, data);
    showToast("分组已创建", "success");
    loadSmsGroups(true);
  } catch (error) {
    showToast(error.message || "创建分组失败", "error");
  }
}

async function updateSmsGroup() {
  const groupId = parseInt(smsGroupIdEl.value, 10);
  if (!groupId) {
    showToast("请输入分组 ID", "error");
    return;
  }
  const payload = {};
  const name = smsGroupNameEl.value.trim();
  const description = smsGroupDescriptionEl.value.trim();
  if (name) {
    payload.name = name;
  }
  if (description) {
    payload.description = description;
  }
  if (!Object.keys(payload).length) {
    showToast("请输入要更新的字段", "error");
    return;
  }
  try {
    const response = await apiFetch(`api/sms/groups/${groupId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(data.detail || "更新分组失败");
    }
    fillSmsGroupForm(data);
    setResult(smsGroupResultEl, data);
    showToast("分组已更新", "success");
    loadSmsGroups(false);
  } catch (error) {
    showToast(error.message || "更新分组失败", "error");
  }
}

async function deleteSmsGroup(groupId) {
  const targetId = groupId || parseInt(smsGroupIdEl.value, 10);
  if (!targetId) {
    showToast("请输入分组 ID", "error");
    return;
  }
  try {
    const response = await apiFetch(`api/sms/groups/${targetId}`, {
      method: "DELETE",
    });
    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(data.detail || "删除分组失败");
    }
    if (selectedGroupId === targetId) {
      selectedGroupId = null;
      smsGroupMembersEl.innerHTML = '<div class="hint">请选择分组</div>';
    }
    setResult(smsGroupResultEl, data);
    showToast("分组已删除", "success");
    loadSmsGroups(true);
  } catch (error) {
    showToast(error.message || "删除分组失败", "error");
  }
}

function renderSmsGroupMembers(members) {
  smsGroupMembersEl.innerHTML = "";
  if (!members.length) {
    smsGroupMembersEl.innerHTML = '<div class="hint">暂无成员</div>';
    return;
  }
  members.forEach((member) => {
    const tags = [];
    (member.tags || []).forEach((tag) => tags.push(createTag(tag, "muted")));
    const metaLines = [`ID: ${member.id}`, member.name ? `姓名: ${member.name}` : null];
    const { wrapper } = createKeyItem(member.phone, metaLines, tags);
    smsGroupMembersEl.appendChild(wrapper);
  });
}

async function loadSmsGroupMembers(groupId) {
  if (!groupId) {
    smsGroupMembersEl.innerHTML = '<div class="hint">请选择分组</div>';
    return;
  }
  smsGroupMembersEl.innerHTML = '<div class="hint">加载中...</div>';
  try {
    const response = await apiFetch(`api/sms/groups/${groupId}/members`);
    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(data.detail || "加载成员失败");
    }
    renderSmsGroupMembers(data.members || []);
  } catch (error) {
    smsGroupMembersEl.innerHTML = `<div class="hint">错误: ${error.message}</div>`;
    showToast(error.message || "加载成员失败", "error");
  }
}

async function addSmsGroupMembers() {
  const groupId = parseInt(smsGroupIdEl.value, 10);
  if (!groupId) {
    showToast("请输入分组 ID", "error");
    return;
  }
  const contactIds = parseNumberList(smsGroupMemberIdsEl.value);
  const phones = parseList(smsGroupMemberPhonesEl.value);
  if (!contactIds.length && !phones.length) {
    showToast("请输入联系人 ID 或手机号", "error");
    return;
  }
  const payload = {};
  if (contactIds.length) {
    payload.contact_ids = contactIds;
  }
  if (phones.length) {
    payload.phones = phones;
  }
  try {
    const response = await apiFetch(`api/sms/groups/${groupId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(data.detail || "添加成员失败");
    }
    renderSmsGroupMembers(data.members || []);
    setResult(smsGroupResultEl, data);
    showToast("成员已更新", "success");
  } catch (error) {
    showToast(error.message || "添加成员失败", "error");
  }
}

async function removeSmsGroupMembers() {
  const groupId = parseInt(smsGroupIdEl.value, 10);
  if (!groupId) {
    showToast("请输入分组 ID", "error");
    return;
  }
  const contactIds = parseNumberList(smsGroupMemberIdsEl.value);
  const phones = parseList(smsGroupMemberPhonesEl.value);
  if (!contactIds.length && !phones.length) {
    showToast("请输入联系人 ID 或手机号", "error");
    return;
  }
  const payload = {};
  if (contactIds.length) {
    payload.contact_ids = contactIds;
  }
  if (phones.length) {
    payload.phones = phones;
  }
  try {
    const response = await apiFetch(`api/sms/groups/${groupId}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(data.detail || "移除成员失败");
    }
    renderSmsGroupMembers(data.members || []);
    setResult(smsGroupResultEl, data);
    showToast("成员已移除", "success");
  } catch (error) {
    showToast(error.message || "移除成员失败", "error");
  }
}

function campaignStatusVariant(status) {
  const value = String(status || "").toLowerCase();
  if (value === "completed" || value === "running") {
    return "success";
  }
  if (value === "scheduled" || value === "paused") {
    return "warn";
  }
  if (value === "failed" || value === "canceled") {
    return "error";
  }
  return "muted";
}

function formatCampaignStatus(status) {
  const value = String(status || "").toLowerCase();
  if (value === "draft") {
    return "草稿";
  }
  if (value === "scheduled") {
    return "已排期";
  }
  if (value === "running") {
    return "发送中";
  }
  if (value === "paused") {
    return "已暂停";
  }
  if (value === "completed") {
    return "已完成";
  }
  if (value === "failed") {
    return "失败";
  }
  if (value === "canceled") {
    return "已取消";
  }
  return status || "";
}

function renderSmsCampaignList(campaigns) {
  smsCampaignListEl.innerHTML = "";
  if (!campaigns.length) {
    smsCampaignListEl.innerHTML = '<div class="hint">暂无活动</div>';
    return;
  }
  campaigns.forEach((campaign) => {
    const tags = [
      createTag(
        formatCampaignStatus(campaign.status || "draft"),
        campaignStatusVariant(campaign.status)
      ),
    ];
    if (campaign.schedule_at) {
      tags.push(createTag("已排期", "muted"));
    }
    const metaLines = [];
    if (campaign.message) {
      metaLines.push(`内容: ${truncate(campaign.message, 80)}`);
    }
    if (campaign.template_id) {
      metaLines.push(`模板: #${campaign.template_id}`);
    }
    if (campaign.variant_a || campaign.variant_b) {
      metaLines.push("A/B 文案已配置");
    }
    if (campaign.group_ids && campaign.group_ids.length) {
      metaLines.push(`分组: ${campaign.group_ids.join(", ")}`);
    }
    if (campaign.tags && campaign.tags.length) {
      metaLines.push(`标签: ${campaign.tags.join(", ")}`);
    }
    if (campaign.recipients && campaign.recipients.length) {
      metaLines.push(`收件人: ${campaign.recipients.length} 个`);
    }
    if (campaign.rate_per_minute) {
      metaLines.push(`限速: ${campaign.rate_per_minute}/分钟`);
    }
    if (campaign.batch_size) {
      metaLines.push(`批次: ${campaign.batch_size}`);
    }
    if (campaign.schedule_at) {
      metaLines.push(`排期: ${formatDateTime(campaign.schedule_at)}`);
    }
    if (campaign.started_at) {
      metaLines.push(`开始: ${formatDateTime(campaign.started_at)}`);
    }
    if (campaign.completed_at) {
      metaLines.push(`完成: ${formatDateTime(campaign.completed_at)}`);
    }
    metaLines.push(`ID: ${campaign.id}`);

    const { wrapper, actions } = createKeyItem(campaign.name, metaLines, tags);
    actions.appendChild(
      createActionButton("编辑", "secondary", () => fillSmsCampaignForm(campaign))
    );
    actions.appendChild(
      createActionButton("启动", "ghost", () => campaignAction(campaign.id, "start"))
    );
    actions.appendChild(
      createActionButton("暂停", "ghost", () => campaignAction(campaign.id, "pause"))
    );
    actions.appendChild(
      createActionButton("恢复", "ghost", () => campaignAction(campaign.id, "resume"))
    );
    actions.appendChild(
      createActionButton("取消", "ghost", () => campaignAction(campaign.id, "cancel"))
    );
    actions.appendChild(
      createActionButton("统计", "ghost", () => fetchSmsCampaignStats(campaign.id))
    );
    smsCampaignListEl.appendChild(wrapper);
  });
}

async function loadSmsCampaigns(showToastFlag = false) {
  try {
    const params = new URLSearchParams();
    const status = smsCampaignFilterEl.value.trim();
    if (status) {
      params.set("status", status);
    }
    const response = await apiFetch(`api/sms/campaigns?${params.toString()}`);
    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(data.detail || "加载活动失败");
    }
    renderSmsCampaignList(data.campaigns || []);
    if (showToastFlag) {
      showToast("活动列表已更新", "success");
    }
  } catch (error) {
    smsCampaignListEl.innerHTML = `<div class="hint">错误: ${error.message}</div>`;
    showToast(error.message || "加载活动失败", "error");
  }
}

function fillSmsCampaignForm(campaign) {
  smsCampaignIdEl.value = campaign.id || "";
  smsCampaignNameEl.value = campaign.name || "";
  smsCampaignMessageEl.value = campaign.message || "";
  smsCampaignVariantAEl.value = campaign.variant_a || "";
  smsCampaignVariantBEl.value = campaign.variant_b || "";
  smsCampaignAbSplitEl.value = campaign.ab_split || "";
  smsCampaignScheduleEl.value = formatDateTimeInput(campaign.schedule_at);
  smsCampaignFromEl.value = campaign.from_number || "";
  smsCampaignServiceEl.value = campaign.messaging_service_sid || "";
  smsCampaignRateEl.value = campaign.rate_per_minute || "";
  smsCampaignBatchEl.value = campaign.batch_size || "";
  smsCampaignAppendOptOutEl.checked = campaign.append_opt_out !== false;
  smsCampaignGroupsEl.value = (campaign.group_ids || []).join(", ");
  smsCampaignTagsEl.value = (campaign.tags || []).join(", ");
  smsCampaignRecipientsEl.value = (campaign.recipients || []).join("\n");
  if (campaign.template_id) {
    smsCampaignTemplateEl.value = String(campaign.template_id);
  } else {
    smsCampaignTemplateEl.value = "";
  }
  if (campaign.template_variables) {
    smsCampaignTemplateVarsEl.value = JSON.stringify(
      campaign.template_variables,
      null,
      2
    );
  } else {
    smsCampaignTemplateVarsEl.value = "";
  }
}

function clearSmsCampaignForm() {
  smsCampaignIdEl.value = "";
  smsCampaignNameEl.value = "";
  smsCampaignMessageEl.value = "";
  smsCampaignTemplateEl.value = "";
  smsCampaignTemplateVarsEl.value = "";
  smsCampaignVariantAEl.value = "";
  smsCampaignVariantBEl.value = "";
  smsCampaignAbSplitEl.value = "";
  smsCampaignScheduleEl.value = "";
  smsCampaignFromEl.value = "";
  smsCampaignServiceEl.value = "";
  smsCampaignRateEl.value = "";
  smsCampaignBatchEl.value = "";
  smsCampaignAppendOptOutEl.checked = true;
  smsCampaignGroupsEl.value = "";
  smsCampaignTagsEl.value = "";
  smsCampaignRecipientsEl.value = "";
}

function buildCampaignPayload(requireName) {
  const payload = {};
  const name = smsCampaignNameEl.value.trim();
  if (requireName && !name) {
    throw new Error("请输入活动名称");
  }
  if (name) {
    payload.name = name;
  }

  const message = smsCampaignMessageEl.value.trim();
  if (message) {
    payload.message = message;
  }

  const templateIdRaw = smsCampaignTemplateEl.value.trim();
  const templateId = templateIdRaw ? parseInt(templateIdRaw, 10) : null;
  if (templateId) {
    payload.template_id = templateId;
  }

  const vars = parseJsonSafe(smsCampaignTemplateVarsEl.value, "模板变量");
  if (vars !== null) {
    payload.template_variables = vars;
  }

  const variantA = smsCampaignVariantAEl.value.trim();
  const variantB = smsCampaignVariantBEl.value.trim();
  if (variantA) {
    payload.variant_a = variantA;
  }
  if (variantB) {
    payload.variant_b = variantB;
  }

  const abSplitRaw = smsCampaignAbSplitEl.value.trim();
  if (abSplitRaw) {
    const abSplit = parseInt(abSplitRaw, 10);
    if (!Number.isFinite(abSplit) || abSplit < 0 || abSplit > 100) {
      throw new Error("A 占比需为 0-100 的数字");
    }
    payload.ab_split = abSplit;
  }

  const scheduleValue = smsCampaignScheduleEl.value;
  if (scheduleValue) {
    const scheduleAt = formatDateTimeForQuery(scheduleValue);
    if (!scheduleAt) {
      throw new Error("排期时间格式不正确");
    }
    payload.schedule_at = scheduleAt;
  }

  const fromNumber = smsCampaignFromEl.value.trim();
  if (fromNumber) {
    payload.from_number = fromNumber;
  }
  const serviceSid = smsCampaignServiceEl.value.trim();
  if (serviceSid) {
    payload.messaging_service_sid = serviceSid;
  }

  const rate = parseInt(smsCampaignRateEl.value, 10);
  if (Number.isFinite(rate) && rate > 0) {
    payload.rate_per_minute = rate;
  }
  const batch = parseInt(smsCampaignBatchEl.value, 10);
  if (Number.isFinite(batch) && batch > 0) {
    payload.batch_size = batch;
  }

  payload.append_opt_out = smsCampaignAppendOptOutEl.checked;

  const groupIds = parseNumberList(smsCampaignGroupsEl.value);
  if (groupIds.length) {
    payload.group_ids = groupIds;
  }
  const tags = parseCommaList(smsCampaignTagsEl.value);
  if (tags.length) {
    payload.tags = tags;
  }
  const recipients = parseList(smsCampaignRecipientsEl.value);
  if (recipients.length) {
    payload.recipients = recipients;
  }

  if (requireName) {
    const hasVariants = variantA && variantB;
    const hasBody = message || templateId || hasVariants;
    if (!hasBody) {
      throw new Error("请填写短信内容、模板或 A/B 文案");
    }
  }

  return payload;
}

async function createSmsCampaign() {
  try {
    const payload = buildCampaignPayload(true);
    const response = await apiFetch("api/sms/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(data.detail || "创建活动失败");
    }
    fillSmsCampaignForm(data);
    setResult(smsCampaignResultEl, data);
    showToast("活动已创建", "success");
    loadSmsCampaigns(true);
  } catch (error) {
    showToast(error.message || "创建活动失败", "error");
  }
}

async function scheduleSmsCampaign(campaignId, scheduleAt, silent = false) {
  const response = await apiFetch(`api/sms/campaigns/${campaignId}/schedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ schedule_at: scheduleAt }),
  });
  const data = await readJson(response);
  if (!response.ok) {
    throw new Error(data.detail || "排期失败");
  }
  if (!silent) {
    showToast("排期已更新", "success");
  }
  return data;
}

async function updateSmsCampaign() {
  const campaignId = parseInt(smsCampaignIdEl.value, 10);
  if (!campaignId) {
    showToast("请输入活动 ID", "error");
    return;
  }
  try {
    const payload = buildCampaignPayload(false);
    const response = await apiFetch(`api/sms/campaigns/${campaignId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(data.detail || "更新活动失败");
    }
    if (payload.schedule_at) {
      await scheduleSmsCampaign(campaignId, payload.schedule_at, true);
    }
    fillSmsCampaignForm(data);
    setResult(smsCampaignResultEl, data);
    showToast("活动已更新", "success");
    loadSmsCampaigns(false);
  } catch (error) {
    showToast(error.message || "更新活动失败", "error");
  }
}

async function campaignAction(campaignId, action) {
  try {
    const response = await apiFetch(`api/sms/campaigns/${campaignId}/${action}`, {
      method: "POST",
    });
    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(data.detail || "操作失败");
    }
    setResult(smsCampaignResultEl, data);
    showToast("操作已完成", "success");
    loadSmsCampaigns(false);
  } catch (error) {
    showToast(error.message || "操作失败", "error");
  }
}

async function fetchSmsCampaignStats(campaignId) {
  try {
    const response = await apiFetch(`api/sms/campaigns/${campaignId}/stats`);
    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(data.detail || "查询统计失败");
    }
    setResult(smsCampaignStatsResultEl, data);
    showToast("统计已更新", "success");
  } catch (error) {
    showToast(error.message || "查询统计失败", "error");
  }
}

function renderSmsKeywordList(rules) {
  smsKeywordListEl.innerHTML = "";
  if (!rules.length) {
    smsKeywordListEl.innerHTML = '<div class="hint">暂无规则</div>';
    return;
  }
  rules.forEach((rule) => {
    const tags = [createTag(rule.match_type, "muted")];
    tags.push(
      createTag(rule.enabled ? "启用" : "停用", rule.enabled ? "success" : "warn")
    );
    const metaLines = [
      `ID: ${rule.id}`,
      `回复: ${truncate(rule.response_text, 80)}`,
      `更新: ${formatDateTime(rule.updated_at)}`,
    ];
    const { wrapper, actions } = createKeyItem(rule.keyword, metaLines, tags);
    actions.appendChild(
      createActionButton("编辑", "secondary", () => fillSmsKeywordForm(rule))
    );
    actions.appendChild(
      createActionButton("删除", "ghost", () => deleteSmsKeyword(rule.id))
    );
    smsKeywordListEl.appendChild(wrapper);
  });
}

async function loadSmsKeywordRules() {
  try {
    const response = await apiFetch("api/sms/keyword-rules");
    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(data.detail || "加载规则失败");
    }
    renderSmsKeywordList(data.rules || []);
  } catch (error) {
    smsKeywordListEl.innerHTML = `<div class="hint">错误: ${error.message}</div>`;
    showToast(error.message || "加载规则失败", "error");
  }
}

function fillSmsKeywordForm(rule) {
  smsKeywordIdEl.value = rule.id || "";
  smsKeywordTextEl.value = rule.keyword || "";
  smsKeywordMatchEl.value = rule.match_type || "contains";
  smsKeywordResponseEl.value = rule.response_text || "";
  smsKeywordEnabledEl.checked = rule.enabled !== false;
}

function clearSmsKeywordForm() {
  smsKeywordIdEl.value = "";
  smsKeywordTextEl.value = "";
  smsKeywordMatchEl.value = "contains";
  smsKeywordResponseEl.value = "";
  smsKeywordEnabledEl.checked = true;
}

async function createSmsKeyword() {
  const keyword = smsKeywordTextEl.value.trim();
  const responseText = smsKeywordResponseEl.value.trim();
  if (!keyword || !responseText) {
    showToast("请输入关键词和回复内容", "error");
    return;
  }
  const payload = {
    keyword,
    match_type: smsKeywordMatchEl.value,
    response_text: responseText,
    enabled: smsKeywordEnabledEl.checked,
  };
  try {
    const response = await apiFetch("api/sms/keyword-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(data.detail || "新增规则失败");
    }
    fillSmsKeywordForm(data);
    showToast("规则已创建", "success");
    loadSmsKeywordRules();
  } catch (error) {
    showToast(error.message || "新增规则失败", "error");
  }
}

async function updateSmsKeyword() {
  const ruleId = parseInt(smsKeywordIdEl.value, 10);
  if (!ruleId) {
    showToast("请输入规则 ID", "error");
    return;
  }
  const payload = {};
  const keyword = smsKeywordTextEl.value.trim();
  const responseText = smsKeywordResponseEl.value.trim();
  if (keyword) {
    payload.keyword = keyword;
  }
  if (responseText) {
    payload.response_text = responseText;
  }
  payload.match_type = smsKeywordMatchEl.value;
  payload.enabled = smsKeywordEnabledEl.checked;

  try {
    const response = await apiFetch(`api/sms/keyword-rules/${ruleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(data.detail || "更新规则失败");
    }
    fillSmsKeywordForm(data);
    showToast("规则已更新", "success");
    loadSmsKeywordRules();
  } catch (error) {
    showToast(error.message || "更新规则失败", "error");
  }
}

async function deleteSmsKeyword(ruleId) {
  const targetId = ruleId || parseInt(smsKeywordIdEl.value, 10);
  if (!targetId) {
    showToast("请输入规则 ID", "error");
    return;
  }
  try {
    const response = await apiFetch(`api/sms/keyword-rules/${targetId}`, {
      method: "DELETE",
    });
    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(data.detail || "删除规则失败");
    }
    showToast("规则已删除", "success");
    loadSmsKeywordRules();
  } catch (error) {
    showToast(error.message || "删除规则失败", "error");
  }
}

function renderSmsOptOutList(items) {
  smsOptOutListEl.innerHTML = "";
  if (!items.length) {
    smsOptOutListEl.innerHTML = '<div class="hint">暂无退订记录</div>';
    return;
  }
  items.forEach((item) => {
    const metaLines = [
      `ID: ${item.id}`,
      item.reason ? `原因: ${item.reason}` : null,
      item.source ? `来源: ${item.source}` : null,
      `时间: ${formatDateTime(item.created_at)}`,
    ];
    const { wrapper, actions } = createKeyItem(item.phone, metaLines, []);
    actions.appendChild(
      createActionButton("删除", "ghost", () => deleteSmsOptOut(item.id))
    );
    smsOptOutListEl.appendChild(wrapper);
  });
}

async function loadSmsOptOuts() {
  try {
    const response = await apiFetch("api/sms/opt-outs");
    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(data.detail || "加载退订失败");
    }
    renderSmsOptOutList(data.opt_outs || []);
  } catch (error) {
    smsOptOutListEl.innerHTML = `<div class="hint">错误: ${error.message}</div>`;
    showToast(error.message || "加载退订失败", "error");
  }
}

function clearSmsOptOutForm() {
  smsOptOutIdEl.value = "";
  smsOptOutPhoneEl.value = "";
  smsOptOutReasonEl.value = "";
  smsOptOutSourceEl.value = "";
}

async function createSmsOptOut() {
  const phone = smsOptOutPhoneEl.value.trim();
  if (!phone) {
    showToast("请输入手机号", "error");
    return;
  }
  const payload = { phone };
  const reason = smsOptOutReasonEl.value.trim();
  const source = smsOptOutSourceEl.value.trim();
  if (reason) {
    payload.reason = reason;
  }
  if (source) {
    payload.source = source;
  }
  try {
    const response = await apiFetch("api/sms/opt-outs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(data.detail || "添加退订失败");
    }
    clearSmsOptOutForm();
    showToast("退订已添加", "success");
    loadSmsOptOuts();
  } catch (error) {
    showToast(error.message || "添加退订失败", "error");
  }
}

async function deleteSmsOptOut(optOutId) {
  const targetId = optOutId || parseInt(smsOptOutIdEl.value, 10);
  if (!targetId) {
    showToast("请输入记录 ID", "error");
    return;
  }
  try {
    const response = await apiFetch(`api/sms/opt-outs/${targetId}`, {
      method: "DELETE",
    });
    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(data.detail || "删除退订失败");
    }
    showToast("退订已删除", "success");
    loadSmsOptOuts();
  } catch (error) {
    showToast(error.message || "删除退订失败", "error");
  }
}

function renderSmsBlacklist(items) {
  smsBlacklistListEl.innerHTML = "";
  if (!items.length) {
    smsBlacklistListEl.innerHTML = '<div class="hint">暂无黑名单</div>';
    return;
  }
  items.forEach((item) => {
    const metaLines = [
      `ID: ${item.id}`,
      item.reason ? `原因: ${item.reason}` : null,
      `时间: ${formatDateTime(item.created_at)}`,
    ];
    const { wrapper, actions } = createKeyItem(item.phone, metaLines, []);
    actions.appendChild(
      createActionButton("删除", "ghost", () => deleteSmsBlacklist(item.id))
    );
    smsBlacklistListEl.appendChild(wrapper);
  });
}

async function loadSmsBlacklist() {
  try {
    const response = await apiFetch("api/sms/blacklist");
    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(data.detail || "加载黑名单失败");
    }
    renderSmsBlacklist(data.blacklist || []);
  } catch (error) {
    smsBlacklistListEl.innerHTML = `<div class="hint">错误: ${error.message}</div>`;
    showToast(error.message || "加载黑名单失败", "error");
  }
}

function clearSmsBlacklistForm() {
  smsBlacklistIdEl.value = "";
  smsBlacklistPhoneEl.value = "";
  smsBlacklistReasonEl.value = "";
}

async function createSmsBlacklist() {
  const phone = smsBlacklistPhoneEl.value.trim();
  if (!phone) {
    showToast("请输入手机号", "error");
    return;
  }
  const payload = { phone };
  const reason = smsBlacklistReasonEl.value.trim();
  if (reason) {
    payload.reason = reason;
  }
  try {
    const response = await apiFetch("api/sms/blacklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(data.detail || "添加黑名单失败");
    }
    clearSmsBlacklistForm();
    showToast("黑名单已添加", "success");
    loadSmsBlacklist();
  } catch (error) {
    showToast(error.message || "添加黑名单失败", "error");
  }
}

async function deleteSmsBlacklist(recordId) {
  const targetId = recordId || parseInt(smsBlacklistIdEl.value, 10);
  if (!targetId) {
    showToast("请输入记录 ID", "error");
    return;
  }
  try {
    const response = await apiFetch(`api/sms/blacklist/${targetId}`, {
      method: "DELETE",
    });
    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(data.detail || "删除黑名单失败");
    }
    showToast("黑名单已删除", "success");
    loadSmsBlacklist();
  } catch (error) {
    showToast(error.message || "删除黑名单失败", "error");
  }
}

async function refreshSmsStats() {
  setResult(smsStatsResultEl, "加载中...");
  try {
    const params = new URLSearchParams();
    const fromValue = formatDateTimeForQuery(smsStatsFromEl.value);
    const toValue = formatDateTimeForQuery(smsStatsToEl.value);
    if (fromValue) {
      params.set("created_from", fromValue);
    }
    if (toValue) {
      params.set("created_to", toValue);
    }
    const response = await apiFetch(`api/sms/stats?${params.toString()}`);
    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(data.detail || "查询统计失败");
    }
    setResult(smsStatsResultEl, data);
    showToast("统计已更新", "success");
  } catch (error) {
    setResult(smsStatsResultEl, { error: error.message });
    showToast(error.message || "查询统计失败", "error");
  }
}

async function refreshSmsCampaignStats() {
  const campaignId = parseInt(smsCampaignStatsIdEl.value, 10);
  if (!campaignId) {
    showToast("请输入活动 ID", "error");
    return;
  }
  await fetchSmsCampaignStats(campaignId);
}

if (!getStoredApiKey()) {
  showToast("请先在 Key 管理页面设置 API Key", "info");
}

setSelectPlaceholder(smsTemplateSelect, "加载模板...");
if (smsCampaignTemplateEl) {
  setSelectPlaceholder(smsCampaignTemplateEl, "加载模板...");
}

if (smsSendForm) {
  smsSendForm.addEventListener("submit", handleSmsSend);
}

document.querySelectorAll('input[name="sms-send-mode"]').forEach((input) => {
  input.addEventListener("change", toggleSmsSendMode);
});

toggleSmsSendMode();

smsTemplateRefreshBtn.addEventListener("click", () => loadSmsTemplates(true));
smsTemplateListRefreshBtn.addEventListener("click", () => loadSmsTemplates(true));
smsTemplateCreateBtn.addEventListener("click", createSmsTemplate);
smsTemplateUpdateBtn.addEventListener("click", updateSmsTemplate);
smsTemplateDisableBtn.addEventListener("click", () =>
  disableSmsTemplate(parseInt(smsTemplateIdEl.value, 10))
);
smsTemplateEnableBtn.addEventListener("click", () =>
  enableSmsTemplate(parseInt(smsTemplateIdEl.value, 10))
);
smsTemplateClearBtn.addEventListener("click", clearSmsTemplateForm);

smsContactRefreshBtn.addEventListener("click", () => loadSmsContacts(true));
smsContactCreateBtn.addEventListener("click", createSmsContact);
smsContactUpdateBtn.addEventListener("click", updateSmsContact);
smsContactDisableBtn.addEventListener("click", () =>
  disableSmsContact(parseInt(smsContactIdEl.value, 10))
);
smsContactEnableBtn.addEventListener("click", () =>
  enableSmsContact(parseInt(smsContactIdEl.value, 10))
);
smsContactClearBtn.addEventListener("click", clearSmsContactForm);
smsContactImportBtn.addEventListener("click", importSmsContacts);
smsContactExportBtn.addEventListener("click", exportSmsContacts);

smsContactPrevBtn.addEventListener("click", () => {
  if (smsContactOffset === 0) {
    return;
  }
  smsContactOffset = Math.max(0, smsContactOffset - smsContactLimit);
  loadSmsContacts(false);
});

smsContactNextBtn.addEventListener("click", () => {
  if (!smsContactHasMore) {
    return;
  }
  smsContactOffset += smsContactLimit;
  loadSmsContacts(false);
});

smsGroupRefreshBtn.addEventListener("click", () => loadSmsGroups(true));
smsGroupCreateBtn.addEventListener("click", createSmsGroup);
smsGroupUpdateBtn.addEventListener("click", updateSmsGroup);
smsGroupDeleteBtn.addEventListener("click", () => deleteSmsGroup());
smsGroupClearBtn.addEventListener("click", clearSmsGroupForm);

smsGroupMemberAddBtn.addEventListener("click", addSmsGroupMembers);
smsGroupMemberRemoveBtn.addEventListener("click", removeSmsGroupMembers);

smsCampaignRefreshBtn.addEventListener("click", () => loadSmsCampaigns(true));
smsCampaignFilterEl.addEventListener("change", () => loadSmsCampaigns(true));
smsCampaignCreateBtn.addEventListener("click", createSmsCampaign);
smsCampaignUpdateBtn.addEventListener("click", updateSmsCampaign);
smsCampaignClearBtn.addEventListener("click", clearSmsCampaignForm);

smsKeywordCreateBtn.addEventListener("click", createSmsKeyword);
smsKeywordUpdateBtn.addEventListener("click", updateSmsKeyword);
smsKeywordDeleteBtn.addEventListener("click", () => deleteSmsKeyword());
smsKeywordClearBtn.addEventListener("click", clearSmsKeywordForm);

smsOptOutCreateBtn.addEventListener("click", createSmsOptOut);
smsOptOutDeleteBtn.addEventListener("click", () => deleteSmsOptOut());
smsOptOutRefreshBtn.addEventListener("click", loadSmsOptOuts);
smsOptOutClearBtn.addEventListener("click", clearSmsOptOutForm);

smsBlacklistCreateBtn.addEventListener("click", createSmsBlacklist);
smsBlacklistDeleteBtn.addEventListener("click", () => deleteSmsBlacklist());
smsBlacklistRefreshBtn.addEventListener("click", loadSmsBlacklist);
smsBlacklistClearBtn.addEventListener("click", clearSmsBlacklistForm);

smsStatsRefreshBtn.addEventListener("click", refreshSmsStats);
smsCampaignStatsRefreshBtn.addEventListener("click", refreshSmsCampaignStats);

loadSmsTemplates();
loadSmsContacts(true);
loadSmsGroups();
loadSmsCampaigns();
loadSmsKeywordRules();
loadSmsOptOuts();
loadSmsBlacklist();
