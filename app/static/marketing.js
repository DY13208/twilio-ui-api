
const API_KEY_STORAGE = "broadcast_api_key";
const DISPLAY_TIME_ZONE = "Asia/Shanghai";
const CHINA_UTC_OFFSET_MS = 8 * 60 * 60 * 1000;

const COLS_CAMPAIGNS = 8;
const COLS_STEPS = 7;
const COLS_EXECUTIONS = 7;
const COLS_PROGRESS = 7;

const toastContainer = document.getElementById("toast-container");

const tabButtons = Array.from(document.querySelectorAll(".tab-button"));
const tabPanels = Array.from(document.querySelectorAll(".tab-panel"));

const marketingTableBody = document.getElementById("marketing-table-body");
const marketingSearchEl = document.getElementById("marketing-search");
const marketingStatusFilterEl = document.getElementById("marketing-status-filter");
const marketingRefreshBtn = document.getElementById("marketing-refresh");
const marketingCreateOpenBtn = document.getElementById("marketing-create-open");
const marketingResultEl = document.getElementById("marketing-result");

const stepTableBody = document.getElementById("step-table-body");
const stepFilterCampaignIdEl = document.getElementById("step-filter-campaign-id");
const stepRefreshBtn = document.getElementById("step-refresh");
const stepCreateOpenBtn = document.getElementById("step-create-open");
const stepResultEl = document.getElementById("step-result");

const executionTableBody = document.getElementById("execution-table-body");
const executionFilterCampaignIdEl = document.getElementById(
  "execution-filter-campaign-id"
);
const executionFilterStepIdEl = document.getElementById("execution-filter-step-id");
const executionFilterCustomerIdEl = document.getElementById(
  "execution-filter-customer-id"
);
const executionFilterStatusEl = document.getElementById("execution-filter-status");
const executionRefreshBtn = document.getElementById("execution-refresh");
const executionCreateOpenBtn = document.getElementById("execution-create-open");
const executionResultEl = document.getElementById("execution-result");

const progressTableBody = document.getElementById("progress-table-body");
const progressFilterCampaignIdEl = document.getElementById(
  "progress-filter-campaign-id"
);
const progressRefreshBtn = document.getElementById("progress-refresh");
const progressResultEl = document.getElementById("progress-result");

const guideBtn = document.getElementById("marketing-guide-btn");
const guidePopover = document.getElementById("marketing-guide-popover");
const guideClose = document.getElementById("marketing-guide-close");

const campaignModal = document.getElementById("campaign-modal");
const campaignModalTitle = document.getElementById("campaign-modal-title");
const campaignModalClose = document.getElementById("campaign-modal-close");
const campaignWizardIdEl = document.getElementById("campaign-wizard-id");
const campaignPrevBtn = document.getElementById("campaign-prev");
const campaignNextBtn = document.getElementById("campaign-next");
const campaignSubmitBtn = document.getElementById("campaign-submit");

const wizardNameEl = document.getElementById("wizard-name");
const wizardTypeEl = document.getElementById("wizard-type");
const wizardCreatedByEl = document.getElementById("wizard-created-by");
const wizardRunImmediatelyEl = document.getElementById("wizard-run-immediately");
const wizardScheduleEl = document.getElementById("wizard-schedule");
const wizardCustomerIdsEl = document.getElementById("wizard-customer-ids");
const wizardFilterRulesEl = document.getElementById("wizard-filter-rules");

const stepModal = document.getElementById("step-modal");
const stepModalTitle = document.getElementById("step-modal-title");
const stepModalClose = document.getElementById("step-modal-close");
const stepModalIdEl = document.getElementById("step-modal-id");
const stepModalCampaignIdEl = document.getElementById("step-modal-campaign-id");
const stepModalOrderEl = document.getElementById("step-modal-order");
const stepModalChannelEl = document.getElementById("step-modal-channel");
const stepModalDelayEl = document.getElementById("step-modal-delay");
const stepModalFilterRulesEl = document.getElementById("step-modal-filter-rules");
const stepModalTemplateIdEl = document.getElementById("step-modal-template-id");
const stepModalSubjectEl = document.getElementById("step-modal-subject");
const stepModalContentEl = document.getElementById("step-modal-content");
const stepModalContentSidEl = document.getElementById("step-modal-content-sid");
const stepModalContentVarsEl = document.getElementById("step-modal-content-vars");
const stepModalSubmitBtn = document.getElementById("step-modal-submit");

const executionModal = document.getElementById("execution-modal");
const executionModalTitle = document.getElementById("execution-modal-title");
const executionModalClose = document.getElementById("execution-modal-close");
const executionModalIdEl = document.getElementById("execution-modal-id");
const executionModalCampaignIdEl = document.getElementById(
  "execution-modal-campaign-id"
);
const executionModalStepIdEl = document.getElementById("execution-modal-step-id");
const executionModalCustomerIdEl = document.getElementById(
  "execution-modal-customer-id"
);
const executionModalChannelEl = document.getElementById("execution-modal-channel");
const executionModalStatusEl = document.getElementById("execution-modal-status");
const executionModalMessageIdEl = document.getElementById(
  "execution-modal-message-id"
);
const executionModalNoteEl = document.getElementById("execution-modal-note");
const executionModalSubmitBtn = document.getElementById("execution-modal-submit");

const wizardSteps = Array.from(document.querySelectorAll(".wizard-step"));
const stepperItems = Array.from(document.querySelectorAll(".stepper-item"));

