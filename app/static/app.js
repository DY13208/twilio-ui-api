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
const emailCampaignIdEl = document.getElementById("email-campaign-id");
const emailCampaignNameEl = document.getElementById("email-campaign-name");
const emailCampaignFromSelect = document.getElementById("email-campaign-from");
const emailCampaignRecipientsEl = document.getElementById("email-campaign-recipients");
const emailCampaignSubjectEl = document.getElementById("email-campaign-subject");
const emailCampaignTextEl = document.getElementById("email-campaign-text");
const emailCampaignHtmlEl = document.getElementById("email-campaign-html");
const emailCampaignScheduleEl = document.getElementById("email-campaign-schedule");
const emailFollowupEnabledEl = document.getElementById("email-followup-enabled");
const emailFollowupDelayEl = document.getElementById("email-followup-delay");
const emailFollowupConditionEl = document.getElementById("email-followup-condition");
const emailFollowupSubjectEl = document.getElementById("email-followup-subject");
const emailFollowupTextEl = document.getElementById("email-followup-text");
const emailFollowupHtmlEl = document.getElementById("email-followup-html");
const emailCampaignCreateBtn = document.getElementById("email-campaign-create");
const emailCampaignUpdateBtn = document.getElementById("email-campaign-update");
const emailCampaignClearBtn = document.getElementById("email-campaign-clear");
const emailCampaignFilterEl = document.getElementById("email-campaign-filter");
const emailCampaignRefreshBtn = document.getElementById("email-campaign-refresh");
const emailCampaignListEl = document.getElementById("email-campaign-list");
const emailCampaignResultEl = document.getElementById("email-campaign-result");

const customerIdEl = document.getElementById("customer-id");
const customerNameEl = document.getElementById("customer-name");
const customerEmailEl = document.getElementById("customer-email");
const customerWhatsappEl = document.getElementById("customer-whatsapp");
const customerMobileEl = document.getElementById("customer-mobile");
const customerCountryEl = document.getElementById("customer-country");
const customerCountryCodeEl = document.getElementById("customer-country-code");
const customerTagsEl = document.getElementById("customer-tags");
const customerCreateBtn = document.getElementById("customer-create");
const customerUpdateBtn = document.getElementById("customer-update");
const customerClearBtn = document.getElementById("customer-clear");
const customerSearchEl = document.getElementById("customer-search");
const customerTagFilterEl = document.getElementById("customer-tag-filter");
const customerHasMarketedEl = document.getElementById("customer-has-marketed");
const customerFilterCountryEl = document.getElementById("customer-filter-country");
const customerFilterCountryCodeEl = document.getElementById("customer-filter-country-code");
const customerRefreshBtn = document.getElementById("customer-refresh");
const customerListEl = document.getElementById("customer-list");
const customerResultEl = document.getElementById("customer-result");

const templateIdEl = document.getElementById("template-id");
const templateChannelEl = document.getElementById("template-channel");
const templateNameEl = document.getElementById("template-name");
const templateLanguageEl = document.getElementById("template-language");
const templateSubjectEl = document.getElementById("template-subject");
const templateContentEl = document.getElementById("template-content");
const templateCreateBtn = document.getElementById("template-create");
const templateUpdateBtn = document.getElementById("template-update");
const templateDeleteBtn = document.getElementById("template-delete");
const templateClearBtn = document.getElementById("template-clear");
const templateSearchEl = document.getElementById("template-search");
const templateFilterChannelEl = document.getElementById("template-filter-channel");
const templateRefreshBtn = document.getElementById("template-refresh");
const templateListEl = document.getElementById("template-list");
const templateResultEl = document.getElementById("template-result");

const marketingIdEl = document.getElementById("marketing-id");
const marketingNameEl = document.getElementById("marketing-name");
const marketingTypeEl = document.getElementById("marketing-type");
const marketingRunImmediatelyEl = document.getElementById("marketing-run-immediately");
const marketingScheduleEl = document.getElementById("marketing-schedule");
const marketingCustomerIdsEl = document.getElementById("marketing-customer-ids");
const marketingFilterRulesEl = document.getElementById("marketing-filter-rules");
const marketingCreatedByEl = document.getElementById("marketing-created-by");
const marketingCreateBtn = document.getElementById("marketing-create");
const marketingUpdateBtn = document.getElementById("marketing-update");
const marketingClearBtn = document.getElementById("marketing-clear");
const marketingStatusFilterEl = document.getElementById("marketing-status-filter");
const marketingRefreshBtn = document.getElementById("marketing-refresh");
const marketingListEl = document.getElementById("marketing-list");
const marketingResultEl = document.getElementById("marketing-result");

const stepCampaignIdEl = document.getElementById("step-campaign-id");
const stepIdEl = document.getElementById("step-id");
const stepOrderEl = document.getElementById("step-order");
const stepChannelEl = document.getElementById("step-channel");
const stepDelayEl = document.getElementById("step-delay");
const stepFilterRulesEl = document.getElementById("step-filter-rules");
const stepTemplateIdEl = document.getElementById("step-template-id");
const stepSubjectEl = document.getElementById("step-subject");
const stepContentEl = document.getElementById("step-content");
const stepContentSidEl = document.getElementById("step-content-sid");
const stepContentVarsEl = document.getElementById("step-content-vars");
const stepCreateBtn = document.getElementById("step-create");
const stepUpdateBtn = document.getElementById("step-update");
const stepDeleteBtn = document.getElementById("step-delete");
const stepClearBtn = document.getElementById("step-clear");
const stepRefreshBtn = document.getElementById("step-refresh");
const stepListEl = document.getElementById("step-list");
const stepResultEl = document.getElementById("step-result");

const statusMessageBtn = document.getElementById("status-message-btn");
const statusBatchBtn = document.getElementById("status-batch-btn");
const statusMessageIdEl = document.getElementById("status-message-id");
const statusBatchIdEl = document.getElementById("status-batch-id");
const statusTwilioBtn = document.getElementById("status-twilio-btn");
const statusTwilioIdEl = document.getElementById("status-twilio-id");
const API_KEY_STORAGE = "broadcast_api_key";
const DISPLAY_TIME_ZONE = "Asia/Shanghai";
const CHINA_UTC_OFFSET_MS = 8 * 60 * 60 * 1000;

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
let emailCampaigns = [];
let emailCampaignsLoading = false;
let customers = [];
let customersLoading = false;
let templates = [];
let templatesLoading = false;
let marketingCampaigns = [];
let marketingCampaignsLoading = false;
let campaignSteps = [];
let campaignStepsLoading = false;
let activeCampaignId = null;

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

function formatEmailSender(sender) {
  if (sender.from_name) {
    return `${sender.from_name} <${sender.from_email}>`;
  }
  return sender.from_email;
}

function updateEmailSenderSelect(selectEl, senders, selectedValue) {
  if (!selectEl) {
    return;
  }
  selectEl.innerHTML = "";
  if (!senders.length) {
    setSelectPlaceholder(selectEl, "未配置发件人");
    return;
  }
  senders.forEach((sender) => {
    const option = document.createElement("option");
    option.value = sender.from_email;
    option.textContent = formatEmailSender(sender);
    selectEl.appendChild(option);
  });
  const preferred =
    selectedValue && senders.some((sender) => sender.from_email === selectedValue)
      ? selectedValue
      : senders[0].from_email;
  selectEl.value = preferred;
}

