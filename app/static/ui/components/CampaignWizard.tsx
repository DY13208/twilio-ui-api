import React, { useEffect, useState } from 'react';
import { apiFetch, fromInputDateTime, readJson } from '../api';

interface MessageTemplateItem {
  id: number;
  channel: string;
  name: string;
  subject?: string | null;
  content?: string | null;
}

interface WhatsAppTemplateItem {
  sid: string;
  friendly_name?: string | null;
  language?: string | null;
}

interface CustomerSummary {
  id: number;
  name?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  mobile?: string | null;
}

interface CustomerListResponse {
  customers?: CustomerSummary[];
  detail?: string;
}

interface CustomerGroupItem {
  id: number;
  name: string;
  description?: string | null;
}

interface CustomerGroupListResponse {
  groups?: CustomerGroupItem[];
  detail?: string;
}

interface CampaignStepForm {
  channel: 'EMAIL' | 'WHATSAPP' | 'SMS';
  delayDays: number;
  filterRule: 'none' | 'opened' | 'not_opened' | 'replied' | 'not_replied';
  withinDays: number;
  templateId: string;
  subject: string;
  content: string;
  contentSid: string;
  contentVariables: string;
}

interface WizardSubmitPayload {
  campaign: {
    name: string;
    type: string;
    run_immediately: boolean;
    schedule_time?: string | null;
    customer_ids?: number[];
    filter_rules?: Record<string, any> | null;
    created_by?: string | null;
  };
  steps: Array<{
    order_no: number;
    channel: string;
    delay_days: number;
    filter_rules?: Record<string, any> | null;
    template_id?: number | null;
    subject?: string | null;
    content?: string | null;
    content_sid?: string | null;
    content_variables?: Record<string, any> | null;
  }>;
  autoStart: boolean;
}

interface WizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: WizardSubmitPayload) => void;
}