let marketingCampaigns = [];
let campaignSteps = [];
let campaignExecutions = [];
let customerProgress = [];
let activeCampaignId = null;
let progressCampaignId = null;
let campaignWizardMode = "create";
let wizardStepIndex = 0;
function getStoredApiKey() {
  try {
    return localStorage.getItem(API_KEY_STORAGE) || "";
  } catch (error) {
    return "";
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

function parseList(value) {
  return String(value || "")
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseIdList(value) {
  return parseList(value)
    .map((item) => parseInt(item, 10))
    .filter((item) => Number.isFinite(item));
}

function parseNumberInput(value) {
  const parsed = parseInt(String(value || "").trim(), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseJsonInput(value, fieldName) {
  const raw = String(value || "").trim();
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      throw new Error("invalid json");
    }
    return parsed;
  } catch (error) {
    throw new Error(`${fieldName} 必须是 JSON 对象`);
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

function formatChannelLabel(channel) {
  if (!channel) {
    return "-";
  }
  const value = String(channel).toUpperCase();
  const mapping = {
    MIXED: "混合",
    EMAIL: "邮件",
    WHATSAPP: "WhatsApp",
    SMS: "短信",
  };
  return mapping[value] || channel;
}

function formatCampaignStatus(status) {
  if (!status) {
    return "-";
  }
  const value = String(status).toUpperCase();
  const mapping = {
    DRAFT: "草稿",
    RUNNING: "执行中",
    COMPLETED: "已完成",
    STOPPED: "已停止",
    SCHEDULED: "已排期",
  };
  return mapping[value] || status;
}
function truncate(text, maxLength = 60) {
  const value = String(text || "");
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength)}...`;
}

function setResult(target, data) {
  if (!target) {
    return;
  }
  target.textContent = JSON.stringify(data, null, 2);
}

function renderEmptyRow(body, colSpan, message) {
  if (!body) {
    return;
  }
  body.innerHTML = "";
  const row = document.createElement("tr");
  row.className = "details-row";
  const cell = document.createElement("td");
  cell.colSpan = colSpan;
  cell.textContent = message;
  row.appendChild(cell);
  body.appendChild(row);
}

function createActionButton(label, className, action, data = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.dataset.action = action;
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      button.dataset[key] = String(value);
    }
  });
  return button;
}

function createRowToggle(rowId) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "row-toggle";
  button.dataset.action = "toggle";
  button.dataset.rowId = rowId;
  button.setAttribute("aria-expanded", "false");
  button.textContent = "+";
  return button;
}

function formatDetailValue(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch (error) {
      return String(value);
    }
  }
  return String(value);
}

function createDetailItem(labelText, value) {
  const wrapper = document.createElement("div");
  wrapper.className = "detail-item";
  const label = document.createElement("div");
  label.className = "detail-label";
  label.textContent = labelText;
  const content = document.createElement("div");
  content.className = "detail-value";
  content.textContent = formatDetailValue(value);
  wrapper.appendChild(label);
  wrapper.appendChild(content);
  return wrapper;
}

function createDetailsRow(rowId, colSpan, items) {
  const row = document.createElement("tr");
  row.className = "details-row";
  row.dataset.detailsFor = rowId;
  row.hidden = true;

  const cell = document.createElement("td");
  cell.colSpan = colSpan;
  const grid = document.createElement("div");
  grid.className = "detail-grid";
  items.forEach((item) => {
    grid.appendChild(createDetailItem(item.label, item.value));
  });
  cell.appendChild(grid);
  row.appendChild(cell);
  return row;
}

function toggleDetailsRow(dataRow, body) {
  if (!dataRow || !body) {
    return;
  }
  const rowId = dataRow.dataset.rowId;
  if (!rowId) {
    return;
  }
  const detailsRow = body.querySelector(
    `tr.details-row[data-details-for="${rowId}"]`
  );
  if (!detailsRow) {
    return;
  }
  const shouldShow = detailsRow.hidden;
  detailsRow.hidden = !shouldShow;
  const toggleBtn = dataRow.querySelector(".row-toggle");
  if (toggleBtn) {
    toggleBtn.textContent = shouldShow ? "-" : "+";
    toggleBtn.setAttribute("aria-expanded", shouldShow ? "true" : "false");
  }
}

function openModal(modal) {
  if (!modal) {
    return;
  }
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal(modal) {
  if (!modal) {
    return;
  }
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
}

function bindModalOverlay(modal) {
  if (!modal) {
    return;
  }
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeModal(modal);
    }
  });
}

function setActiveTab(tabName) {
  tabButtons.forEach((button) => {
    const isActive = button.dataset.tab === tabName;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
  });
  tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === `tab-${tabName}`);
  });
}

function updateScheduleAvailability() {
  if (!wizardScheduleEl || !wizardRunImmediatelyEl) {
    return;
  }
  wizardScheduleEl.disabled = wizardRunImmediatelyEl.checked;
}

function setWizardStep(stepIndex) {
  const maxIndex = wizardSteps.length - 1;
  wizardStepIndex = Math.max(0, Math.min(stepIndex, maxIndex));
  wizardSteps.forEach((step) => {
    const stepValue = parseInt(step.dataset.step, 10);
    step.classList.toggle("active", stepValue === wizardStepIndex);
  });
  stepperItems.forEach((item) => {
    const stepValue = parseInt(item.dataset.step, 10);
    item.classList.toggle("active", stepValue === wizardStepIndex);
  });
  if (campaignPrevBtn) {
    campaignPrevBtn.disabled = wizardStepIndex === 0;
  }
  if (campaignNextBtn) {
    campaignNextBtn.hidden = wizardStepIndex >= maxIndex;
  }
  if (campaignSubmitBtn) {
    campaignSubmitBtn.hidden = wizardStepIndex < maxIndex;
  }
}

function resetCampaignWizard() {
  if (campaignWizardIdEl) {
    campaignWizardIdEl.value = "";
  }
  if (wizardNameEl) {
    wizardNameEl.value = "";
  }
  if (wizardTypeEl) {
    wizardTypeEl.value = "MIXED";
  }
  if (wizardCreatedByEl) {
    wizardCreatedByEl.value = "";
  }
  if (wizardRunImmediatelyEl) {
    wizardRunImmediatelyEl.checked = true;
  }
  if (wizardScheduleEl) {
    wizardScheduleEl.value = "";
  }
  if (wizardCustomerIdsEl) {
    wizardCustomerIdsEl.value = "";
  }
  if (wizardFilterRulesEl) {
    wizardFilterRulesEl.value = "";
  }
  updateScheduleAvailability();
}

function openCampaignModal(mode, campaign) {
  campaignWizardMode = mode;
  resetCampaignWizard();
  if (mode === "edit" && campaign) {
    if (campaignWizardIdEl) {
      campaignWizardIdEl.value = String(campaign.id || "");
    }
    if (wizardNameEl) {
      wizardNameEl.value = campaign.name || "";
    }
    if (wizardTypeEl) {
      wizardTypeEl.value = campaign.type || "MIXED";
    }
    if (wizardCreatedByEl) {
      wizardCreatedByEl.value = campaign.created_by || "";
    }
    if (wizardRunImmediatelyEl) {
      wizardRunImmediatelyEl.checked = Boolean(campaign.run_immediately);
    }
    if (wizardScheduleEl) {
      wizardScheduleEl.value = formatDateTimeInput(campaign.schedule_time);
    }
    if (wizardCustomerIdsEl) {
      wizardCustomerIdsEl.value = (campaign.customer_ids || []).join(", ");
    }
    if (wizardFilterRulesEl) {
      wizardFilterRulesEl.value = campaign.filter_rules
        ? JSON.stringify(campaign.filter_rules, null, 2)
        : "";
    }
    if (campaignModalTitle) {
      campaignModalTitle.textContent = "编辑营销计划";
    }
    if (campaignSubmitBtn) {
      campaignSubmitBtn.textContent = "更新计划";
    }
  } else {
    if (campaignModalTitle) {
      campaignModalTitle.textContent = "新建营销计划";
    }
    if (campaignSubmitBtn) {
      campaignSubmitBtn.textContent = "创建计划";
    }
  }
  updateScheduleAvailability();
  setWizardStep(0);
  openModal(campaignModal);
}
function buildCampaignPayload(requireName, includeEmpty) {
  const payload = {};
  const name = wizardNameEl ? wizardNameEl.value.trim() : "";
  if (requireName && !name) {
    throw new Error("计划名称不能为空");
  }
  if (includeEmpty || name) {
    payload.name = name;
  }
  const type = wizardTypeEl ? wizardTypeEl.value.trim() : "";
  if (type) {
    payload.type = type;
  }
  if (wizardRunImmediatelyEl) {
    payload.run_immediately = wizardRunImmediatelyEl.checked;
  }
  if (wizardScheduleEl) {
    const scheduleValue = wizardScheduleEl.value.trim();
    if (!wizardRunImmediatelyEl || !wizardRunImmediatelyEl.checked) {
      if (scheduleValue) {
        const scheduleAt = formatDateTimeForQuery(scheduleValue);
        if (!scheduleAt) {
          throw new Error("定时执行时间格式不正确");
        }
        payload.schedule_time = scheduleAt;
      } else if (includeEmpty) {
        payload.schedule_time = null;
      }
    } else if (includeEmpty) {
      payload.schedule_time = null;
    }
  }
  if (wizardCustomerIdsEl) {
    const ids = parseIdList(wizardCustomerIdsEl.value);
    if (includeEmpty || ids.length) {
      payload.customer_ids = ids;
    }
  }
  if (wizardFilterRulesEl) {
    const raw = wizardFilterRulesEl.value.trim();
    if (raw) {
      payload.filter_rules = parseJsonInput(raw, "客户筛选规则");
    } else if (includeEmpty) {
      payload.filter_rules = {};
    }
  }
  if (wizardCreatedByEl) {
    const createdBy = wizardCreatedByEl.value.trim();
    if (includeEmpty || createdBy) {
      payload.created_by = createdBy;
    }
  }
  return payload;
}

async function submitCampaignWizard() {
  const campaignId = campaignWizardIdEl
    ? parseNumberInput(campaignWizardIdEl.value)
    : null;
  const isEdit = campaignWizardMode === "edit" && campaignId;
  try {
    const payload = buildCampaignPayload(!isEdit, true);
    const response = await apiFetch(
      isEdit
        ? `api/marketing/campaigns/${campaignId}`
        : "api/marketing/campaigns",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "保存计划失败");
    }
    setResult(marketingResultEl, data);
    showToast(isEdit ? "计划已更新" : "计划已创建", "success");
    closeModal(campaignModal);
    loadMarketingCampaigns(true);
  } catch (error) {
    showToast(error.message || "保存计划失败", "error");
  }
}

function applyMarketingFilters(items) {
  if (!marketingSearchEl) {
    return items;
  }
  const keyword = marketingSearchEl.value.trim().toLowerCase();
  if (!keyword) {
    return items;
  }
  return items.filter((campaign) => {
    const name = String(campaign.name || "").toLowerCase();
    const createdBy = String(campaign.created_by || "").toLowerCase();
    const idText = String(campaign.id || "");
    return (
      name.includes(keyword) ||
      createdBy.includes(keyword) ||
      idText.includes(keyword)
    );
  });
}
function renderMarketingCampaigns() {
  if (!marketingTableBody) {
    return;
  }
  const items = applyMarketingFilters(marketingCampaigns);
  if (!items.length) {
    renderEmptyRow(marketingTableBody, COLS_CAMPAIGNS, "暂无营销计划");
    return;
  }
  marketingTableBody.innerHTML = "";
  const fragment = document.createDocumentFragment();
  items.forEach((campaign) => {
    const rowId = `campaign-${campaign.id}`;
    const row = document.createElement("tr");
    row.className = "data-row";
    row.dataset.rowId = rowId;
    row.dataset.id = String(campaign.id);

    const toggleCell = document.createElement("td");
    toggleCell.appendChild(createRowToggle(rowId));
    row.appendChild(toggleCell);

    const infoCell = document.createElement("td");
    const title = document.createElement("div");
    title.className = "cell-title";
    title.textContent = campaign.name || "-";
    const subtitle = document.createElement("div");
    subtitle.className = "cell-subtitle";
    subtitle.textContent = `ID ${campaign.id} · ${formatChannelLabel(
      campaign.type
    )} · ${campaign.created_by || "未填写"}`;
    infoCell.appendChild(title);
    infoCell.appendChild(subtitle);
    row.appendChild(infoCell);

    const statusCell = document.createElement("td");
    statusCell.textContent = formatCampaignStatus(campaign.status);
    row.appendChild(statusCell);

    const customerCount =
      campaign.total_customers ||
      (Array.isArray(campaign.customer_ids)
        ? campaign.customer_ids.length
        : 0);
    const sentCount = Number(campaign.success_count || 0);
    const deliveredCount = Number(campaign.delivered_count || 0);
    const engagementCount =
      Number(campaign.email_opened_count || 0) +
      Number(campaign.email_replied_count || 0) +
      Number(campaign.whatsapp_replied_count || 0) +
      Number(campaign.sms_replied_count || 0);

    const customerCell = document.createElement("td");
    customerCell.textContent = String(customerCount);
    row.appendChild(customerCell);

    const sentCell = document.createElement("td");
    sentCell.textContent = String(sentCount);
    row.appendChild(sentCell);

    const deliveredCell = document.createElement("td");
    deliveredCell.textContent = String(deliveredCount);
    row.appendChild(deliveredCell);

    const engagementCell = document.createElement("td");
    engagementCell.textContent = String(engagementCount);
    row.appendChild(engagementCell);

    const actionsCell = document.createElement("td");
    const actions = document.createElement("div");
    actions.className = "table-actions";
    actions.appendChild(
      createActionButton("编辑", "secondary small", "edit-campaign", {
        id: campaign.id,
      })
    );
    if (["DRAFT", "SCHEDULED"].includes(String(campaign.status).toUpperCase())) {
      actions.appendChild(
        createActionButton("启动", "ghost small", "start-campaign", {
          id: campaign.id,
        })
      );
    }
    if (String(campaign.status).toUpperCase() === "RUNNING") {
      actions.appendChild(
        createActionButton("停止", "ghost small", "stop-campaign", {
          id: campaign.id,
        })
      );
    }
    actions.appendChild(
      createActionButton("删除", "ghost small", "delete-campaign", {
        id: campaign.id,
      })
    );
    actions.appendChild(
      createActionButton("步骤", "secondary small", "view-steps", {
        id: campaign.id,
      })
    );
    actions.appendChild(
      createActionButton("执行", "secondary small", "view-executions", {
        id: campaign.id,
      })
    );
    actions.appendChild(
      createActionButton("客户", "secondary small", "view-customers", {
        id: campaign.id,
      })
    );
    actionsCell.appendChild(actions);
    row.appendChild(actionsCell);

    const details = createDetailsRow(rowId, COLS_CAMPAIGNS, [
      { label: "计划 ID", value: campaign.id },
      { label: "计划类型", value: formatChannelLabel(campaign.type) },
      { label: "创建人", value: campaign.created_by || "-" },
      {
        label: "执行策略",
        value: campaign.run_immediately ? "立即执行" : "定时执行",
      },
      {
        label: "定时执行",
        value: campaign.schedule_time
          ? formatDateTime(campaign.schedule_time)
          : "-",
      },
      {
        label: "客户列表",
        value:
          Array.isArray(campaign.customer_ids) && campaign.customer_ids.length
            ? campaign.customer_ids.join(", ")
            : "-",
      },
      { label: "筛选规则", value: campaign.filter_rules || "-" },
      {
        label: "开始时间",
        value: campaign.started_at ? formatDateTime(campaign.started_at) : "-",
      },
      {
        label: "完成时间",
        value: campaign.completed_at
          ? formatDateTime(campaign.completed_at)
          : "-",
      },
      { label: "创建时间", value: formatDateTime(campaign.created_at) },
      { label: "更新时间", value: formatDateTime(campaign.updated_at) },
    ]);

    fragment.appendChild(row);
    fragment.appendChild(details);
  });
  marketingTableBody.appendChild(fragment);
}
async function loadMarketingCampaigns(showToastFlag = false) {
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
    renderMarketingCampaigns();
    if (showToastFlag) {
      showToast(`营销计划已更新（${marketingCampaigns.length}）`, "success");
    }
  } catch (error) {
    renderEmptyRow(marketingTableBody, COLS_CAMPAIGNS, `错误: ${error.message}`);
    showToast(error.message || "加载营销计划失败", "error");
  }
}

async function campaignAction(campaignId, action) {
  if (!campaignId) {
    return;
  }
  try {
    const response = await apiFetch(
      `api/marketing/campaigns/${campaignId}/${action}`,
      { method: "POST" }
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "计划操作失败");
    }
    setResult(marketingResultEl, data);
    showToast("计划状态已更新", "success");
    loadMarketingCampaigns(false);
  } catch (error) {
    showToast(error.message || "计划操作失败", "error");
  }
}

async function deleteCampaign(campaignId) {
  if (!campaignId) {
    return;
  }
  if (!confirm("确认删除该营销计划？")) {
    return;
  }
  try {
    const response = await apiFetch(`api/marketing/campaigns/${campaignId}`, {
      method: "DELETE",
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "删除计划失败");
    }
    setResult(marketingResultEl, data);
    showToast("计划已删除", "success");
    loadMarketingCampaigns(true);
  } catch (error) {
    showToast(error.message || "删除计划失败", "error");
  }
}

function handleCampaignTableClick(event) {
  const actionBtn = event.target.closest("button[data-action]");
  if (actionBtn) {
    event.stopPropagation();
    const action = actionBtn.dataset.action;
    if (action === "toggle") {
      const row = actionBtn.closest("tr.data-row");
      toggleDetailsRow(row, marketingTableBody);
      return;
    }
    const campaignId = parseNumberInput(actionBtn.dataset.id);
    const campaign = marketingCampaigns.find((item) => item.id === campaignId);
    switch (action) {
      case "edit-campaign":
        if (campaign) {
          openCampaignModal("edit", campaign);
        }
        break;
      case "start-campaign":
        campaignAction(campaignId, "start");
        break;
      case "stop-campaign":
        campaignAction(campaignId, "stop");
        break;
      case "delete-campaign":
        deleteCampaign(campaignId);
        break;
      case "view-steps":
        if (stepFilterCampaignIdEl) {
          stepFilterCampaignIdEl.value = String(campaignId || "");
        }
        activeCampaignId = campaignId;
        setActiveTab("steps");
        loadCampaignSteps(campaignId, true);
        break;
      case "view-executions":
        if (executionFilterCampaignIdEl) {
          executionFilterCampaignIdEl.value = String(campaignId || "");
        }
        activeCampaignId = campaignId;
        setActiveTab("executions");
        loadExecutions(campaignId, true);
        break;
      case "view-customers":
        if (progressFilterCampaignIdEl) {
          progressFilterCampaignIdEl.value = String(campaignId || "");
        }
        activeCampaignId = campaignId;
        setActiveTab("customers");
        loadCustomerProgress(campaignId, true);
        break;
      default:
        break;
    }
    return;
  }
  const row = event.target.closest("tr.data-row");
  if (row) {
    toggleDetailsRow(row, marketingTableBody);
  }
}
function resetStepModal() {
  if (stepModalIdEl) {
    stepModalIdEl.value = "";
  }
  if (stepModalCampaignIdEl) {
    stepModalCampaignIdEl.value = "";
  }
  if (stepModalOrderEl) {
    stepModalOrderEl.value = "";
  }
  if (stepModalChannelEl) {
    stepModalChannelEl.value = "EMAIL";
  }
  if (stepModalDelayEl) {
    stepModalDelayEl.value = "0";
  }
  if (stepModalFilterRulesEl) {
    stepModalFilterRulesEl.value = "";
  }
  if (stepModalTemplateIdEl) {
    stepModalTemplateIdEl.value = "";
  }
  if (stepModalSubjectEl) {
    stepModalSubjectEl.value = "";
  }
  if (stepModalContentEl) {
    stepModalContentEl.value = "";
  }
  if (stepModalContentSidEl) {
    stepModalContentSidEl.value = "";
  }
  if (stepModalContentVarsEl) {
    stepModalContentVarsEl.value = "";
  }
}

function openStepModal(mode, step) {
  resetStepModal();
  if (mode === "edit" && step) {
    if (stepModalIdEl) {
      stepModalIdEl.value = String(step.id || "");
    }
    if (stepModalCampaignIdEl) {
      stepModalCampaignIdEl.value = String(step.campaign_id || "");
    }
    if (stepModalOrderEl) {
      stepModalOrderEl.value = String(step.order_no || "");
    }
    if (stepModalChannelEl) {
      stepModalChannelEl.value = step.channel || "EMAIL";
    }
    if (stepModalDelayEl) {
      stepModalDelayEl.value = String(step.delay_days || 0);
    }
    if (stepModalFilterRulesEl) {
      stepModalFilterRulesEl.value = step.filter_rules
        ? JSON.stringify(step.filter_rules, null, 2)
        : "";
    }
    if (stepModalTemplateIdEl) {
      stepModalTemplateIdEl.value = step.template_id || "";
    }
    if (stepModalSubjectEl) {
      stepModalSubjectEl.value = step.subject || "";
    }
    if (stepModalContentEl) {
      stepModalContentEl.value = step.content || "";
    }
    if (stepModalContentSidEl) {
      stepModalContentSidEl.value = step.content_sid || "";
    }
    if (stepModalContentVarsEl) {
      stepModalContentVarsEl.value = step.content_variables
        ? JSON.stringify(step.content_variables, null, 2)
        : "";
    }
    if (stepModalTitle) {
      stepModalTitle.textContent = "编辑步骤";
    }
  } else {
    if (stepModalCampaignIdEl) {
      stepModalCampaignIdEl.value = String(
        parseNumberInput(stepFilterCampaignIdEl?.value) || activeCampaignId || ""
      );
    }
    if (stepModalTitle) {
      stepModalTitle.textContent = "新增步骤";
    }
  }
  openModal(stepModal);
}

function buildStepPayload(requireOrder, includeEmpty) {
  const payload = {};
  const orderValue = stepModalOrderEl ? stepModalOrderEl.value.trim() : "";
  if (requireOrder && !orderValue) {
    throw new Error("步骤顺序不能为空");
  }
  if (orderValue) {
    payload.order_no = parseInt(orderValue, 10);
  }
  if (stepModalChannelEl && stepModalChannelEl.value) {
    payload.channel = stepModalChannelEl.value;
  }
  if (stepModalDelayEl) {
    const delayValue = stepModalDelayEl.value.trim();
    if (delayValue) {
      payload.delay_days = parseInt(delayValue, 10);
    } else if (includeEmpty) {
      payload.delay_days = 0;
    }
  }
  if (stepModalFilterRulesEl) {
    const raw = stepModalFilterRulesEl.value.trim();
    if (raw) {
      payload.filter_rules = parseJsonInput(raw, "步骤筛选规则");
    } else if (includeEmpty) {
      payload.filter_rules = {};
    }
  }
  if (stepModalTemplateIdEl) {
    const templateValue = stepModalTemplateIdEl.value.trim();
    if (templateValue) {
      payload.template_id = parseInt(templateValue, 10);
    } else if (includeEmpty) {
      payload.template_id = null;
    }
  }
  if (stepModalSubjectEl) {
    const subject = stepModalSubjectEl.value.trim();
    if (subject) {
      payload.subject = subject;
    } else if (includeEmpty) {
      payload.subject = null;
    }
  }
  if (stepModalContentEl) {
    const content = stepModalContentEl.value.trim();
    if (content) {
      payload.content = content;
    } else if (includeEmpty) {
      payload.content = null;
    }
  }
  if (stepModalContentSidEl) {
    const contentSid = stepModalContentSidEl.value.trim();
    if (contentSid) {
      payload.content_sid = contentSid;
    } else if (includeEmpty) {
      payload.content_sid = null;
    }
  }
  if (stepModalContentVarsEl) {
    const raw = stepModalContentVarsEl.value.trim();
    if (raw) {
      payload.content_variables = parseJsonInput(raw, "模板变量");
    } else if (includeEmpty) {
      payload.content_variables = {};
    }
  }
  return payload;
}

async function saveStep() {
  const stepId = stepModalIdEl ? parseNumberInput(stepModalIdEl.value) : null;
  const campaignId = stepModalCampaignIdEl
    ? parseNumberInput(stepModalCampaignIdEl.value)
    : null;
  if (!campaignId) {
    showToast("计划 ID 不能为空", "error");
    return;
  }
  try {
    const payload = buildStepPayload(!stepId, Boolean(stepId));
    const response = await apiFetch(
      stepId
        ? `api/marketing/campaigns/${campaignId}/steps/${stepId}`
        : `api/marketing/campaigns/${campaignId}/steps`,
      {
        method: stepId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "保存步骤失败");
    }
    setResult(stepResultEl, data);
    showToast(stepId ? "步骤已更新" : "步骤已新增", "success");
    closeModal(stepModal);
    activeCampaignId = campaignId;
    loadCampaignSteps(campaignId, false);
  } catch (error) {
    showToast(error.message || "保存步骤失败", "error");
  }
}
function renderCampaignSteps() {
  if (!stepTableBody) {
    return;
  }
  if (!campaignSteps.length) {
    renderEmptyRow(stepTableBody, COLS_STEPS, "暂无步骤");
    return;
  }
  stepTableBody.innerHTML = "";
  const fragment = document.createDocumentFragment();
  campaignSteps.forEach((step) => {
    const rowId = `step-${step.id}`;
    const row = document.createElement("tr");
    row.className = "data-row";
    row.dataset.rowId = rowId;
    row.dataset.id = String(step.id);
    row.dataset.campaignId = String(step.campaign_id);

    const toggleCell = document.createElement("td");
    toggleCell.appendChild(createRowToggle(rowId));
    row.appendChild(toggleCell);

    const infoCell = document.createElement("td");
    const title = document.createElement("div");
    title.className = "cell-title";
    title.textContent = `步骤 ${step.order_no}`;
    const subtitle = document.createElement("div");
    subtitle.className = "cell-subtitle";
    subtitle.textContent = `ID ${step.id} · 计划 ${step.campaign_id}`;
    infoCell.appendChild(title);
    infoCell.appendChild(subtitle);
    row.appendChild(infoCell);

    const channelCell = document.createElement("td");
    channelCell.textContent = formatChannelLabel(step.channel);
    row.appendChild(channelCell);

    const delayCell = document.createElement("td");
    delayCell.textContent = `${step.delay_days || 0} 天`;
    row.appendChild(delayCell);

    const templateCell = document.createElement("td");
    templateCell.textContent = step.template_id
      ? `模板 ${step.template_id}`
      : step.content_sid || "-";
    row.appendChild(templateCell);

    const contentCell = document.createElement("td");
    const contentTitle = document.createElement("div");
    contentTitle.className = "cell-title";
    contentTitle.textContent = step.subject
      ? truncate(step.subject, 40)
      : step.content
      ? truncate(step.content, 40)
      : "-";
    const contentSubtitle = document.createElement("div");
    contentSubtitle.className = "cell-subtitle";
    contentSubtitle.textContent = step.content ? truncate(step.content, 80) : "-";
    contentCell.appendChild(contentTitle);
    contentCell.appendChild(contentSubtitle);
    row.appendChild(contentCell);

    const actionsCell = document.createElement("td");
    const actions = document.createElement("div");
    actions.className = "table-actions";
    actions.appendChild(
      createActionButton("编辑", "secondary small", "edit-step", {
        id: step.id,
        campaignId: step.campaign_id,
      })
    );
    actions.appendChild(
      createActionButton("删除", "ghost small", "delete-step", {
        id: step.id,
        campaignId: step.campaign_id,
      })
    );
    actionsCell.appendChild(actions);
    row.appendChild(actionsCell);

    const details = createDetailsRow(rowId, COLS_STEPS, [
      { label: "计划 ID", value: step.campaign_id },
      { label: "步骤顺序", value: step.order_no },
      { label: "渠道", value: formatChannelLabel(step.channel) },
      { label: "延迟天数", value: step.delay_days || 0 },
      { label: "模板 ID", value: step.template_id || "-" },
      { label: "模板 SID", value: step.content_sid || "-" },
      { label: "主题", value: step.subject || "-" },
      { label: "内容", value: step.content || "-" },
      { label: "筛选规则", value: step.filter_rules || "-" },
      { label: "模板变量", value: step.content_variables || "-" },
      { label: "创建时间", value: formatDateTime(step.created_at) },
      { label: "更新时间", value: formatDateTime(step.updated_at) },
    ]);

    fragment.appendChild(row);
    fragment.appendChild(details);
  });
  stepTableBody.appendChild(fragment);
}

async function loadCampaignSteps(campaignId, showToastFlag = false) {
  const resolvedId =
    campaignId ||
    parseNumberInput(stepFilterCampaignIdEl?.value) ||
    activeCampaignId;
  if (!resolvedId) {
    showToast("步骤需要计划 ID", "error");
    return;
  }
  try {
    const response = await apiFetch(
      `api/marketing/campaigns/${resolvedId}/steps`
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "加载步骤失败");
    }
    campaignSteps = data.steps || [];
    activeCampaignId = resolvedId;
    renderCampaignSteps();
    if (showToastFlag) {
      showToast(`步骤已更新（${campaignSteps.length}）`, "success");
    }
  } catch (error) {
    renderEmptyRow(stepTableBody, COLS_STEPS, `错误: ${error.message}`);
    showToast(error.message || "加载步骤失败", "error");
  }
}

async function deleteStep(stepId, campaignId) {
  if (!stepId || !campaignId) {
    return;
  }
  if (!confirm("确认删除该步骤？")) {
    return;
  }
  try {
    const response = await apiFetch(
      `api/marketing/campaigns/${campaignId}/steps/${stepId}`,
      { method: "DELETE" }
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "删除步骤失败");
    }
    setResult(stepResultEl, data);
    showToast("步骤已删除", "success");
    activeCampaignId = campaignId;
    loadCampaignSteps(campaignId, false);
  } catch (error) {
    showToast(error.message || "删除步骤失败", "error");
  }
}

function handleStepTableClick(event) {
  const actionBtn = event.target.closest("button[data-action]");
  if (actionBtn) {
    event.stopPropagation();
    const action = actionBtn.dataset.action;
    if (action === "toggle") {
      const row = actionBtn.closest("tr.data-row");
      toggleDetailsRow(row, stepTableBody);
      return;
    }
    const stepId = parseNumberInput(actionBtn.dataset.id);
    const campaignId = parseNumberInput(actionBtn.dataset.campaignId);
    const step = campaignSteps.find((item) => item.id === stepId);
    switch (action) {
      case "edit-step":
        if (step) {
          openStepModal("edit", step);
        }
        break;
      case "delete-step":
        deleteStep(stepId, campaignId);
        break;
      default:
        break;
    }
    return;
  }
  const row = event.target.closest("tr.data-row");
  if (row) {
    toggleDetailsRow(row, stepTableBody);
  }
}
function resetExecutionModal() {
  if (executionModalIdEl) {
    executionModalIdEl.value = "";
  }
  if (executionModalCampaignIdEl) {
    executionModalCampaignIdEl.value = "";
  }
  if (executionModalStepIdEl) {
    executionModalStepIdEl.value = "";
  }
  if (executionModalCustomerIdEl) {
    executionModalCustomerIdEl.value = "";
  }
  if (executionModalChannelEl) {
    executionModalChannelEl.value = "EMAIL";
  }
  if (executionModalStatusEl) {
    executionModalStatusEl.value = "queued";
  }
  if (executionModalMessageIdEl) {
    executionModalMessageIdEl.value = "";
  }
  if (executionModalNoteEl) {
    executionModalNoteEl.value = "";
  }
}

function openExecutionModal(mode, execution) {
  resetExecutionModal();
  if (mode === "edit" && execution) {
    if (executionModalIdEl) {
      executionModalIdEl.value = String(execution.id || "");
    }
    if (executionModalCampaignIdEl) {
      executionModalCampaignIdEl.value = String(execution.campaign_id || "");
    }
    if (executionModalStepIdEl) {
      executionModalStepIdEl.value = String(execution.step_id || "");
    }
    if (executionModalCustomerIdEl) {
      executionModalCustomerIdEl.value = String(execution.customer_id || "");
    }
    if (executionModalChannelEl) {
      executionModalChannelEl.value = execution.channel || "EMAIL";
    }
    if (executionModalStatusEl) {
      executionModalStatusEl.value = execution.status || "queued";
    }
    if (executionModalMessageIdEl) {
      executionModalMessageIdEl.value = execution.message_id || "";
    }
    if (executionModalNoteEl) {
      executionModalNoteEl.value = execution.note || "";
    }
    if (executionModalTitle) {
      executionModalTitle.textContent = "编辑执行记录";
    }
  } else {
    if (executionModalCampaignIdEl) {
      executionModalCampaignIdEl.value = String(
        parseNumberInput(executionFilterCampaignIdEl?.value) ||
          activeCampaignId ||
          ""
      );
    }
    if (executionModalStepIdEl) {
      executionModalStepIdEl.value =
        parseNumberInput(executionFilterStepIdEl?.value) || "";
    }
    if (executionModalCustomerIdEl) {
      executionModalCustomerIdEl.value =
        parseNumberInput(executionFilterCustomerIdEl?.value) || "";
    }
    if (executionModalTitle) {
      executionModalTitle.textContent = "新增执行记录";
    }
  }
  openModal(executionModal);
}

function buildExecutionPayload(requireIds) {
  const payload = {};
  const stepId = executionModalStepIdEl
    ? parseNumberInput(executionModalStepIdEl.value)
    : null;
  const customerId = executionModalCustomerIdEl
    ? parseNumberInput(executionModalCustomerIdEl.value)
    : null;
  if (requireIds && (!stepId || !customerId)) {
    throw new Error("步骤 ID 与客户 ID 不能为空");
  }
  if (stepId) {
    payload.step_id = stepId;
  }
  if (customerId) {
    payload.customer_id = customerId;
  }
  if (executionModalChannelEl && executionModalChannelEl.value) {
    payload.channel = executionModalChannelEl.value;
  }
  if (executionModalStatusEl && executionModalStatusEl.value) {
    payload.status = executionModalStatusEl.value;
  }
  if (executionModalMessageIdEl) {
    const messageId = parseNumberInput(executionModalMessageIdEl.value);
    if (messageId) {
      payload.message_id = messageId;
    }
  }
  if (executionModalNoteEl) {
    const note = executionModalNoteEl.value.trim();
    if (note) {
      payload.note = note;
    }
  }
  return payload;
}

function buildExecutionUpdatePayload() {
  const payload = {};
  if (executionModalStatusEl && executionModalStatusEl.value) {
    payload.status = executionModalStatusEl.value;
  }
  if (executionModalMessageIdEl) {
    const messageId = parseNumberInput(executionModalMessageIdEl.value);
    payload.message_id = messageId || null;
  }
  if (executionModalNoteEl) {
    const note = executionModalNoteEl.value.trim();
    payload.note = note || null;
  }
  return payload;
}

async function saveExecution() {
  const executionId = executionModalIdEl
    ? parseNumberInput(executionModalIdEl.value)
    : null;
  const campaignId = executionModalCampaignIdEl
    ? parseNumberInput(executionModalCampaignIdEl.value)
    : null;
  if (!campaignId) {
    showToast("计划 ID 不能为空", "error");
    return;
  }
  try {
    const payload = executionId
      ? buildExecutionUpdatePayload()
      : buildExecutionPayload(true);
    const response = await apiFetch(
      executionId
        ? `api/marketing/campaigns/${campaignId}/executions/${executionId}`
        : `api/marketing/campaigns/${campaignId}/executions`,
      {
        method: executionId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "保存执行记录失败");
    }
    setResult(executionResultEl, data);
    showToast(executionId ? "执行记录已更新" : "执行记录已新增", "success");
    closeModal(executionModal);
    activeCampaignId = campaignId;
    loadExecutions(campaignId, false);
  } catch (error) {
    showToast(error.message || "保存执行记录失败", "error");
  }
}
function renderExecutions() {
  if (!executionTableBody) {
    return;
  }
  if (!campaignExecutions.length) {
    renderEmptyRow(executionTableBody, COLS_EXECUTIONS, "暂无执行记录");
    return;
  }
  executionTableBody.innerHTML = "";
  const fragment = document.createDocumentFragment();
  campaignExecutions.forEach((execution) => {
    const rowId = `execution-${execution.id}`;
    const row = document.createElement("tr");
    row.className = "data-row";
    row.dataset.rowId = rowId;
    row.dataset.id = String(execution.id);
    row.dataset.campaignId = String(execution.campaign_id);

    const toggleCell = document.createElement("td");
    toggleCell.appendChild(createRowToggle(rowId));
    row.appendChild(toggleCell);

    const stepCell = document.createElement("td");
    const stepTitle = document.createElement("div");
    stepTitle.className = "cell-title";
    stepTitle.textContent = `步骤 ${execution.step_id}`;
    const stepSubtitle = document.createElement("div");
    stepSubtitle.className = "cell-subtitle";
    stepSubtitle.textContent = `执行 ID ${execution.id}`;
    stepCell.appendChild(stepTitle);
    stepCell.appendChild(stepSubtitle);
    row.appendChild(stepCell);

    const customerCell = document.createElement("td");
    customerCell.textContent = String(execution.customer_id);
    row.appendChild(customerCell);

    const channelCell = document.createElement("td");
    channelCell.textContent = formatChannelLabel(execution.channel);
    row.appendChild(channelCell);

    const statusCell = document.createElement("td");
    statusCell.textContent = execution.status || "-";
    row.appendChild(statusCell);

    const timeCell = document.createElement("td");
    timeCell.textContent = formatDateTime(execution.created_at);
    row.appendChild(timeCell);

    const actionsCell = document.createElement("td");
    const actions = document.createElement("div");
    actions.className = "table-actions";
    actions.appendChild(
      createActionButton("编辑", "secondary small", "edit-execution", {
        id: execution.id,
        campaignId: execution.campaign_id,
      })
    );
    actions.appendChild(
      createActionButton("删除", "ghost small", "delete-execution", {
        id: execution.id,
        campaignId: execution.campaign_id,
      })
    );
    actionsCell.appendChild(actions);
    row.appendChild(actionsCell);

    const details = createDetailsRow(rowId, COLS_EXECUTIONS, [
      { label: "计划 ID", value: execution.campaign_id },
      { label: "步骤 ID", value: execution.step_id },
      { label: "客户 ID", value: execution.customer_id },
      { label: "渠道", value: formatChannelLabel(execution.channel) },
      { label: "状态", value: execution.status || "-" },
      { label: "消息 ID", value: execution.message_id || "-" },
      { label: "备注", value: execution.note || "-" },
      { label: "创建时间", value: formatDateTime(execution.created_at) },
      { label: "更新时间", value: formatDateTime(execution.updated_at) },
    ]);

    fragment.appendChild(row);
    fragment.appendChild(details);
  });
  executionTableBody.appendChild(fragment);
}

async function loadExecutions(campaignId, showToastFlag = false) {
  const resolvedId =
    campaignId ||
    parseNumberInput(executionFilterCampaignIdEl?.value) ||
    activeCampaignId;
  if (!resolvedId) {
    showToast("执行记录需要计划 ID", "error");
    return;
  }
  try {
    const params = new URLSearchParams();
    const stepId = parseNumberInput(executionFilterStepIdEl?.value);
    if (stepId) {
      params.set("step_id", stepId);
    }
    const customerId = parseNumberInput(executionFilterCustomerIdEl?.value);
    if (customerId) {
      params.set("customer_id", customerId);
    }
    if (executionFilterStatusEl && executionFilterStatusEl.value) {
      params.set("status", executionFilterStatusEl.value);
    }
    const response = await apiFetch(
      `api/marketing/campaigns/${resolvedId}/executions?${params.toString()}`
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "加载执行记录失败");
    }
    campaignExecutions = data.executions || [];
    activeCampaignId = resolvedId;
    renderExecutions();
    if (showToastFlag) {
      showToast(`执行记录已更新（${campaignExecutions.length}）`, "success");
    }
  } catch (error) {
    renderEmptyRow(
      executionTableBody,
      COLS_EXECUTIONS,
      `错误: ${error.message}`
    );
    showToast(error.message || "加载执行记录失败", "error");
  }
}

async function deleteExecution(executionId, campaignId) {
  if (!executionId || !campaignId) {
    return;
  }
  if (!confirm("确认删除该执行记录？")) {
    return;
  }
  try {
    const response = await apiFetch(
      `api/marketing/campaigns/${campaignId}/executions/${executionId}`,
      { method: "DELETE" }
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "删除执行记录失败");
    }
    setResult(executionResultEl, data);
    showToast("执行记录已删除", "success");
    activeCampaignId = campaignId;
    loadExecutions(campaignId, false);
  } catch (error) {
    showToast(error.message || "删除执行记录失败", "error");
  }
}

function handleExecutionTableClick(event) {
  const actionBtn = event.target.closest("button[data-action]");
  if (actionBtn) {
    event.stopPropagation();
    const action = actionBtn.dataset.action;
    if (action === "toggle") {
      const row = actionBtn.closest("tr.data-row");
      toggleDetailsRow(row, executionTableBody);
      return;
    }
    const executionId = parseNumberInput(actionBtn.dataset.id);
    const campaignId = parseNumberInput(actionBtn.dataset.campaignId);
    const execution = campaignExecutions.find((item) => item.id === executionId);
    switch (action) {
      case "edit-execution":
        if (execution) {
          openExecutionModal("edit", execution);
        }
        break;
      case "delete-execution":
        deleteExecution(executionId, campaignId);
        break;
      default:
        break;
    }
    return;
  }
  const row = event.target.closest("tr.data-row");
  if (row) {
    toggleDetailsRow(row, executionTableBody);
  }
}
function renderCustomerProgress() {
  if (!progressTableBody) {
    return;
  }
  if (!customerProgress.length) {
    renderEmptyRow(progressTableBody, COLS_PROGRESS, "暂无客户进度");
    return;
  }
  progressTableBody.innerHTML = "";
  const fragment = document.createDocumentFragment();
  customerProgress.forEach((item) => {
    const rowId = `progress-${item.customer_id}`;
    const row = document.createElement("tr");
    row.className = "data-row";
    row.dataset.rowId = rowId;
    row.dataset.customerId = String(item.customer_id);

    const toggleCell = document.createElement("td");
    toggleCell.appendChild(createRowToggle(rowId));
    row.appendChild(toggleCell);

    const customerCell = document.createElement("td");
    const nameTitle = document.createElement("div");
    nameTitle.className = "cell-title";
    nameTitle.textContent = item.name || `客户 ${item.customer_id}`;
    const contactSubtitle = document.createElement("div");
    contactSubtitle.className = "cell-subtitle";
    const contacts = [];
    if (item.email) {
      contacts.push(item.email);
    }
    if (item.whatsapp) {
      contacts.push(item.whatsapp);
    }
    if (item.mobile) {
      contacts.push(item.mobile);
    }
    contactSubtitle.textContent = contacts.length ? contacts.join(" · ") : "-";
    customerCell.appendChild(nameTitle);
    customerCell.appendChild(contactSubtitle);
    row.appendChild(customerCell);

    const stepCell = document.createElement("td");
    const stepTitle = document.createElement("div");
    stepTitle.className = "cell-title";
    stepTitle.textContent = item.last_step_order
      ? `第 ${item.last_step_order} 步`
      : "-";
    const stepSubtitle = document.createElement("div");
    stepSubtitle.className = "cell-subtitle";
    stepSubtitle.textContent = item.last_step_id
      ? `步骤 ID ${item.last_step_id}`
      : "-";
    stepCell.appendChild(stepTitle);
    stepCell.appendChild(stepSubtitle);
    row.appendChild(stepCell);

    const channelCell = document.createElement("td");
    channelCell.textContent = item.last_step_channel
      ? formatChannelLabel(item.last_step_channel)
      : "-";
    row.appendChild(channelCell);

    const statusCell = document.createElement("td");
    const statusText = item.last_message_status || "-";
    statusCell.textContent = item.paused ? `${statusText}（已暂停）` : statusText;
    row.appendChild(statusCell);

    const timeCell = document.createElement("td");
    timeCell.textContent = item.last_message_at
      ? formatDateTime(item.last_message_at)
      : "-";
    row.appendChild(timeCell);

    const actionsCell = document.createElement("td");
    const actions = document.createElement("div");
    actions.className = "table-actions";
    actions.appendChild(
      createActionButton(
        item.paused ? "恢复" : "暂停",
        "ghost small",
        item.paused ? "resume-customer" : "pause-customer",
        {
          customerId: item.customer_id,
          campaignId: progressCampaignId || activeCampaignId,
        }
      )
    );
    actions.appendChild(
      createActionButton("执行记录", "secondary small", "view-customer-executions", {
        customerId: item.customer_id,
        campaignId: progressCampaignId || activeCampaignId,
      })
    );
    actionsCell.appendChild(actions);
    row.appendChild(actionsCell);

    const details = createDetailsRow(rowId, COLS_PROGRESS, [
      { label: "客户 ID", value: item.customer_id },
      { label: "客户姓名", value: item.name || "-" },
      { label: "邮箱", value: item.email || "-" },
      { label: "WhatsApp", value: item.whatsapp || "-" },
      { label: "手机号", value: item.mobile || "-" },
      { label: "最近步骤 ID", value: item.last_step_id || "-" },
      { label: "最近步骤顺序", value: item.last_step_order || "-" },
      {
        label: "最近步骤渠道",
        value: item.last_step_channel
          ? formatChannelLabel(item.last_step_channel)
          : "-",
      },
      { label: "最近消息状态", value: item.last_message_status || "-" },
      {
        label: "最近消息时间",
        value: item.last_message_at
          ? formatDateTime(item.last_message_at)
          : "-",
      },
      { label: "暂停状态", value: item.paused ? "已暂停" : "进行中" },
    ]);

    fragment.appendChild(row);
    fragment.appendChild(details);
  });
  progressTableBody.appendChild(fragment);
}

async function loadCustomerProgress(campaignId, showToastFlag = false) {
  const resolvedId =
    campaignId ||
    parseNumberInput(progressFilterCampaignIdEl?.value) ||
    activeCampaignId;
  if (!resolvedId) {
    showToast("客户进度需要计划 ID", "error");
    return;
  }
  try {
    const response = await apiFetch(
      `api/marketing/campaigns/${resolvedId}/customers/progress`
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "加载客户进度失败");
    }
    progressCampaignId = data.campaign_id || resolvedId;
    customerProgress = data.customers || [];
    activeCampaignId = resolvedId;
    renderCustomerProgress();
    if (showToastFlag) {
      showToast(`客户进度已更新（${customerProgress.length}）`, "success");
    }
  } catch (error) {
    renderEmptyRow(progressTableBody, COLS_PROGRESS, `错误: ${error.message}`);
    showToast(error.message || "加载客户进度失败", "error");
  }
}

async function updateCustomerState(campaignId, customerId, action) {
  if (!campaignId || !customerId) {
    return;
  }
  try {
    const response = await apiFetch(
      `api/marketing/campaigns/${campaignId}/customers/${customerId}/${action}`,
      { method: "POST" }
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "更新客户状态失败");
    }
    setResult(progressResultEl, data);
    showToast(action === "pause" ? "客户已暂停" : "客户已恢复", "success");
    loadCustomerProgress(campaignId, false);
  } catch (error) {
    showToast(error.message || "更新客户状态失败", "error");
  }
}

function handleProgressTableClick(event) {
  const actionBtn = event.target.closest("button[data-action]");
  if (actionBtn) {
    event.stopPropagation();
    const action = actionBtn.dataset.action;
    if (action === "toggle") {
      const row = actionBtn.closest("tr.data-row");
      toggleDetailsRow(row, progressTableBody);
      return;
    }
    const customerId = parseNumberInput(actionBtn.dataset.customerId);
    const campaignId = parseNumberInput(actionBtn.dataset.campaignId);
    switch (action) {
      case "pause-customer":
        updateCustomerState(campaignId, customerId, "pause");
        break;
      case "resume-customer":
        updateCustomerState(campaignId, customerId, "resume");
        break;
      case "view-customer-executions":
        if (executionFilterCampaignIdEl) {
          executionFilterCampaignIdEl.value = String(campaignId || "");
        }
        if (executionFilterCustomerIdEl) {
          executionFilterCustomerIdEl.value = String(customerId || "");
        }
        setActiveTab("executions");
        loadExecutions(campaignId, true);
        break;
      default:
        break;
    }
    return;
  }
  const row = event.target.closest("tr.data-row");
  if (row) {
    toggleDetailsRow(row, progressTableBody);
  }
}
function bindGuidePopover() {
  if (!guideBtn || !guidePopover) {
    return;
  }
  guideBtn.addEventListener("click", () => {
    guidePopover.classList.toggle("show");
  });
  if (guideClose) {
    guideClose.addEventListener("click", () => {
      guidePopover.classList.remove("show");
    });
  }
  document.addEventListener("click", (event) => {
    if (!guidePopover.classList.contains("show")) {
      return;
    }
    if (guidePopover.contains(event.target) || guideBtn.contains(event.target)) {
      return;
    }
    guidePopover.classList.remove("show");
  });
}

function bindCampaignEvents() {
  if (marketingSearchEl) {
    marketingSearchEl.addEventListener("input", () => {
      renderMarketingCampaigns();
    });
  }
  if (marketingStatusFilterEl) {
    marketingStatusFilterEl.addEventListener("change", () => {
      loadMarketingCampaigns(true);
    });
  }
  if (marketingRefreshBtn) {
    marketingRefreshBtn.addEventListener("click", () => {
      loadMarketingCampaigns(true);
    });
  }
  if (marketingCreateOpenBtn) {
    marketingCreateOpenBtn.addEventListener("click", () => {
      openCampaignModal("create");
    });
  }
  if (campaignModalClose) {
    campaignModalClose.addEventListener("click", () => {
      closeModal(campaignModal);
    });
  }
  if (campaignPrevBtn) {
    campaignPrevBtn.addEventListener("click", () => {
      setWizardStep(wizardStepIndex - 1);
    });
  }
  if (campaignNextBtn) {
    campaignNextBtn.addEventListener("click", () => {
      setWizardStep(wizardStepIndex + 1);
    });
  }
  if (campaignSubmitBtn) {
    campaignSubmitBtn.addEventListener("click", submitCampaignWizard);
  }
  if (wizardRunImmediatelyEl) {
    wizardRunImmediatelyEl.addEventListener("change", updateScheduleAvailability);
  }
  if (marketingTableBody) {
    marketingTableBody.addEventListener("click", handleCampaignTableClick);
  }
  bindModalOverlay(campaignModal);
}

function bindStepEvents() {
  if (stepRefreshBtn) {
    stepRefreshBtn.addEventListener("click", () => {
      loadCampaignSteps(null, true);
    });
  }
  if (stepCreateOpenBtn) {
    stepCreateOpenBtn.addEventListener("click", () => {
      openStepModal("create");
    });
  }
  if (stepModalClose) {
    stepModalClose.addEventListener("click", () => {
      closeModal(stepModal);
    });
  }
  if (stepModalSubmitBtn) {
    stepModalSubmitBtn.addEventListener("click", saveStep);
  }
  if (stepTableBody) {
    stepTableBody.addEventListener("click", handleStepTableClick);
  }
  bindModalOverlay(stepModal);
}

function bindExecutionEvents() {
  if (executionRefreshBtn) {
    executionRefreshBtn.addEventListener("click", () => {
      loadExecutions(null, true);
    });
  }
  if (executionCreateOpenBtn) {
    executionCreateOpenBtn.addEventListener("click", () => {
      openExecutionModal("create");
    });
  }
  if (executionModalClose) {
    executionModalClose.addEventListener("click", () => {
      closeModal(executionModal);
    });
  }
  if (executionModalSubmitBtn) {
    executionModalSubmitBtn.addEventListener("click", saveExecution);
  }
  if (executionTableBody) {
    executionTableBody.addEventListener("click", handleExecutionTableClick);
  }
  bindModalOverlay(executionModal);
}

function bindProgressEvents() {
  if (progressRefreshBtn) {
    progressRefreshBtn.addEventListener("click", () => {
      loadCustomerProgress(null, true);
    });
  }
  if (progressTableBody) {
    progressTableBody.addEventListener("click", handleProgressTableClick);
  }
}

function bindTabEvents() {
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const tabName = button.dataset.tab;
      if (tabName) {
        setActiveTab(tabName);
      }
    });
  });
}

function initMarketingPage() {
  bindTabEvents();
  bindGuidePopover();
  bindCampaignEvents();
  bindStepEvents();
  bindExecutionEvents();
  bindProgressEvents();
  loadMarketingCampaigns(false);
}

document.addEventListener("DOMContentLoaded", initMarketingPage);