function renderEmailSenders(senders, selectedValue) {
  updateEmailSenderSelect(emailFromSelect, senders, selectedValue);
  if (emailCampaignFromSelect) {
    const preferred = emailCampaignFromSelect.value.trim() || selectedValue || "";
    updateEmailSenderSelect(emailCampaignFromSelect, senders, preferred);
  }
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
    setSelectPlaceholder(emailCampaignFromSelect, "发件人加载失败");
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

function parseJsonInput(value, fieldName) {
  const raw = String(value || "").trim();
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      throw new Error("json");
    }
    return parsed;
  } catch (error) {
    throw new Error(`${fieldName} 必须是 JSON 对象`);
  }
}

function parseIdList(value) {
  return parseList(String(value || ""))
    .map((item) => parseInt(item, 10))
    .filter((item) => Number.isFinite(item));
}

function parseTagList(value) {
  return parseList(String(value || ""));
}

function setCustomerResult(data) {
  if (customerResultEl) {
    customerResultEl.textContent = JSON.stringify(data, null, 2);
  }
}

function setTemplateResult(data) {
  if (templateResultEl) {
    templateResultEl.textContent = JSON.stringify(data, null, 2);
  }
}

function setMarketingResult(data) {
  if (marketingResultEl) {
    marketingResultEl.textContent = JSON.stringify(data, null, 2);
  }
}