const CampaignWizard: React.FC<WizardProps> = ({ isOpen, onClose, onCreate }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    scopeType: 'all',
    selectedTags: [] as string[],
    selectedGroupId: '',
    strategy: 'immediate',
    scheduleTime: '',
    createdBy: '',
    customerIds: '',
    country: '',
    countryCode: '',
    hasMarketed: 'any',
    lastEmailStatus: '',
    lastWhatsappStatus: '',
    lastSmsStatus: '',
    steps: [
      {
        channel: 'EMAIL' as CampaignStepForm['channel'],
        delayDays: 0,
        filterRule: 'none' as CampaignStepForm['filterRule'],
        withinDays: 7,
        templateId: '',
        subject: '',
        content: '',
        contentSid: '',
        contentVariables: '',
      },
    ],
  });
  const [templates, setTemplates] = useState<MessageTemplateItem[]>([]);
  const [whatsAppTemplates, setWhatsAppTemplates] = useState<WhatsAppTemplateItem[]>([]);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [jsonErrors, setJsonErrors] = useState<Record<number, string>>({});
  const [groupOptions, setGroupOptions] = useState<CustomerGroupItem[]>([]);
  const [groupLoading, setGroupLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<CustomerSummary[]>([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState<CustomerSummary[]>([]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    let active = true;

    const loadTemplates = async () => {
      setTemplateLoading(true);
      setTemplateError(null);
      try {
        const [localResp, waResp] = await Promise.all([
          apiFetch('api/templates'),
          apiFetch('api/whatsapp/templates'),
        ]);
        const localData = await readJson<{ templates?: MessageTemplateItem[]; detail?: string }>(
          localResp
        );
        const waData = await readJson<{ templates?: WhatsAppTemplateItem[]; detail?: string }>(
          waResp
        );

        if (!active) {
          return;
        }

        if (localResp.ok) {
          setTemplates(localData?.templates || []);
        } else {
          setTemplateError(localData?.detail || '无法加载本地模板，请检查 API Key。');
        }

        if (waResp.ok) {
          setWhatsAppTemplates(waData?.templates || []);
        } else if (!localResp.ok) {
          setTemplateError((prev) => prev || waData?.detail || '无法加载 WhatsApp 模板。');
        }
      } catch (error) {
        if (active) {
          setTemplateError('模板加载失败，请稍后重试。');
        }
      } finally {
        if (active) {
          setTemplateLoading(false);
        }
      }
    };

    const loadGroups = async () => {
      setGroupLoading(true);
      try {
        const response = await apiFetch('api/customers/groups');
        const data = await readJson<CustomerGroupListResponse>(response);
        if (!active) {
          return;
        }
        if (response.ok) {
          setGroupOptions(data?.groups || []);
        }
      } catch {
        if (active) {
          setGroupOptions([]);
        }
      } finally {
        if (active) {
          setGroupLoading(false);
        }
      }
    };

    loadTemplates();
    loadGroups();

    return () => {
      active = false;
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const totalSteps = 4;
  const navItems = [
    { id: 1, label: '基本与目标' },
    { id: 2, label: '执行策略' },
    { id: 3, label: '流程步骤' },
    { id: 4, label: '确认启用' },
  ];

  const reset = () => {
    setStep(1);
    setFormData({
      name: '',
      scopeType: 'all',
      selectedTags: [],
      selectedGroupId: '',
      strategy: 'immediate',
      scheduleTime: '',
      createdBy: '',
      customerIds: '',
      country: '',
      countryCode: '',
      hasMarketed: 'any',
      lastEmailStatus: '',
      lastWhatsappStatus: '',
      lastSmsStatus: '',
      steps: [
        {
          channel: 'EMAIL',
          delayDays: 0,
          filterRule: 'none',
          withinDays: 7,
          templateId: '',
          subject: '',
          content: '',
          contentSid: '',
          contentVariables: '',
        },
      ],
    });
    setJsonErrors({});
    setSelectedCustomers([]);
    setCustomerResults([]);
    setCustomerSearch('');
  };

  const updateStep = (index: number, patch: Partial<CampaignStepForm>) => {
    setFormData((prev) => {
      const steps = [...prev.steps];
      steps[index] = { ...steps[index], ...patch };
      return { ...prev, steps };
    });
  };

  const addStep = () => {
    setFormData((prev) => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          channel: 'WHATSAPP',
          delayDays: 3,
          filterRule: 'not_replied',
          withinDays: 7,
          templateId: '',
          subject: '',
          content: '',
          contentSid: '',
          contentVariables: '',
        },
      ],
    }));
  };

  const removeStep = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index),
    }));
  };

  const parseCustomerIds = (value: string): number[] => {
    const items = value
      .split(/[\s,]+/)
      .map((item) => parseInt(item, 10))
      .filter((item) => Number.isFinite(item));
    return Array.from(new Set(items));
  };

  const formatCustomerOption = (customer: CustomerSummary) => {
    return (
      customer.name ||
      customer.email ||
      customer.whatsapp ||
      customer.mobile ||
      `客户 ${customer.id}`
    );
  };

  const searchCustomers = async () => {
    const query = customerSearch.trim();
    if (!query) {
      setCustomerResults([]);
      return;
    }
    setCustomerLoading(true);
    try {
      const params = new URLSearchParams({ search: query, limit: '20', offset: '0' });
      const response = await apiFetch(`api/customers?${params.toString()}`);
      const data = await readJson<CustomerListResponse>(response);
      if (!response.ok) {
        setCustomerResults([]);
        return;
      }
      setCustomerResults(data?.customers || []);
    } catch {
      setCustomerResults([]);
    } finally {
      setCustomerLoading(false);
    }
  };

  const addSelectedCustomer = (customer: CustomerSummary) => {
    setSelectedCustomers((prev) => {
      if (prev.some((item) => item.id === customer.id)) {
        return prev;
      }
      return [...prev, customer];
    });
  };

  const removeSelectedCustomer = (customerId: number) => {
    setSelectedCustomers((prev) => prev.filter((item) => item.id !== customerId));
  };

  const buildCampaignFilterRules = (): Record<string, any> | null => {
    const rules: Record<string, any> = {};
    if (formData.scopeType === 'tags' && formData.selectedTags.length) {
      rules.tags = formData.selectedTags;
    }
    if (formData.scopeType === 'groups' && formData.selectedGroupId) {
      const groupId = Number(formData.selectedGroupId);
      if (Number.isFinite(groupId)) {
        rules.group_ids = [groupId];
      }
    }
    if (formData.scopeType === 'search') {
      if (formData.country.trim()) {
        rules.country = formData.country.trim();
      }
      if (formData.countryCode.trim()) {
        rules.country_code = formData.countryCode.trim();
      }
      if (formData.hasMarketed === 'yes') {
        rules.has_marketed = true;
      }
      if (formData.hasMarketed === 'no') {
        rules.has_marketed = false;
      }
      if (formData.lastEmailStatus.trim()) {
        rules.last_email_status = formData.lastEmailStatus.trim();
      }
      if (formData.lastWhatsappStatus.trim()) {
        rules.last_whatsapp_status = formData.lastWhatsappStatus.trim();
      }
      if (formData.lastSmsStatus.trim()) {
        rules.last_sms_status = formData.lastSmsStatus.trim();
      }
    }
    return Object.keys(rules).length ? rules : null;
  };

  const buildStepFilterRules = (stepData: CampaignStepForm): Record<string, any> | null => {
    if (stepData.filterRule === 'none') {
      return null;
    }
    const rules: Record<string, any> = {
      within_days: stepData.withinDays,
    };
    if (stepData.filterRule === 'opened') {
      rules.opened_status = 'opened';
    }
    if (stepData.filterRule === 'not_opened') {
      rules.opened_status = 'not_opened';
    }
    if (stepData.filterRule === 'replied') {
      rules.reply_status = 'replied';
    }
    if (stepData.filterRule === 'not_replied') {
      rules.reply_status = 'not_replied';
    }
    return rules;
  };

  const buildStepPayloads = () => {
    const errors: Record<number, string> = {};
    const payloads = formData.steps.map((stepData, index) => {
      let contentVariables: Record<string, any> | null = null;
      const rawVariables = stepData.contentVariables.trim();
      if (rawVariables) {
        try {
          const parsed = JSON.parse(rawVariables);
          if (parsed && typeof parsed === 'object') {
            contentVariables = parsed as Record<string, any>;
          } else {
            errors[index] = '变量 JSON 必须是对象。';
          }
        } catch (error) {
          errors[index] = '变量 JSON 格式不正确。';
        }
      }

      const templateId = stepData.templateId ? Number(stepData.templateId) : null;
      return {
        order_no: index + 1,
        channel: stepData.channel,
        delay_days: stepData.delayDays,
        filter_rules: buildStepFilterRules(stepData),
        template_id: Number.isFinite(templateId) ? templateId : null,
        subject: stepData.subject.trim() || null,
        content: stepData.content.trim() || null,
        content_sid: stepData.contentSid.trim() || null,
        content_variables: contentVariables,
      };
    });

    if (Object.keys(errors).length) {
      setJsonErrors(errors);
      return null;
    }
    setJsonErrors({});
    return payloads;
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
      return;
    }

    const stepPayloads = buildStepPayloads();
    if (!stepPayloads) {
      setStep(3);
      return;
    }

    const filterRules = buildCampaignFilterRules();
    const manualIds = parseCustomerIds(formData.customerIds);
    const selectedIds = selectedCustomers.map((customer) => customer.id);
    const customerIds = Array.from(new Set([...manualIds, ...selectedIds]));
    const scheduleTime =
      formData.strategy === 'timed' ? fromInputDateTime(formData.scheduleTime) : null;
    const campaignPayload = {
      name: formData.name.trim() || '未命名计划',
      type: 'MIXED',
      run_immediately: formData.strategy === 'immediate',
      schedule_time: scheduleTime,
      customer_ids: customerIds.length ? customerIds : undefined,
      filter_rules: filterRules,
      created_by: formData.createdBy.trim() || undefined,
    };

    onCreate({
      campaign: campaignPayload,
      steps: stepPayloads,
      autoStart: formData.strategy === 'immediate',
    });
    onClose();
    reset();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose}></div>

      <div className="relative w-full max-w-4xl px-4 animate-in zoom-in-95 duration-300">
        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="p-8 border-b border-slate-100 bg-slate-50/50">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">配置新营销计划</h3>
                <p className="text-sm text-slate-500">基于客户画像与行为反馈构建自动化触达引擎</p>
              </div>
              <button
                className="w-10 h-10 rounded-full hover:bg-slate-200 flex items-center justify-center transition-colors text-slate-400"
                onClick={onClose}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex items-center justify-between max-w-2xl mx-auto relative px-4">
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 -translate-y-1/2 z-0"></div>
              {navItems.map((nav) => (
                <div
                  key={nav.id}
                  className={`relative z-10 flex flex-col items-center gap-2 transition-all ${step === nav.id ? 'opacity-100' : 'opacity-40'
                    }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-colors ${step === nav.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100'
                      : 'bg-white text-slate-400 border-slate-200'
                      }`}
                  >
                    {nav.id}
                  </div>
                  <span
                    className={`text-xs font-bold ${step === nav.id ? 'text-blue-600' : 'text-slate-500'}`}
                  >
                    {nav.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-10">
            {step === 1 && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">计划名称</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                      placeholder="例如：大客户夏季回访计划"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">负责人/创建人</label>
                    <input
                      type="text"
                      value={formData.createdBy}
                      onChange={(e) => setFormData({ ...formData, createdBy: e.target.value })}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                      placeholder="例如：marketing-ops"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-bold text-slate-700">选择目标客户群体</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { id: 'all', label: '全量客户', icon: 'groups' },
                      { id: 'tags', label: '按标签筛选', icon: 'label' },
                      { id: 'groups', label: '客户分组', icon: 'folder_shared' },
                      { id: 'customers', label: '指定客户', icon: 'person_add' },
                      { id: 'search', label: '高级筛选', icon: 'filter_list' },
                    ].map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setFormData({ ...formData, scopeType: type.id })}
                        className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${formData.scopeType === type.id
                          ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-sm'
                          : 'border-slate-100 text-slate-500 hover:border-slate-200'
                          }`}
                      >
                        <span className="material-symbols-outlined">{type.icon}</span>
                        <span className="text-xs font-bold">{type.label}</span>
                      </button>
                    ))}
                  </div>

                  {formData.scopeType === 'tags' && (
                    <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 animate-in slide-in-from-top-2">
                      <p className="text-[10px] font-bold text-blue-400 uppercase mb-2">输入标签（回车添加）</p>
                      <input
                        className="w-full bg-transparent border-b border-blue-200 outline-none py-1 text-sm text-blue-900 placeholder:text-blue-300"
                        placeholder="例如：OEM, HighValue..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = (e.target as HTMLInputElement).value.trim();
                            if (val && !formData.selectedTags.includes(val)) {
                              setFormData({
                                ...formData,
                                selectedTags: [...formData.selectedTags, val],
                              });
                              (e.target as HTMLInputElement).value = '';
                            }
                          }
                        }}
                      />
                      <div className="flex flex-wrap gap-2 mt-3">
                        {formData.selectedTags.map((tag) => (
                          <span
                            key={tag}
                            className="bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1"
                          >
                            {tag}
                            <button
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  selectedTags: formData.selectedTags.filter((t) => t !== tag),
                                })
                              }
                            >
                              <span className="material-symbols-outlined text-xs">close</span>
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {formData.scopeType === 'groups' && (
                    <div className="animate-in slide-in-from-top-2">
                      <select
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500"
                        value={formData.selectedGroupId}
                        onChange={(e) => setFormData({ ...formData, selectedGroupId: e.target.value })}
                      >
                        <option value="">选择一个客户分组...</option>
                        {groupOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formData.scopeType === 'customers' && (
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4 animate-in slide-in-from-top-2">
                      <div className="flex flex-wrap gap-3 items-center">
                        <input
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          className="flex-1 min-w-[220px] bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500"
                          placeholder="搜索姓名/邮箱/手机号"
                        />
                        <button
                          onClick={searchCustomers}
                          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold"
                        >
                          搜索
                        </button>
                      </div>

                      {customerLoading && (
                        <div className="text-xs text-slate-400">若搜索...</div>
                      )}

                      {customerResults.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {customerResults
                            .filter(
                              (item) => !selectedCustomers.some((selected) => selected.id === item.id)
                            )
                            .map((customer) => (
                              <div
                                key={customer.id}
                                className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between"
                              >
                                <div>
                                  <div className="text-sm font-semibold text-slate-800">
                                    {formatCustomerOption(customer)}
                                  </div>
                                  <div className="text-[10px] text-slate-400">ID: {customer.id}</div>
                                </div>
                                <button
                                  onClick={() => addSelectedCustomer(customer)}
                                  className="text-xs font-bold text-emerald-600 hover:text-emerald-800"
                                >
                                  添加
                                </button>
                              </div>
                            ))}
                        </div>
                      )}

                      {selectedCustomers.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">已选客户</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {selectedCustomers.map((customer) => (
                              <span
                                key={customer.id}
                                className="bg-slate-900 text-white px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1"
                              >
                                {formatCustomerOption(customer)}
                                <button onClick={() => removeSelectedCustomer(customer.id)}>
                                  <span className="material-symbols-outlined text-xs">close</span>
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {formData.scopeType === 'search' && (
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4 animate-in slide-in-from-top-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">国家</label>
                          <input
                            value={formData.country}
                            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500"
                            placeholder="US"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">国家代码</label>
                          <input
                            value={formData.countryCode}
                            onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500"
                            placeholder="1"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">是否已营销</label>
                          <select
                            value={formData.hasMarketed}
                            onChange={(e) => setFormData({ ...formData, hasMarketed: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500"
                          >
                            <option value="any">不限</option>
                            <option value="yes">已营销</option>
                            <option value="no">未营销</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">客户 ID 列表</label>
                          <input
                            value={formData.customerIds}
                            onChange={(e) => setFormData({ ...formData, customerIds: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500"
                            placeholder="1, 2, 3"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Email 状态</label>
                          <input
                            value={formData.lastEmailStatus}
                            onChange={(e) => setFormData({ ...formData, lastEmailStatus: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500"
                            placeholder="delivered / opened"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">WhatsApp 状态</label>
                          <input
                            value={formData.lastWhatsappStatus}
                            onChange={(e) =>
                              setFormData({ ...formData, lastWhatsappStatus: e.target.value })
                            }
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500"
                            placeholder="delivered / read"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">SMS 状态</label>
                          <input
                            value={formData.lastSmsStatus}
                            onChange={(e) => setFormData({ ...formData, lastSmsStatus: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500"
                            placeholder="delivered / failed"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-400">
                        高级筛选会映射到 campaign.filter_rules 字段，可与客户 ID 列表并用。                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <label className="text-sm font-bold text-slate-700 block mb-4">触发与排期方式</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      id: 'immediate',
                      title: '立即触发',
                      desc: '客户一旦符合条件（如新注册）立即启动流程',
                      icon: 'bolt',
                    },
                    {
                      id: 'timed',
                      title: '定时/周期',
                      desc: '在指定时间点或按固定周期（如每周一）批量处理',
                      icon: 'event',
                    },
                  ].map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setFormData({ ...formData, strategy: item.id })}
                      className={`p-6 border-2 rounded-3xl cursor-pointer flex items-center gap-5 transition-all ${formData.strategy === item.id
                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                        : 'border-slate-100 bg-white hover:border-slate-200'
                        }`}
                    >
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center ${formData.strategy === item.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-400'
                          }`}
                      >
                        <span className="material-symbols-outlined">{item.icon}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-800">{item.title}</p>
                        <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {formData.strategy === 'timed' && (
                  <div className="p-6 bg-slate-50/70 border border-slate-100 rounded-3xl">
                    <label className="text-sm font-bold text-slate-700">璁″垝鎵ц鏃堕棿</label>
                    <input
                      type="datetime-local"
                      value={formData.scheduleTime}
                      onChange={(e) => setFormData({ ...formData, scheduleTime: e.target.value })}
                      className="w-full mt-3 px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:border-blue-500 outline-none"
                    />
                    <p className="text-xs text-slate-400 mt-2">
                      瀹氭椂璁″垝鍒涘缓鍚庝笉浼氱珛鍗冲惎鍔紝闇€瑕佸湪鍒楄〃涓墜鍔ㄥ紑濮嬨€?                    </p>
                  </div>
                )}
              </div>
            )}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-sm font-bold text-slate-700">
                      鑷姩鍖栬Е杈炬祦姘寸嚎 ({formData.steps.length})
                    </h4>
                    {templateLoading && <p className="text-xs text-slate-400 mt-1">妯℃澘鍔犺浇涓?..</p>}
                    {templateError && <p className="text-xs text-amber-600 mt-1">{templateError}</p>}
                  </div>
                  <button
                    onClick={addStep}
                    className="bg-slate-900 text-white text-xs px-4 py-2 rounded-xl font-bold flex items-center gap-1 hover:bg-slate-800"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>增加触达轮次
                  </button>
                </div>

                <div className="space-y-6 relative before:absolute before:left-5 before:top-10 before:bottom-10 before:w-0.5 before:bg-slate-100">
                  {formData.steps.map((s, i) => (
                    <div key={i} className="relative pl-12">
                      <div className="absolute left-0 top-0 w-10 h-10 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-500 z-10">
                        {i + 1}
                      </div>
                      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div className="flex gap-4">
                              <div className="flex-1 space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">触达渠道</label>
                                <select
                                  value={s.channel}
                                  onChange={(e) =>
                                    updateStep(i, {
                                      channel: e.target.value as CampaignStepForm['channel'],
                                    })
                                  }
                                  className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs outline-none focus:border-blue-500"
                                >
                                  <option value="EMAIL">Email 邮件</option>
                                  <option value="WHATSAPP">WhatsApp</option>
                                  <option value="SMS">手机短信</option>
                                </select>
                              </div>
                              <div className="flex-1 space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">执行延迟</label>
                                <select
                                  value={s.delayDays}
                                  onChange={(e) =>
                                    updateStep(i, { delayDays: parseInt(e.target.value, 10) })
                                  }
                                  className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs outline-none focus:border-blue-500"
                                >
                                  <option value={0}>立即 (0天)</option>
                                  <option value={1}>1 天后</option>
                                  <option value={3}>3 天后</option>
                                  <option value={7}>7 天后</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">
                                过滤与条件触发 (Filter Rules)
                              </label>
                              <div className="flex gap-2">
                                <select
                                  value={s.filterRule}
                                  onChange={(e) =>
                                    updateStep(i, {
                                      filterRule: e.target.value as CampaignStepForm['filterRule'],
                                    })
                                  }
                                  className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs outline-none focus:border-blue-500"
                                >
                                  <option value="none">无条件执行</option>
                                  <option value="opened">前序邮件 已开启</option>
                                  <option value="not_opened">前序邮件 未开启</option>
                                  <option value="replied">前序消息 已回复</option>
                                  <option value="not_replied">前序消息 未回复</option>
                                </select>
                                {s.filterRule !== 'none' && (
                                  <div className="w-24 flex items-center gap-1 text-[10px] font-bold text-slate-500">
                                    在
                                    <input
                                      type="number"
                                      value={s.withinDays}
                                      onChange={(e) =>
                                        updateStep(i, { withinDays: parseInt(e.target.value, 10) })
                                      }
                                      className="w-10 bg-slate-50 border border-slate-100 rounded-lg p-1 text-center outline-none"
                                    />
                                    天内
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">本地模板</label>
                            <select
                              value={s.templateId}
                              onChange={(e) => {
                                const selectedId = e.target.value;
                                updateStep(i, { templateId: selectedId });
                                const template = templates.find((item) => String(item.id) === selectedId);
                                if (template) {
                                  if (!s.subject && template.subject) {
                                    updateStep(i, { subject: template.subject || '' });
                                  }
                                  if (!s.content && template.content) {
                                    updateStep(i, { content: template.content || '' });
                                  }
                                }
                              }}
                              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs outline-none focus:border-blue-500"
                            >
                              <option value="">不使用模板</option>
                              {templates
                                .filter((item) => item.channel === s.channel)
                                .map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.name} (#{item.id})
                                  </option>
                                ))}
                            </select>
                          </div>
                          {s.channel === 'EMAIL' && (
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">邮件标题</label>
                              <input
                                value={s.subject}
                                onChange={(e) => updateStep(i, { subject: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs outline-none focus:border-blue-500"
                                placeholder="例如：欢迎加入我们的活动"
                              />
                            </div>
                          )}
                        </div>

                        {s.channel === 'WHATSAPP' && (
                          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">
                                WhatsApp 模板 (content_sid)
                              </label>
                              <select
                                value={s.contentSid}
                                onChange={(e) => updateStep(i, { contentSid: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs outline-none focus:border-blue-500"
                              >
                                <option value="">不使用模板</option>
                                {whatsAppTemplates.map((item) => (
                                  <option key={item.sid} value={item.sid}>
                                    {item.friendly_name || item.sid}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">变量 JSON</label>
                              <input
                                value={s.contentVariables}
                                onChange={(e) => updateStep(i, { contentVariables: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs outline-none focus:border-blue-500"
                                placeholder='{\"1\": \"Alice\"}'
                              />
                            </div>
                          </div>
                        )}

                        <div className="mt-6 space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">发送内容</label>
                          <textarea
                            value={s.content}
                            onChange={(e) => updateStep(i, { content: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs outline-none focus:border-blue-500 min-h-[90px]"
                            placeholder="可留空以使用模板内容"
                          />
                          {jsonErrors[i] && <p className="text-xs text-rose-500 mt-2">{jsonErrors[i]}</p>}
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">
                            内容可使用模板或自定义文本
                          </span>
                          {formData.steps.length > 1 && (
                            <button
                              onClick={() => removeStep(i)}
                              className="text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="flex flex-col items-center justify-center py-6 animate-in fade-in duration-300">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-5xl fill-icon">verified</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900">计划配置完成！</h3>
                <p className="text-slate-500 mt-2 max-w-sm text-center">
                  该计划将针对{' '}
                  <span className="text-blue-600 font-bold">{formData.scopeType === 'all' ? '全部客户' : formData.scopeType === 'tags' ? '指定标签客户' : formData.scopeType === 'groups' ? '指定分组客户' : formData.scopeType === 'customers' ? '指定 ID 客户' : '目标客户'}</span>{' '}
                  执行 <span className="text-slate-900 font-bold">{formData.steps.length} 个触达步骤</span>。
                </p>
                <div className="mt-8 p-8 bg-slate-50 rounded-[2rem] w-full max-w-lg border border-slate-100 space-y-4 shadow-inner">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">计划名</span>
                    <span className="font-bold text-slate-800">{formData.name || '未命名计划'}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">目标范围</span>
                    <span className="font-bold text-blue-600">{formData.scopeType === 'all' ? '全部' : formData.scopeType === 'tags' ? `标签: ${formData.selectedTags.join(', ')}` : formData.scopeType === 'groups' ? '分组' : formData.scopeType === 'customers' ? `客户 (${selectedCustomers.length})` : '未知'}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">触发策略</span>
                    <span className="font-bold text-slate-800">
                      {formData.strategy === 'immediate' ? '立即触发' : '定时/周期'}
                    </span>
                  </div>
                  {formData.strategy === 'timed' && (
                    <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">计划时间</span>
                      <span className="font-bold text-slate-800">
                        {formData.scheduleTime || '未设置'}
                      </span>
                    </div>
                  )}
                  {formData.createdBy && (
                    <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">负责人</span>
                      <span className="font-bold text-slate-800">{formData.createdBy}</span>
                    </div>
                  )}
                  <div className="space-y-2">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">执行路线概览</span>
                    <div className="flex gap-2 flex-wrap">
                      {formData.steps.map((s, idx) => (
                        <div
                          key={idx}
                          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-bold flex items-center gap-1.5 shadow-sm"
                        >
                          <span className="text-blue-600">{s.channel}</span>
                          <span className="material-symbols-outlined text-[10px] text-slate-300">
                            arrow_forward
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-8 border-t border-slate-100 flex justify-between items-center bg-white">
            <button
              onClick={() => (step === 1 ? onClose() : setStep(step - 1))}
              className="px-8 py-3 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
              {step === 1 ? '取消创建' : '返回上一步'}
            </button>
            <button
              onClick={handleNext}
              className={`px-10 py-4 font-bold rounded-2xl shadow-xl transition-all ${step === totalSteps
                ? 'bg-emerald-600 text-white shadow-emerald-100 hover:bg-emerald-700 hover:scale-105'
                : 'bg-blue-600 text-white shadow-blue-100 hover:bg-blue-700'
                }`}
            >
              {step === totalSteps ? '立即启用营销引擎' : '确认并下一步'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignWizard;