function setStepResult(data) {
  if (stepResultEl) {
    stepResultEl.textContent = JSON.stringify(data, null, 2);
  }
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

function setEmailCampaignResult(data) {
  if (!emailCampaignResultEl) {
    return;
  }
  if (typeof data === "string") {
    emailCampaignResultEl.textContent = data;
    return;
  }
  emailCampaignResultEl.textContent = JSON.stringify(data, null, 2);
}

function formatFollowupCondition(value) {
  const normalized = (value || "").toLowerCase();
  if (normalized === "opened") {
    return "已读/已打开";
  }
  if (normalized === "unopened") {
    return "未读/未打开";
  }
  if (normalized === "any") {
    return "全部";
  }
  return value || "-";
}

function formatFollowupDelay(minutes) {
  if (!minutes) {
    return "-";
  }
  const hours = Number(minutes) / 60;
  if (!Number.isFinite(hours)) {
    return "-";
  }
  return `${hours.toFixed(1)} 小时`;
}

function campaignStatusVariant(status) {
  const value = String(status || "").toLowerCase();
  if (value === "completed") {
    return "success";
  }
  if (value === "scheduled" || value === "followup" || value === "paused") {
    return "warn";
  }
  if (value === "failed" || value === "canceled") {
    return "error";
  }
  return "muted";
}

function formatEmailCampaignStatus(status) {
  const value = String(status || "").toLowerCase();
  if (value === "draft") {
    return "草稿";
  }
  if (value === "scheduled") {
    return "已排期";
  }
  if (value === "running") {
    return "进行中";
  }
  if (value === "followup") {
    return "跟进中";
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

function renderEmailCampaignList(campaigns) {
  if (!emailCampaignListEl) {
    return;
  }
  emailCampaignListEl.innerHTML = "";
  if (!campaigns.length) {
    emailCampaignListEl.innerHTML = '<div class="hint">暂无跟进流程</div>';
    return;
  }
  campaigns.forEach((campaign) => {
    const tags = [
      createTag(
        formatEmailCampaignStatus(campaign.status || "draft"),
        campaignStatusVariant(campaign.status)
      ),
    ];
    if (campaign.followup_enabled) {
      tags.push(createTag("跟进", "muted"));
    }
    if (campaign.error) {
      tags.push(createTag("错误", "error"));
    }

    const metaLines = [];
    if (campaign.subject) {
      metaLines.push(`主题: ${truncate(campaign.subject, 48)}`);
    }
    if (campaign.recipients && campaign.recipients.length) {
      metaLines.push(`收件人: ${campaign.recipients.length} 个`);
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
    if (campaign.followup_enabled) {
      metaLines.push(
        `跟进: ${formatFollowupCondition(campaign.followup_condition)} · ${formatFollowupDelay(
          campaign.followup_delay_minutes
        )}`
      );
    }
    if (campaign.error) {
      metaLines.push(`错误: ${truncate(campaign.error, 80)}`);
    }
    metaLines.push(`ID: ${campaign.id}`);

    const { wrapper, actions } = createKeyItem(campaign.name, metaLines, tags);
    actions.appendChild(
      createActionButton("编辑", "secondary", () => fillEmailCampaignForm(campaign))
    );
    actions.appendChild(
      createActionButton("启动", "ghost", () => emailCampaignAction(campaign.id, "start"))
    );
    actions.appendChild(
      createActionButton("暂停", "ghost", () => emailCampaignAction(campaign.id, "pause"))
    );
    actions.appendChild(
      createActionButton("恢复", "ghost", () => emailCampaignAction(campaign.id, "resume"))
    );
    actions.appendChild(
      createActionButton("取消", "ghost", () => emailCampaignAction(campaign.id, "cancel"))
    );
    actions.appendChild(
      createActionButton("流程", "ghost", () => fetchEmailCampaignFlow(campaign.id))
    );
    emailCampaignListEl.appendChild(wrapper);
  });
}

async function loadEmailCampaigns(showToastFlag = false) {
  if (emailCampaignsLoading) {
    return;
  }
  emailCampaignsLoading = true;
  try {
    const params = new URLSearchParams();
    if (emailCampaignFilterEl && emailCampaignFilterEl.value) {
      params.set("status", emailCampaignFilterEl.value);
    }
    const response = await apiFetch(`api/email/campaigns?${params.toString()}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "加载跟进流程失败");
    }
    emailCampaigns = data.campaigns || [];
    renderEmailCampaignList(emailCampaigns);
    if (showToastFlag) {
      showToast(`跟进流程已更新（${emailCampaigns.length}）`, "success");
    }
  } catch (error) {
    if (emailCampaignListEl) {
      emailCampaignListEl.innerHTML = `<div class="hint">错误: ${error.message}</div>`;
    }
    showToast(error.message || "加载跟进流程失败", "error");
  } finally {
    emailCampaignsLoading = false;
  }
}

function fillEmailCampaignForm(campaign) {
  if (!campaign) {
    return;
  }
  if (emailCampaignIdEl) {
    emailCampaignIdEl.value = campaign.id || "";
  }
  if (emailCampaignNameEl) {
    emailCampaignNameEl.value = campaign.name || "";
  }
  if (emailCampaignFromSelect && campaign.from_email) {
    emailCampaignFromSelect.value = campaign.from_email;
  }
  if (emailCampaignRecipientsEl) {
    emailCampaignRecipientsEl.value = (campaign.recipients || []).join("\n");
  }
  if (emailCampaignSubjectEl) {
    emailCampaignSubjectEl.value = campaign.subject || "";
  }
  if (emailCampaignTextEl) {
    emailCampaignTextEl.value = campaign.text || "";
  }
  if (emailCampaignHtmlEl) {
    emailCampaignHtmlEl.value = campaign.html || "";
  }
  if (emailCampaignScheduleEl) {
    emailCampaignScheduleEl.value = formatDateTimeInput(campaign.schedule_at);
  }
  if (emailFollowupEnabledEl) {
    emailFollowupEnabledEl.checked = campaign.followup_enabled === true;
  }
  if (emailFollowupDelayEl) {
    emailFollowupDelayEl.value = campaign.followup_delay_minutes
      ? String(campaign.followup_delay_minutes / 60)
      : "";
  }
  if (emailFollowupConditionEl) {
    emailFollowupConditionEl.value = campaign.followup_condition || "unopened";
  }
  if (emailFollowupSubjectEl) {
    emailFollowupSubjectEl.value = campaign.followup_subject || "";
  }
  if (emailFollowupTextEl) {
    emailFollowupTextEl.value = campaign.followup_text || "";
  }
  if (emailFollowupHtmlEl) {
    emailFollowupHtmlEl.value = campaign.followup_html || "";
  }
}

function clearEmailCampaignForm() {
  if (emailCampaignIdEl) {
    emailCampaignIdEl.value = "";
  }
  if (emailCampaignNameEl) {
    emailCampaignNameEl.value = "";
  }
  if (emailCampaignRecipientsEl) {
    emailCampaignRecipientsEl.value = "";
  }
  if (emailCampaignSubjectEl) {
    emailCampaignSubjectEl.value = "";
  }
  if (emailCampaignTextEl) {
    emailCampaignTextEl.value = "";
  }
  if (emailCampaignHtmlEl) {
    emailCampaignHtmlEl.value = "";
  }
  if (emailCampaignScheduleEl) {
    emailCampaignScheduleEl.value = "";
  }
  if (emailFollowupEnabledEl) {
    emailFollowupEnabledEl.checked = false;
  }
  if (emailFollowupDelayEl) {
    emailFollowupDelayEl.value = "";
  }
  if (emailFollowupConditionEl) {
    emailFollowupConditionEl.value = "unopened";
  }
  if (emailFollowupSubjectEl) {
    emailFollowupSubjectEl.value = "";
  }
  if (emailFollowupTextEl) {
    emailFollowupTextEl.value = "";
  }
  if (emailFollowupHtmlEl) {
    emailFollowupHtmlEl.value = "";
  }
}

function buildEmailCampaignPayload(requireName) {
  const payload = {};
  const name = emailCampaignNameEl ? emailCampaignNameEl.value.trim() : "";
  if (requireName && !name) {
    throw new Error("请输入流程名称");
  }
  if (name) {
    payload.name = name;
  }

  const fromEmail = emailCampaignFromSelect ? emailCampaignFromSelect.value.trim() : "";
  if (requireName && !fromEmail) {
    throw new Error("请选择发件人");
  }
  if (fromEmail) {
    payload.from_email = fromEmail;
  }

  const recipients = emailCampaignRecipientsEl
    ? parseList(emailCampaignRecipientsEl.value)
    : [];
  if (requireName && !recipients.length) {
    throw new Error("请输入收件人列表");
  }
  if (recipients.length) {
    payload.recipients = recipients;
  }

  const subject = emailCampaignSubjectEl ? emailCampaignSubjectEl.value.trim() : "";
  if (requireName && !subject) {
    throw new Error("请输入邮件主题");
  }
  if (subject) {
    payload.subject = subject;
  }

  const text = emailCampaignTextEl ? emailCampaignTextEl.value.trim() : "";
  const html = emailCampaignHtmlEl ? emailCampaignHtmlEl.value.trim() : "";
  if (requireName && !text && !html) {
    throw new Error("请输入正文内容或 HTML");
  }
  if (text) {
    payload.text = text;
  }
  if (html) {
    payload.html = html;
  }

  const scheduleValue = emailCampaignScheduleEl ? emailCampaignScheduleEl.value : "";
  if (scheduleValue) {
    const scheduleAt = formatDateTimeForQuery(scheduleValue);
    if (!scheduleAt) {
      throw new Error("排期时间格式不正确");
    }
    payload.schedule_at = scheduleAt;
  }

  const hasFollowupInput =
    (emailFollowupDelayEl && emailFollowupDelayEl.value.trim()) ||
    (emailFollowupSubjectEl && emailFollowupSubjectEl.value.trim()) ||
    (emailFollowupTextEl && emailFollowupTextEl.value.trim()) ||
    (emailFollowupHtmlEl && emailFollowupHtmlEl.value.trim());

  if (emailFollowupEnabledEl && emailFollowupEnabledEl.checked) {
    payload.followup_enabled = true;
    const delayHours = emailFollowupDelayEl
      ? parseFloat(emailFollowupDelayEl.value)
      : 0;
    if (!Number.isFinite(delayHours) || delayHours <= 0) {
      throw new Error("请输入有效的跟进延迟");
    }
    payload.followup_delay_minutes = Math.round(delayHours * 60);
    payload.followup_condition = emailFollowupConditionEl
      ? emailFollowupConditionEl.value
      : "unopened";

    const followupSubject = emailFollowupSubjectEl
      ? emailFollowupSubjectEl.value.trim()
      : "";
    if (!followupSubject) {
      throw new Error("请输入跟进主题");
    }
    payload.followup_subject = followupSubject;

    const followupText = emailFollowupTextEl ? emailFollowupTextEl.value.trim() : "";
    const followupHtml = emailFollowupHtmlEl ? emailFollowupHtmlEl.value.trim() : "";
    if (!followupText && !followupHtml) {
      throw new Error("请输入跟进内容或 HTML");
    }
    if (followupText) {
      payload.followup_text = followupText;
    }
    if (followupHtml) {
      payload.followup_html = followupHtml;
    }
  } else if (requireName || hasFollowupInput) {
    payload.followup_enabled = false;
  }

  return payload;
}

async function createEmailCampaign() {
  try {
    const payload = buildEmailCampaignPayload(true);
    const response = await apiFetch("api/email/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "创建跟进流程失败");
    }
    fillEmailCampaignForm(data);
    setEmailCampaignResult(data);
    showToast("跟进流程已创建", "success");
    loadEmailCampaigns(true);
  } catch (error) {
    showToast(error.message || "创建跟进流程失败", "error");
  }
}

async function scheduleEmailCampaign(campaignId, scheduleAt, silent = false) {
  const response = await apiFetch(`api/email/campaigns/${campaignId}/schedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ schedule_at: scheduleAt }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "排期失败");
  }
  if (!silent) {
    showToast("排期已更新", "success");
  }
  return data;
}

async function updateEmailCampaign() {
  const campaignId = emailCampaignIdEl ? parseInt(emailCampaignIdEl.value, 10) : 0;
  if (!campaignId) {
    showToast("请输入流程 ID", "error");
    return;
  }
  try {
    const payload = buildEmailCampaignPayload(false);
    const response = await apiFetch(`api/email/campaigns/${campaignId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "更新跟进流程失败");
    }
    if (payload.schedule_at) {
      await scheduleEmailCampaign(campaignId, payload.schedule_at, true);
    }
    fillEmailCampaignForm(data);
    setEmailCampaignResult(data);
    showToast("跟进流程已更新", "success");
    loadEmailCampaigns(false);
  } catch (error) {
    showToast(error.message || "更新跟进流程失败", "error");
  }
}

async function emailCampaignAction(campaignId, action) {
  try {
    const response = await apiFetch(`api/email/campaigns/${campaignId}/${action}`, {
      method: "POST",
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "操作失败");
    }
    setEmailCampaignResult(data);
    showToast("操作已完成", "success");
    loadEmailCampaigns(false);
  } catch (error) {
    showToast(error.message || "操作失败", "error");
  }
}

async function fetchEmailCampaignFlow(campaignId) {
  try {
    const response = await apiFetch(`api/email/campaigns/${campaignId}/flow`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "获取跟进流程失败");
    }
    setEmailCampaignResult(data);
    showToast("流程已加载", "success");
  } catch (error) {
    showToast(error.message || "获取跟进流程失败", "error");
  }
}

function messageStatusVariant(status) {
  const value = (status || "").toLowerCase();
  if (!value) {
    return "muted";
  }
  if (
    value.includes("not") &&
    (value.includes("reply") || value.includes("open") || value.includes("read"))
  ) {
    return "muted";
  }
  if (value.includes("reply")) {
    return "success";
  }
  if (value.includes("open") || value.includes("read")) {
    return "warn";
  }
  if (value.includes("fail") || value.includes("bounce") || value.includes("drop")) {
    return "error";
  }
  return "muted";
}

function formatMessageStatus(status) {
  const raw = String(status || "").trim();
  if (!raw) {
    return "";
  }
  const value = raw.toLowerCase();
  if (value.includes("not") && value.includes("reply")) {
    return "未回复";
  }
  if (value.includes("not") && (value.includes("open") || value.includes("read"))) {
    return "未打开";
  }
  if (value.includes("not") && value.includes("sent")) {
    return "未发送";
  }
  if (value.includes("unsubscribe")) {
    return "退订";
  }
  if (value.includes("spam")) {
    return "垃圾邮件";
  }
  if (value.includes("bounce")) {
    return "退回";
  }
  if (value.includes("fail") || value.includes("drop")) {
    return "失败";
  }
  if (value.includes("reply")) {
    return "已回复";
  }
  if (value.includes("open") || value.includes("read")) {
    return "已打开";
  }
  if (value.includes("deliver")) {
    return "已送达";
  }
  if (value.includes("sent")) {
    return "已发送";
  }
  if (value.includes("queue")) {
    return "排队";
  }
  if (value.includes("accept")) {
    return "已接收";
  }
  if (value.includes("process")) {
    return "已处理";
  }
  if (value.includes("block")) {
    return "已拦截";
  }
  return raw;
}

function campaignStatusVariant(status) {
  const value = (status || "").toLowerCase();
  if (value.includes("running")) {
    return "success";
  }
  if (value.includes("stop")) {
    return "error";
  }
  if (value.includes("finish")) {
    return "muted";
  }
  if (value.includes("draft")) {
    return "warn";
  }
  return "muted";
}

function formatCampaignStatus(status) {
  const raw = String(status || "").trim();
  if (!raw) {
    return "草稿";
  }
  const value = raw.toLowerCase();
  if (value.includes("draft")) {
    return "草稿";
  }
  if (value.includes("running")) {
    return "执行中";
  }
  if (value.includes("finish")) {
    return "已完成";
  }
  if (value.includes("stop")) {
    return "已停止";
  }
  return raw;
}

function formatChannelLabel(channel) {
  const raw = String(channel || "").trim();
  if (!raw) {
    return "";
  }
  const value = raw.toUpperCase();
  if (value === "EMAIL") {
    return "邮件";
  }
  if (value === "WHATSAPP") {
    return "WhatsApp";
  }
  if (value === "SMS") {
    return "短信";
  }
  if (value === "MIXED") {
    return "混合";
  }
  return raw;
}

function renderCustomerList(items) {
  if (!customerListEl) {
    return;
  }
  customerListEl.innerHTML = "";
  if (!items.length) {
    customerListEl.innerHTML = '<div class="hint">暂无客户。</div>';
    return;
  }
  items.forEach((customer) => {
    const title =
      customer.name ||
      customer.email ||
      customer.whatsapp ||
      customer.mobile ||
      `客户 ${customer.id}`;
    const metaLines = [];
    if (customer.email) {
      metaLines.push(`邮箱: ${customer.email}`);
    }
    if (customer.whatsapp) {
      metaLines.push(`WhatsApp: ${customer.whatsapp}`);
    }
    if (customer.mobile) {
      metaLines.push(`手机号: ${customer.mobile}`);
    }
    if (customer.country || customer.country_code) {
      metaLines.push(
        `国家: ${customer.country || "-"} ${customer.country_code || ""}`.trim()
      );
    }
    if (customer.tags && customer.tags.length) {
      metaLines.push(`标签: ${customer.tags.join(", ")}`);
    }
    metaLines.push(`ID: ${customer.id}`);

    const tags = [];
    tags.push(
      createTag(
        customer.has_marketed ? "已营销" : "未营销",
        customer.has_marketed ? "success" : "muted"
      )
    );
    if (customer.last_email_status) {
      tags.push(
        createTag(
          `邮件:${formatMessageStatus(customer.last_email_status)}`,
          messageStatusVariant(customer.last_email_status)
        )
      );
    }
    if (customer.last_whatsapp_status) {
      tags.push(
        createTag(
          `WhatsApp:${formatMessageStatus(customer.last_whatsapp_status)}`,
          messageStatusVariant(customer.last_whatsapp_status)
        )
      );
    }
    if (customer.last_sms_status) {
      tags.push(
        createTag(
          `短信:${formatMessageStatus(customer.last_sms_status)}`,
          messageStatusVariant(customer.last_sms_status)
        )
      );
    }

    const { wrapper, actions } = createKeyItem(title, metaLines, tags);
    actions.appendChild(
      createActionButton("编辑", "secondary", () => fillCustomerForm(customer))
    );
    actions.appendChild(
      createActionButton("删除", "ghost", () => deleteCustomer(customer.id))
    );
    customerListEl.appendChild(wrapper);
  });
}

async function loadCustomers(showToastFlag = false) {
  if (customersLoading) {
    return;
  }
  customersLoading = true;
  try {
    const params = new URLSearchParams();
    const search = customerSearchEl ? customerSearchEl.value.trim() : "";
    if (search) {
      params.set("search", search);
    }
    const tag = customerTagFilterEl ? customerTagFilterEl.value.trim() : "";
    if (tag) {
      params.set("tag", tag);
    }
    if (customerHasMarketedEl && customerHasMarketedEl.value !== "") {
      params.set("has_marketed", customerHasMarketedEl.value);
    }
    const country = customerFilterCountryEl ? customerFilterCountryEl.value.trim() : "";
    if (country) {
      params.set("country", country);
    }
    const countryCode = customerFilterCountryCodeEl
      ? customerFilterCountryCodeEl.value.trim()
      : "";
    if (countryCode) {
      params.set("country_code", countryCode);
    }

    const response = await apiFetch(`api/customers?${params.toString()}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "加载客户失败");
    }
    customers = data.customers || [];
    renderCustomerList(customers);
    if (showToastFlag) {
      showToast(`客户已更新（${customers.length}）`, "success");
    }
  } catch (error) {
    if (customerListEl) {
      customerListEl.innerHTML = `<div class="hint">错误: ${error.message}</div>`;
    }
    showToast(error.message || "加载客户失败", "error");
  } finally {
    customersLoading = false;
  }
}

function fillCustomerForm(customer) {
  if (!customer) {
    return;
  }
  if (customerIdEl) {
    customerIdEl.value = customer.id || "";
  }
  if (customerNameEl) {
    customerNameEl.value = customer.name || "";
  }
  if (customerEmailEl) {
    customerEmailEl.value = customer.email || "";
  }
  if (customerWhatsappEl) {
    customerWhatsappEl.value = customer.whatsapp || "";
  }
  if (customerMobileEl) {
    customerMobileEl.value = customer.mobile || "";
  }
  if (customerCountryEl) {
    customerCountryEl.value = customer.country || "";
  }
  if (customerCountryCodeEl) {
    customerCountryCodeEl.value = customer.country_code || "";
  }
  if (customerTagsEl) {
    customerTagsEl.value = (customer.tags || []).join(", ");
  }
}

function clearCustomerForm() {
  if (customerIdEl) {
    customerIdEl.value = "";
  }
  if (customerNameEl) {
    customerNameEl.value = "";
  }
  if (customerEmailEl) {
    customerEmailEl.value = "";
  }
  if (customerWhatsappEl) {
    customerWhatsappEl.value = "";
  }
  if (customerMobileEl) {
    customerMobileEl.value = "";
  }
  if (customerCountryEl) {
    customerCountryEl.value = "";
  }
  if (customerCountryCodeEl) {
    customerCountryCodeEl.value = "";
  }
  if (customerTagsEl) {
    customerTagsEl.value = "";
  }
}

function buildCustomerPayload(requireContact, includeEmpty = false) {
  const payload = {};
  const name = customerNameEl ? customerNameEl.value.trim() : "";
  if (includeEmpty || name) {
    payload.name = name;
  }
  const email = customerEmailEl ? customerEmailEl.value.trim() : "";
  if (includeEmpty || email) {
    payload.email = email;
  }
  const whatsapp = customerWhatsappEl ? customerWhatsappEl.value.trim() : "";
  if (includeEmpty || whatsapp) {
    payload.whatsapp = whatsapp;
  }
  const mobile = customerMobileEl ? customerMobileEl.value.trim() : "";
  if (includeEmpty || mobile) {
    payload.mobile = mobile;
  }
  const country = customerCountryEl ? customerCountryEl.value.trim() : "";
  if (includeEmpty || country) {
    payload.country = country;
  }
  const countryCode = customerCountryCodeEl ? customerCountryCodeEl.value.trim() : "";
  if (includeEmpty || countryCode) {
    payload.country_code = countryCode;
  }
  const tags = customerTagsEl ? parseTagList(customerTagsEl.value) : [];
  if (includeEmpty || tags.length) {
    payload.tags = tags;
  }

  if (requireContact && !email && !whatsapp && !mobile) {
    throw new Error("邮箱、WhatsApp 或手机号至少填写一个");
  }
  return payload;
}

async function createCustomer() {
  try {
    const payload = buildCustomerPayload(true, false);
    const response = await apiFetch("api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "创建客户失败");
    }
    setCustomerResult(data);
    fillCustomerForm(data);
    showToast("客户已创建", "success");
    loadCustomers(true);
  } catch (error) {
    showToast(error.message || "创建客户失败", "error");
  }
}

async function updateCustomer() {
  const customerId = customerIdEl ? parseInt(customerIdEl.value, 10) : 0;
  if (!customerId) {
    showToast("客户ID不能为空", "error");
    return;
  }
  try {
    const payload = buildCustomerPayload(true, true);
    const response = await apiFetch(`api/customers/${customerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "更新客户失败");
    }
    setCustomerResult(data);
    fillCustomerForm(data);
    showToast("客户已更新", "success");
    loadCustomers(false);
  } catch (error) {
    showToast(error.message || "更新客户失败", "error");
  }
}

async function deleteCustomer(customerId) {
  if (!customerId) {
    return;
  }
  try {
    const response = await apiFetch(`api/customers/${customerId}`, {
      method: "DELETE",
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "删除客户失败");
    }
    setCustomerResult(data);
    showToast("客户已删除", "success");
    loadCustomers(false);
  } catch (error) {
    showToast(error.message || "删除客户失败", "error");
  }
}

function renderTemplateList(items) {
  if (!templateListEl) {
    return;
  }
  templateListEl.innerHTML = "";
  if (!items.length) {
    templateListEl.innerHTML = '<div class="hint">暂无模板。</div>';
    return;
  }
  items.forEach((template) => {
    const title = template.name || `模板 ${template.id}`;
    const metaLines = [];
    if (template.subject) {
      metaLines.push(`标题: ${truncate(template.subject, 60)}`);
    }
    if (template.content) {
      metaLines.push(`内容: ${truncate(template.content, 80)}`);
    }
    metaLines.push(`ID: ${template.id}`);

    const tags = [];
    if (template.channel) {
      tags.push(createTag(formatChannelLabel(template.channel), "muted"));
    }
    if (template.language) {
      tags.push(createTag(template.language, "muted"));
    }

    const { wrapper, actions } = createKeyItem(title, metaLines, tags);
    actions.appendChild(
      createActionButton("编辑", "secondary", () => fillTemplateForm(template))
    );
    actions.appendChild(
      createActionButton("删除", "ghost", () => deleteTemplate(template.id))
    );
    templateListEl.appendChild(wrapper);
  });
}

async function loadTemplates(showToastFlag = false) {
  if (templatesLoading) {
    return;
  }
  templatesLoading = true;
  try {
    const params = new URLSearchParams();
    if (templateFilterChannelEl && templateFilterChannelEl.value) {
      params.set("channel", templateFilterChannelEl.value);
    }
    const response = await apiFetch(`api/templates?${params.toString()}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "加载模板失败");
    }
    templates = data.templates || [];
    const search = templateSearchEl ? templateSearchEl.value.trim().toLowerCase() : "";
    const filtered = search
      ? templates.filter((item) => {
          const name = (item.name || "").toLowerCase();
          const subject = (item.subject || "").toLowerCase();
          return name.includes(search) || subject.includes(search);
        })
      : templates;
    renderTemplateList(filtered);
    if (showToastFlag) {
      showToast(`模板已更新（${filtered.length}）`, "success");
    }
  } catch (error) {
    if (templateListEl) {
      templateListEl.innerHTML = `<div class="hint">错误: ${error.message}</div>`;
    }
    showToast(error.message || "加载模板失败", "error");
  } finally {
    templatesLoading = false;
  }
}

function fillTemplateForm(template) {
  if (!template) {
    return;
  }
  if (templateIdEl) {
    templateIdEl.value = template.id || "";
  }
  if (templateChannelEl) {
    templateChannelEl.value = template.channel || "EMAIL";
  }
  if (templateNameEl) {
    templateNameEl.value = template.name || "";
  }
  if (templateLanguageEl) {
    templateLanguageEl.value = template.language || "";
  }
  if (templateSubjectEl) {
    templateSubjectEl.value = template.subject || "";
  }
  if (templateContentEl) {
    templateContentEl.value = template.content || "";
  }
}

function clearTemplateForm() {
  if (templateIdEl) {
    templateIdEl.value = "";
  }
  if (templateChannelEl) {
    templateChannelEl.value = "EMAIL";
  }
  if (templateNameEl) {
    templateNameEl.value = "";
  }
  if (templateLanguageEl) {
    templateLanguageEl.value = "";
  }
  if (templateSubjectEl) {
    templateSubjectEl.value = "";
  }
  if (templateContentEl) {
    templateContentEl.value = "";
  }
}

function buildTemplatePayload(requireName, includeEmpty = false) {
  const payload = {};
  const channel = templateChannelEl ? templateChannelEl.value.trim() : "";
  const name = templateNameEl ? templateNameEl.value.trim() : "";
  if (requireName && !name) {
    throw new Error("模板名称不能为空");
  }
  if (channel) {
    payload.channel = channel;
  }
  if (includeEmpty || name) {
    payload.name = name;
  }
  const language = templateLanguageEl ? templateLanguageEl.value.trim() : "";
  if (includeEmpty || language) {
    payload.language = language;
  }
  const subject = templateSubjectEl ? templateSubjectEl.value.trim() : "";
  if (includeEmpty || subject) {
    payload.subject = subject;
  }
  const content = templateContentEl ? templateContentEl.value : "";
  if (includeEmpty || content) {
    payload.content = content;
  }
  return payload;
}

async function createTemplate() {
  try {
    const payload = buildTemplatePayload(true, false);
    const response = await apiFetch("api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "创建模板失败");
    }
    setTemplateResult(data);
    fillTemplateForm(data);
    showToast("模板已创建", "success");
    loadTemplates(true);
  } catch (error) {
    showToast(error.message || "创建模板失败", "error");
  }
}

async function updateTemplate() {
  const templateId = templateIdEl ? parseInt(templateIdEl.value, 10) : 0;
  if (!templateId) {
    showToast("模板ID不能为空", "error");
    return;
  }
  try {
    const payload = buildTemplatePayload(false, true);
    const response = await apiFetch(`api/templates/${templateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "更新模板失败");
    }
    setTemplateResult(data);
    fillTemplateForm(data);
    showToast("模板已更新", "success");
    loadTemplates(false);
  } catch (error) {
    showToast(error.message || "更新模板失败", "error");
  }
}

async function deleteTemplate(templateId) {
  if (!templateId) {
    return;
  }
  try {
    const response = await apiFetch(`api/templates/${templateId}`, {
      method: "DELETE",
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "删除模板失败");
    }
    setTemplateResult(data);
    showToast("模板已删除", "success");
    loadTemplates(false);
  } catch (error) {
    showToast(error.message || "删除模板失败", "error");
  }
}

function renderMarketingCampaignList(items) {
  if (!marketingListEl) {
    return;
  }
  marketingListEl.innerHTML = "";
  if (!items.length) {
    marketingListEl.innerHTML = '<div class="hint">暂无营销计划。</div>';
    return;
  }
  items.forEach((campaign) => {
    const title = campaign.name || `营销计划 ${campaign.id}`;
    const replyCount =
      (campaign.email_replied_count || 0) +
      (campaign.whatsapp_replied_count || 0) +
      (campaign.sms_replied_count || 0);
    const metaLines = [
      `ID: ${campaign.id}`,
      `类型: ${formatChannelLabel(campaign.type)}`,
      `客户数: ${campaign.total_customers || 0}`,
      `触达: ${campaign.delivered_count || 0}`,
      `回复: ${replyCount}`,
    ];
    if (campaign.schedule_time) {
      metaLines.push(`定时: ${formatDateTime(campaign.schedule_time)}`);
    }
    if (campaign.started_at) {
      metaLines.push(`开始: ${formatDateTime(campaign.started_at)}`);
    }
    if (campaign.completed_at) {
      metaLines.push(`完成: ${formatDateTime(campaign.completed_at)}`);
    }
    if (campaign.filter_rules) {
      metaLines.push(`筛选: ${truncate(JSON.stringify(campaign.filter_rules), 80)}`);
    }

    const tags = [
      createTag(
        formatCampaignStatus(campaign.status || "DRAFT"),
        campaignStatusVariant(campaign.status)
      ),
    ];
    if (campaign.type) {
      tags.push(createTag(formatChannelLabel(campaign.type), "muted"));
    }

    const { wrapper, actions } = createKeyItem(title, metaLines, tags);
    actions.appendChild(
      createActionButton("编辑", "secondary", () => fillMarketingForm(campaign))
    );
    actions.appendChild(
      createActionButton("启动", "ghost", () => marketingCampaignAction(campaign.id, "start"))
    );
    actions.appendChild(
      createActionButton("停止", "ghost", () => marketingCampaignAction(campaign.id, "stop"))
    );
    actions.appendChild(
      createActionButton("步骤", "ghost", () => {
        activeCampaignId = campaign.id;
        if (stepCampaignIdEl) {
          stepCampaignIdEl.value = String(campaign.id);
        }
        loadCampaignSteps(campaign.id, true);
      })
    );
    marketingListEl.appendChild(wrapper);
  });
}

async function loadMarketingCampaigns(showToastFlag = false) {
  if (marketingCampaignsLoading) {
    return;
  }
  marketingCampaignsLoading = true;
  try {
    const params = new URLSearchParams();
    if (marketingStatusFilterEl && marketingStatusFilterEl.value) {
      params.set("status", marketingStatusFilterEl.value);
    }
    const response = await apiFetch(`api/marketing/campaigns?${params.toString()}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "加载营销计划失败");
    }
    marketingCampaigns = data.campaigns || [];
    renderMarketingCampaignList(marketingCampaigns);
    if (showToastFlag) {
      showToast(`营销计划已更新（${marketingCampaigns.length}）`, "success");
    }
  } catch (error) {
    if (marketingListEl) {
      marketingListEl.innerHTML = `<div class="hint">错误: ${error.message}</div>`;
    }
    showToast(error.message || "加载营销计划失败", "error");
  } finally {
    marketingCampaignsLoading = false;
  }
}

function fillMarketingForm(campaign) {
  if (!campaign) {
    return;
  }
  if (marketingIdEl) {
    marketingIdEl.value = campaign.id || "";
  }
  if (marketingNameEl) {
    marketingNameEl.value = campaign.name || "";
  }
  if (marketingTypeEl) {
    marketingTypeEl.value = campaign.type || "MIXED";
  }
  if (marketingRunImmediatelyEl) {
    marketingRunImmediatelyEl.checked = campaign.run_immediately === true;
  }
  if (marketingScheduleEl) {
    marketingScheduleEl.value = formatDateTimeInput(campaign.schedule_time);
  }
  if (marketingCustomerIdsEl) {
    marketingCustomerIdsEl.value = (campaign.customer_ids || []).join(", ");
  }
  if (marketingFilterRulesEl) {
    marketingFilterRulesEl.value = campaign.filter_rules
      ? JSON.stringify(campaign.filter_rules, null, 2)
      : "";
  }
  if (marketingCreatedByEl) {
    marketingCreatedByEl.value = campaign.created_by || "";
  }
  if (stepCampaignIdEl) {
    stepCampaignIdEl.value = String(campaign.id || "");
  }
  activeCampaignId = campaign.id || null;
}

function clearMarketingForm() {
  if (marketingIdEl) {
    marketingIdEl.value = "";
  }
  if (marketingNameEl) {
    marketingNameEl.value = "";
  }
  if (marketingTypeEl) {
    marketingTypeEl.value = "MIXED";
  }
  if (marketingRunImmediatelyEl) {
    marketingRunImmediatelyEl.checked = true;
  }
  if (marketingScheduleEl) {
    marketingScheduleEl.value = "";
  }
  if (marketingCustomerIdsEl) {
    marketingCustomerIdsEl.value = "";
  }
  if (marketingFilterRulesEl) {
    marketingFilterRulesEl.value = "";
  }
  if (marketingCreatedByEl) {
    marketingCreatedByEl.value = "";
  }
  if (stepCampaignIdEl) {
    stepCampaignIdEl.value = "";
  }
  activeCampaignId = null;
}

function buildMarketingPayload(requireName, includeEmpty = false) {
  const payload = {};
  const name = marketingNameEl ? marketingNameEl.value.trim() : "";
  if (requireName && !name) {
    throw new Error("计划名称不能为空");
  }
  if (includeEmpty || name) {
    payload.name = name;
  }
  const type = marketingTypeEl ? marketingTypeEl.value.trim() : "";
  if (type) {
    payload.type = type;
  }
  if (marketingRunImmediatelyEl) {
    payload.run_immediately = marketingRunImmediatelyEl.checked;
  }
  if (marketingScheduleEl) {
    const scheduleValue = marketingScheduleEl.value.trim();
    if (scheduleValue) {
      const scheduleAt = formatDateTimeForQuery(scheduleValue);
      if (!scheduleAt) {
        throw new Error("定时执行时间格式不正确");
      }
      payload.schedule_time = scheduleAt;
    } else if (includeEmpty) {
      payload.schedule_time = null;
    }
  }
  if (marketingCustomerIdsEl) {
    const ids = parseIdList(marketingCustomerIdsEl.value);
    if (includeEmpty || ids.length) {
      payload.customer_ids = ids;
    }
  }
  if (marketingFilterRulesEl) {
    const raw = marketingFilterRulesEl.value.trim();
    if (raw) {
      payload.filter_rules = parseJsonInput(raw, "筛选规则");
    } else if (includeEmpty) {
      payload.filter_rules = {};
    }
  }
  if (marketingCreatedByEl) {
    const createdBy = marketingCreatedByEl.value.trim();
    if (includeEmpty || createdBy) {
      payload.created_by = createdBy;
    }
  }
  return payload;
}

async function createMarketingCampaign() {
  try {
    const payload = buildMarketingPayload(true, false);
    const response = await apiFetch("api/marketing/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "创建计划失败");
    }
    setMarketingResult(data);
    fillMarketingForm(data);
    showToast("计划已创建", "success");
    loadMarketingCampaigns(true);
  } catch (error) {
    showToast(error.message || "创建计划失败", "error");
  }
}

async function updateMarketingCampaign() {
  const campaignId = marketingIdEl ? parseInt(marketingIdEl.value, 10) : 0;
  if (!campaignId) {
    showToast("计划ID不能为空", "error");
    return;
  }
  try {
    const payload = buildMarketingPayload(false, true);
    const response = await apiFetch(`api/marketing/campaigns/${campaignId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "更新计划失败");
    }
    setMarketingResult(data);
    fillMarketingForm(data);
    showToast("计划已更新", "success");
    loadMarketingCampaigns(false);
  } catch (error) {
    showToast(error.message || "更新计划失败", "error");
  }
}

async function marketingCampaignAction(campaignId, action) {
  if (!campaignId) {
    return;
  }
  try {
    const response = await apiFetch(`api/marketing/campaigns/${campaignId}/${action}`, {
      method: "POST",
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "计划操作失败");
    }
    setMarketingResult(data);
    showToast("计划已更新", "success");
    loadMarketingCampaigns(false);
  } catch (error) {
    showToast(error.message || "计划操作失败", "error");
  }
}

function renderCampaignSteps(items) {
  if (!stepListEl) {
    return;
  }
  stepListEl.innerHTML = "";
  if (!items.length) {
    stepListEl.innerHTML = '<div class="hint">暂无步骤。</div>';
    return;
  }
  items.forEach((step) => {
    const title = `步骤 ${step.order_no} · ${formatChannelLabel(step.channel)}`;
    const metaLines = [
      `ID: ${step.id}`,
      `延迟: ${step.delay_days || 0} 天`,
    ];
    if (step.template_id) {
      metaLines.push(`模板: ${step.template_id}`);
    }
    if (step.subject) {
      metaLines.push(`主题: ${truncate(step.subject, 60)}`);
    }
    if (step.content) {
      metaLines.push(`内容: ${truncate(step.content, 80)}`);
    }
    if (step.filter_rules) {
      metaLines.push(`筛选: ${truncate(JSON.stringify(step.filter_rules), 80)}`);
    }

    const tags = [createTag(formatChannelLabel(step.channel), "muted")];
    const { wrapper, actions } = createKeyItem(title, metaLines, tags);
    actions.appendChild(
      createActionButton("编辑", "secondary", () => fillStepForm(step))
    );
    actions.appendChild(
      createActionButton("删除", "ghost", () => deleteCampaignStep(step.id))
    );
    stepListEl.appendChild(wrapper);
  });
}

async function loadCampaignSteps(campaignId, showToastFlag = false) {
  const resolvedId =
    campaignId ||
    (stepCampaignIdEl ? parseInt(stepCampaignIdEl.value, 10) : 0) ||
    activeCampaignId;
  if (!resolvedId) {
    showToast("步骤需要计划ID", "error");
    return;
  }
  if (campaignStepsLoading) {
    return;
  }
  campaignStepsLoading = true;
  try {
    const response = await apiFetch(`api/marketing/campaigns/${resolvedId}/steps`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "加载步骤失败");
    }
    campaignSteps = data.steps || [];
    renderCampaignSteps(campaignSteps);
    activeCampaignId = resolvedId;
    if (stepCampaignIdEl) {
      stepCampaignIdEl.value = String(resolvedId);
    }
    if (showToastFlag) {
      showToast(`步骤已更新（${campaignSteps.length}）`, "success");
    }
  } catch (error) {
    if (stepListEl) {
      stepListEl.innerHTML = `<div class="hint">错误: ${error.message}</div>`;
    }
    showToast(error.message || "加载步骤失败", "error");
  } finally {
    campaignStepsLoading = false;
  }
}

function fillStepForm(step) {
  if (!step) {
    return;
  }
  if (stepCampaignIdEl) {
    stepCampaignIdEl.value = step.campaign_id || "";
  }
  if (stepIdEl) {
    stepIdEl.value = step.id || "";
  }
  if (stepOrderEl) {
    stepOrderEl.value = step.order_no || "";
  }
  if (stepChannelEl) {
    stepChannelEl.value = step.channel || "EMAIL";
  }
  if (stepDelayEl) {
    stepDelayEl.value = step.delay_days || 0;
  }
  if (stepFilterRulesEl) {
    stepFilterRulesEl.value = step.filter_rules
      ? JSON.stringify(step.filter_rules, null, 2)
      : "";
  }
  if (stepTemplateIdEl) {
    stepTemplateIdEl.value = step.template_id || "";
  }
  if (stepSubjectEl) {
    stepSubjectEl.value = step.subject || "";
  }
  if (stepContentEl) {
    stepContentEl.value = step.content || "";
  }
  if (stepContentSidEl) {
    stepContentSidEl.value = step.content_sid || "";
  }
  if (stepContentVarsEl) {
    stepContentVarsEl.value = step.content_variables
      ? JSON.stringify(step.content_variables, null, 2)
      : "";
  }
}

function clearStepForm() {
  if (stepIdEl) {
    stepIdEl.value = "";
  }
  if (stepOrderEl) {
    stepOrderEl.value = "";
  }
  if (stepChannelEl) {
    stepChannelEl.value = "EMAIL";
  }
  if (stepDelayEl) {
    stepDelayEl.value = "";
  }
  if (stepFilterRulesEl) {
    stepFilterRulesEl.value = "";
  }
  if (stepTemplateIdEl) {
    stepTemplateIdEl.value = "";
  }
  if (stepSubjectEl) {
    stepSubjectEl.value = "";
  }
  if (stepContentEl) {
    stepContentEl.value = "";
  }
  if (stepContentSidEl) {
    stepContentSidEl.value = "";
  }
  if (stepContentVarsEl) {
    stepContentVarsEl.value = "";
  }
}

function buildStepPayload(requireOrder, includeEmpty = false) {
  const payload = {};
  const orderValue = stepOrderEl ? stepOrderEl.value.trim() : "";
  if (requireOrder && !orderValue) {
    throw new Error("步骤顺序不能为空");
  }
  if (orderValue) {
    payload.order_no = parseInt(orderValue, 10);
  }
  if (stepChannelEl) {
    payload.channel = stepChannelEl.value;
  }
  const delayValue = stepDelayEl ? stepDelayEl.value.trim() : "";
  if (delayValue) {
    payload.delay_days = parseInt(delayValue, 10);
  } else if (includeEmpty) {
    payload.delay_days = 0;
  }
  if (stepFilterRulesEl) {
    const raw = stepFilterRulesEl.value.trim();
    if (raw) {
      payload.filter_rules = parseJsonInput(raw, "筛选规则");
    } else if (includeEmpty) {
      payload.filter_rules = {};
    }
  }
  if (stepTemplateIdEl) {
    const templateId = stepTemplateIdEl.value.trim();
    if (templateId) {
      payload.template_id = parseInt(templateId, 10);
    } else if (includeEmpty) {
      payload.template_id = null;
    }
  }
  if (stepSubjectEl) {
    const subject = stepSubjectEl.value.trim();
    if (includeEmpty || subject) {
      payload.subject = subject;
    }
  }
  if (stepContentEl) {
    const content = stepContentEl.value;
    if (includeEmpty || content) {
      payload.content = content;
    }
  }
  if (stepContentSidEl) {
    const contentSid = stepContentSidEl.value.trim();
    if (includeEmpty || contentSid) {
      payload.content_sid = contentSid;
    }
  }
  if (stepContentVarsEl) {
    const raw = stepContentVarsEl.value.trim();
    if (raw) {
      payload.content_variables = parseJsonInput(raw, "模板变量");
    } else if (includeEmpty) {
      payload.content_variables = {};
    }
  }
  return payload;
}

async function createCampaignStep() {
  const campaignId =
    (stepCampaignIdEl ? parseInt(stepCampaignIdEl.value, 10) : 0) || activeCampaignId;
  if (!campaignId) {
    showToast("计划ID不能为空", "error");
    return;
  }
  try {
    const payload = buildStepPayload(true, false);
    const response = await apiFetch(`api/marketing/campaigns/${campaignId}/steps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "创建步骤失败");
    }
    setStepResult(data);
    fillStepForm(data);
    showToast("步骤已创建", "success");
    loadCampaignSteps(campaignId, false);
  } catch (error) {
    showToast(error.message || "创建步骤失败", "error");
  }
}

async function updateCampaignStep() {
  const campaignId =
    (stepCampaignIdEl ? parseInt(stepCampaignIdEl.value, 10) : 0) || activeCampaignId;
  const stepId = stepIdEl ? parseInt(stepIdEl.value, 10) : 0;
  if (!campaignId || !stepId) {
    showToast("计划ID和步骤ID不能为空", "error");
    return;
  }
  try {
    const payload = buildStepPayload(false, true);
    const response = await apiFetch(
      `api/marketing/campaigns/${campaignId}/steps/${stepId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "更新步骤失败");
    }
    setStepResult(data);
    fillStepForm(data);
    showToast("步骤已更新", "success");
    loadCampaignSteps(campaignId, false);
  } catch (error) {
    showToast(error.message || "更新步骤失败", "error");
  }
}

async function deleteCampaignStep(stepId) {
  const campaignId =
    (stepCampaignIdEl ? parseInt(stepCampaignIdEl.value, 10) : 0) || activeCampaignId;
  const resolvedStepId = stepId || (stepIdEl ? parseInt(stepIdEl.value, 10) : 0);
  if (!campaignId || !resolvedStepId) {
    showToast("计划ID和步骤ID不能为空", "error");
    return;
  }
  try {
    const response = await apiFetch(
      `api/marketing/campaigns/${campaignId}/steps/${resolvedStepId}`,
      {
        method: "DELETE",
      }
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "删除步骤失败");
    }
    setStepResult(data);
    showToast("步骤已删除", "success");
    loadCampaignSteps(campaignId, false);
  } catch (error) {
    showToast(error.message || "删除步骤失败", "error");
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
setSelectPlaceholder(emailCampaignFromSelect, "点击刷新列表加载");
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
if (emailCampaignFromSelect) {
  emailCampaignFromSelect.addEventListener("focus", ensureEmailSenders);
  emailCampaignFromSelect.addEventListener("click", ensureEmailSenders);
}
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

if (emailCampaignCreateBtn) {
  emailCampaignCreateBtn.addEventListener("click", createEmailCampaign);
}
if (emailCampaignUpdateBtn) {
  emailCampaignUpdateBtn.addEventListener("click", updateEmailCampaign);
}
if (emailCampaignClearBtn) {
  emailCampaignClearBtn.addEventListener("click", clearEmailCampaignForm);
}
if (emailCampaignRefreshBtn) {
  emailCampaignRefreshBtn.addEventListener("click", () => loadEmailCampaigns(true));
}
if (emailCampaignFilterEl) {
  emailCampaignFilterEl.addEventListener("change", () => loadEmailCampaigns(true));
}

if (customerCreateBtn) {
  customerCreateBtn.addEventListener("click", createCustomer);
}
if (customerUpdateBtn) {
  customerUpdateBtn.addEventListener("click", updateCustomer);
}
if (customerClearBtn) {
  customerClearBtn.addEventListener("click", clearCustomerForm);
}
if (customerRefreshBtn) {
  customerRefreshBtn.addEventListener("click", () => loadCustomers(true));
}
if (customerSearchEl) {
  customerSearchEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      loadCustomers(true);
    }
  });
}
if (customerHasMarketedEl) {
  customerHasMarketedEl.addEventListener("change", () => loadCustomers(true));
}

if (templateCreateBtn) {
  templateCreateBtn.addEventListener("click", createTemplate);
}
if (templateUpdateBtn) {
  templateUpdateBtn.addEventListener("click", updateTemplate);
}
if (templateDeleteBtn) {
  templateDeleteBtn.addEventListener("click", () => {
    const templateId = templateIdEl ? parseInt(templateIdEl.value, 10) : 0;
    deleteTemplate(templateId);
  });
}
if (templateClearBtn) {
  templateClearBtn.addEventListener("click", clearTemplateForm);
}
if (templateRefreshBtn) {
  templateRefreshBtn.addEventListener("click", () => loadTemplates(true));
}
if (templateSearchEl) {
  templateSearchEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      loadTemplates(true);
    }
  });
}
if (templateFilterChannelEl) {
  templateFilterChannelEl.addEventListener("change", () => loadTemplates(true));
}

if (marketingCreateBtn) {
  marketingCreateBtn.addEventListener("click", createMarketingCampaign);
}
if (marketingUpdateBtn) {
  marketingUpdateBtn.addEventListener("click", updateMarketingCampaign);
}
if (marketingClearBtn) {
  marketingClearBtn.addEventListener("click", clearMarketingForm);
}
if (marketingRefreshBtn) {
  marketingRefreshBtn.addEventListener("click", () => loadMarketingCampaigns(true));
}
if (marketingStatusFilterEl) {
  marketingStatusFilterEl.addEventListener("change", () => loadMarketingCampaigns(true));
}

if (stepCreateBtn) {
  stepCreateBtn.addEventListener("click", createCampaignStep);
}
if (stepUpdateBtn) {
  stepUpdateBtn.addEventListener("click", updateCampaignStep);
}
if (stepDeleteBtn) {
  stepDeleteBtn.addEventListener("click", () => {
    const stepId = stepIdEl ? parseInt(stepIdEl.value, 10) : 0;
    deleteCampaignStep(stepId);
  });
}
if (stepClearBtn) {
  stepClearBtn.addEventListener("click", clearStepForm);
}
if (stepRefreshBtn) {
  stepRefreshBtn.addEventListener("click", () => loadCampaignSteps(null, true));
}
if (stepCampaignIdEl) {
  stepCampaignIdEl.addEventListener("change", () => loadCampaignSteps(null, true));
}

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

if (emailCampaignListEl) {
  loadEmailCampaigns();
}

if (customerListEl) {
  loadCustomers();
}

if (templateListEl) {
  loadTemplates();
}

if (marketingListEl) {
  loadMarketingCampaigns();
}

