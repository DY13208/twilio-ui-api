import React, { useEffect, useState } from 'react';
import CampaignWizard from '../components/CampaignWizard';
import { apiFetch, formatDateTime, readJson } from '../api';

type NoticeTone = 'success' | 'error' | 'info';

interface NoticeState {
  type: NoticeTone;
  message: string;
}

interface MarketingCampaignItem {
  id: number;
  name: string;
  type: string;
  status: string;
  run_immediately: boolean;
  schedule_time?: string | null;
  customer_ids?: number[];
  filter_rules?: Record<string, any> | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  started_at?: string | null;
  completed_at?: string | null;
}

interface MarketingCampaignListResponse {
  campaigns?: MarketingCampaignItem[];
  detail?: string;
}

interface CampaignStepItem {
  id: number;
  order_no: number;
  channel: string;
  delay_days: number;
  filter_rules?: Record<string, any> | null;
  template_id?: number | null;
  subject?: string | null;
  content?: string | null;
  content_sid?: string | null;
  updated_at?: string;
}

interface CampaignStepListResponse {
  steps?: CampaignStepItem[];
  detail?: string;
}

interface CampaignExecutionItem {
  id: number;
  step_id: number;
  customer_id: number;
  channel: string;
  status: string;
  message_id?: number | null;
  note?: string | null;
  created_at?: string;
}

interface CampaignExecutionListResponse {
  executions?: CampaignExecutionItem[];
  detail?: string;
}

interface MarketingCustomerProgressItem {
  customer_id: number;
  name?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  mobile?: string | null;
  last_step_id?: number | null;
  last_step_order?: number | null;
  last_step_channel?: string | null;
  last_message_status?: string | null;
  last_message_at?: string | null;
  paused?: boolean;
}

interface MarketingCustomerProgressResponse {
  total?: number;
  customers?: MarketingCustomerProgressItem[];
  detail?: string;
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

const statusPill = (status: string) => {
  switch (status) {
    case 'RUNNING':
      return 'bg-emerald-100 text-emerald-700';
    case 'DRAFT':
      return 'bg-slate-100 text-slate-500';
    case 'COMPLETED':
      return 'bg-blue-100 text-blue-700';
    case 'STOPPED':
      return 'bg-rose-100 text-rose-700';
    default:
      return 'bg-slate-100 text-slate-500';
  }
};

const formatTarget = (campaign: MarketingCampaignItem) => {
  if (campaign.customer_ids?.length) {

    return `已选择 ${campaign.customer_ids.length} 个客户`;
  }
  const rules = campaign.filter_rules || {};
  if (rules.tags) {
    const tags = Array.isArray(rules.tags) ? rules.tags.join(', ') : String(rules.tags);

    return `客户标签：${tags}`;
  }
  if (rules.group_ids) {
    const groups = Array.isArray(rules.group_ids)
      ? rules.group_ids.join(', ')
      : String(rules.group_ids);

    return `客户分组：${groups}`;
  }
  if (rules.country || rules.country_code) {

    return `国家/地区：${rules.country || ''}${rules.country_code ? ` +${rules.country_code}` : ''
      }`;
  }
  if (Object.keys(rules).length) {

    return `已应用 ${Object.keys(rules).length} 个筛选条件`;
  }

  return '尚未设置目标客户';
};


const formatStepSnippet = (step: CampaignStepItem) => {
  const subject = step.subject?.trim();
  const content = step.content?.trim();
  const sid = step.content_sid?.trim();
  return subject || content || sid || '暂无内容摘要';
};

const formatRuleSnippet = (rules?: Record<string, any> | null) => {
  if (!rules || !Object.keys(rules).length) {
    return '未设置';
  }
  return JSON.stringify(rules);
};


const formatCustomerLabel = (customer: MarketingCustomerProgressItem) => {
  return (
    customer.name ||
    customer.email ||
    customer.whatsapp ||
    customer.mobile ||
    `客户 ${customer.customer_id}`
  );
};

const MarketingCampaigns: React.FC = () => {
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<MarketingCampaignItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<number, boolean>>({});
  const [stepCounts, setStepCounts] = useState<Record<number, number>>({});
  const [stepsByCampaign, setStepsByCampaign] = useState<Record<number, CampaignStepItem[]>>({});
  const [executionsByCampaign, setExecutionsByCampaign] = useState<
    Record<number, CampaignExecutionItem[]>
  >({});
  const [progressByCampaign, setProgressByCampaign] = useState<
    Record<number, MarketingCustomerProgressResponse>
  >({});
  const [detailsLoading, setDetailsLoading] = useState<Record<number, boolean>>({});

  const showNotice = (type: NoticeTone, message: string) => {
    setNotice({ type, message });
    window.setTimeout(() => setNotice(null), 4000);
  };

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const response = await apiFetch('api/marketing/campaigns');
      const data = await readJson<MarketingCampaignListResponse>(response);
      if (!response.ok) {
        showNotice('error', data?.detail || '用户管理');
        setCampaigns([]);
        return;
      }
      const items = data?.campaigns || [];
      setCampaigns(items);

      const stepResults = await Promise.all(
        items.map(async (campaign) => {
          const stepResponse = await apiFetch(`api/marketing/campaigns/${campaign.id}/steps`);
          const stepData = await readJson<CampaignStepListResponse>(stepResponse);
          return {
            id: campaign.id,
            steps: stepResponse.ok ? stepData?.steps || [] : [],
          };
        })
      );
      const countMap: Record<number, number> = {};
      const stepMap: Record<number, CampaignStepItem[]> = {};
      stepResults.forEach((result) => {
        countMap[result.id] = result.steps.length;
        stepMap[result.id] = result.steps;
      });
      setStepCounts(countMap);
      setStepsByCampaign((prev) => ({ ...prev, ...stepMap }));
    } catch (error) {
      showNotice('error', '加载营销计划失败，请检查网络或 API Key。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const handleCreate = async (payload: WizardSubmitPayload) => {
    setSaving(true);
    try {
      const response = await apiFetch('api/marketing/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload.campaign),
      });
      const data = await readJson<MarketingCampaignItem & { detail?: string }>(response);
      if (!response.ok || !data) {
        showNotice('error', data?.detail || '创建营销计划失败，请重试。');
        return;
      }

      if (payload.steps.length) {
        const stepResponse = await apiFetch(
          `api/marketing/campaigns/${data.id}/steps/batch`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ steps: payload.steps }),
          }
        );
        const stepData = await readJson<CampaignStepListResponse>(stepResponse);
        if (!stepResponse.ok) {
          showNotice('error', stepData?.detail || '步骤创建失败，请检查填写内容。');
        }
      }

      if (payload.autoStart && !payload.campaign.schedule_time) {
        await apiFetch(`api/marketing/campaigns/${data.id}/start`, { method: 'POST' });
      }

      showNotice('success', '营销计划创建成功。');
      loadCampaigns();
    } catch (error) {
      showNotice('error', '创建营销计划失败，请检查网络或权限。');
    } finally {
      setSaving(false);
    }
  };

  const handleCampaignAction = async (
    campaignId: number,
    action: 'start' | 'stop' | 'delete'
  ) => {
    try {
      const path =
        action === 'delete'
          ? `api/marketing/campaigns/${campaignId}`
          : `api/marketing/campaigns/${campaignId}/${action}`;
      const response = await apiFetch(path, { method: action === 'delete' ? 'DELETE' : 'POST' });
      const data = await readJson<{ detail?: string }>(response);
      if (!response.ok) {
        showNotice('error', data?.detail || '操作失败，请重试。');
        return;
      }
      showNotice('success', '操作已执行。');
      loadCampaigns();
    } catch (error) {
      showNotice('error', '操作失败，请检查网络或权限。');
    }
  };

  const loadCampaignDetails = async (campaignId: number, force = false) => {
    if (detailsLoading[campaignId]) {
      return;
    }
    if (!force && executionsByCampaign[campaignId] && progressByCampaign[campaignId]) {
      return;
    }
    setDetailsLoading((prev) => ({ ...prev, [campaignId]: true }));
    try {
      const [stepsResp, execResp, progressResp] = await Promise.all([
        apiFetch(`api/marketing/campaigns/${campaignId}/steps`),
        apiFetch(`api/marketing/campaigns/${campaignId}/executions?limit=10&offset=0`),
        apiFetch(`api/marketing/campaigns/${campaignId}/customers/progress`),
      ]);
      const stepsData = await readJson<CampaignStepListResponse>(stepsResp);
      const execData = await readJson<CampaignExecutionListResponse>(execResp);
      const progressData = await readJson<MarketingCustomerProgressResponse>(progressResp);

      if (stepsResp.ok) {
        const steps = stepsData?.steps || [];
        setStepsByCampaign((prev) => ({ ...prev, [campaignId]: steps }));
        setStepCounts((prev) => ({ ...prev, [campaignId]: steps.length }));
      }
      if (execResp.ok) {
        setExecutionsByCampaign((prev) => ({ ...prev, [campaignId]: execData?.executions || [] }));
      }
      if (progressResp.ok) {
        setProgressByCampaign((prev) => ({ ...prev, [campaignId]: progressData || {} }));
      }
    } catch (error) {
      showNotice('error', '加载详情失败，请检查网络或权限。');
    } finally {
      setDetailsLoading((prev) => ({ ...prev, [campaignId]: false }));
    }
  };

  const toggleDetails = (campaignId: number) => {
    const isOpen = !!expandedIds[campaignId];
    setExpandedIds((prev) => {
      const next = { ...prev };
      if (next[campaignId]) {
        delete next[campaignId];
      } else {
        next[campaignId] = true;
      }
      return next;
    });
    if (!isOpen) {
      loadCampaignDetails(campaignId);
    }
  };

  const handleCustomerState = async (campaignId: number, customerId: number, paused?: boolean) => {
    const action = paused ? 'resume' : 'pause';
    try {
      const response = await apiFetch(
        `api/marketing/campaigns/${campaignId}/customers/${customerId}/${action}`,
        { method: 'POST' }
      );
      const data = await readJson<{ detail?: string }>(response);
      if (!response.ok) {
        showNotice('error', data?.detail || '客户状态更新失败。');
        return;
      }
      loadCampaignDetails(campaignId, true);
    } catch (error) {
      showNotice('error', '客户状态更新失败，请稍后重试。');
    }
  };

  return (
    <div className="p-8 space-y-6 animate-in slide-in-from-right duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">营销计划管理</h2>
          <p className="text-slate-500 mt-1">设计自动化营销流程，实现全生命周期客户触达</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadCampaigns}
            className="text-sm font-bold text-slate-500 hover:text-slate-700"
          >
            刷新
          </button>
          <button
            onClick={() => setIsWizardOpen(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-blue-200 hover:scale-105 transition-all"
          >
            <span className="material-symbols-outlined">add_circle</span>
            {saving ? '创建中...' : '创建新计划'}
          </button>
        </div>
      </div>

      {notice && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-medium ${notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : notice.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
        >
          {notice.message}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-slate-400">加载中...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {campaigns.map((camp) => {
            const stepsCount = stepCounts[camp.id] ?? 0;
            const customerCount =
              camp.customer_ids?.length || progressByCampaign[camp.id]?.total || 0;
            const isExpanded = !!expandedIds[camp.id];
            const steps = stepsByCampaign[camp.id] || [];
            const executions = executionsByCampaign[camp.id] || [];
            const progress = progressByCampaign[camp.id]?.customers || [];
            const canStart = camp.status === 'DRAFT' || camp.status === 'SCHEDULED';
            return (
              <div
                key={camp.id}
                className="bg-white border border-slate-200 rounded-3xl p-6 hover:border-blue-300 transition-all group"
              >
                <div className="flex justify-between items-start mb-6">
                  <div
                    className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${statusPill(
                      camp.status
                    )}`}
                  >
                    {camp.status}
                  </div>
                  <div className="flex gap-2 text-slate-400">
                    <button
                      onClick={() => toggleDetails(camp.id)}
                      className="hover:text-blue-600 transition-colors"
                    >
                      <span className="material-symbols-outlined text-xl">
                        {isExpanded ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                    {camp.status === 'RUNNING' && (
                      <button
                        onClick={() => handleCampaignAction(camp.id, 'stop')}
                        className="hover:text-amber-600 transition-colors"
                      >
                        <span className="material-symbols-outlined text-xl">pause_circle</span>
                      </button>
                    )}
                    {canStart && (
                      <button
                        onClick={() => handleCampaignAction(camp.id, 'start')}
                        className="hover:text-emerald-600 transition-colors"
                      >
                        <span className="material-symbols-outlined text-xl">play_circle</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleCampaignAction(camp.id, 'delete')}
                      className="hover:text-red-500 transition-colors"
                    >
                      <span className="material-symbols-outlined text-xl">delete</span>
                    </button>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {camp.name}
                </h3>
                <p className="text-sm text-slate-500 mt-2 mb-6 h-10 overflow-hidden text-ellipsis line-clamp-2">
                  {formatTarget(camp)}
                </p>
                <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      <img
                        className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                        src="https://picsum.photos/32/32?random=1"
                      />
                      <img
                        className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                        src="https://picsum.photos/32/32?random=2"
                      />
                      <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">
                        +{customerCount}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-400">{stepsCount} 个执行步骤</span>
                </div>

                {isExpanded && (
                  <div className="mt-6 pt-6 border-t border-slate-100 space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-700">计划步骤</h4>
                      <button
                        onClick={() => loadCampaignDetails(camp.id, true)}
                        className="text-xs font-bold text-blue-600 hover:underline"
                      >
                        刷新详情
                      </button>
                    </div>

                    {detailsLoading[camp.id] ? (
                      <div className="text-xs text-slate-400">加载中..</div>
                    ) : (
                      <>
                        {steps.length ? (
                          <div className="grid grid-cols-1 gap-3">
                            {steps.map((step) => (
                              <div
                                key={step.id}
                                className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="text-sm font-bold text-slate-700">
                                    #{step.order_no} · {step.channel}
                                  </div>
                                  <div className="text-xs text-slate-400">
                                    延迟 {step.delay_days} 天                                </div>
                                </div>
                                <div className="text-xs text-slate-500 mt-2">
                                  模板：{step.template_id ? `#${step.template_id}` : '自定义'}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                  筛选：{formatRuleSnippet(step.filter_rules)}
                                </div>
                                <div className="text-xs text-slate-400 mt-1">
                                  内容：{formatStepSnippet(step)}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400">暂无步骤，请先添加步骤</div>
                        )}

                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <h4 className="text-sm font-bold text-slate-700 mb-2">步骤执行记录</h4>
                            {executions.length ? (
                              <div className="space-y-2">
                                {executions.map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-2"
                                  >
                                    <div>
                                      客户 {item.customer_id} · 步骤 {item.step_id} · {item.channel}
                                    </div>
                                    <div className="text-slate-400">
                                      {item.status} · {formatDateTime(item.created_at)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-xs text-slate-400">暂无执行记录。</div>
                            )}
                          </div>

                          <div>
                            <h4 className="text-sm font-bold text-slate-700 mb-2">客户进度</h4>
                            {progress.length ? (
                              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                {progress.map((customer) => (
                                  <div
                                    key={customer.customer_id}
                                    className="flex items-center justify-between gap-3 text-xs text-slate-500 border-b border-slate-100 pb-2"
                                  >
                                    <div>
                                      <div className="text-sm font-bold text-slate-700">
                                        {formatCustomerLabel(customer)}
                                      </div>
                                      <div className="text-slate-400 mt-1">
                                        当前步骤 {customer.last_step_order || '-'} ·{' '}
                                        {customer.last_step_channel || '-'} ·{' '}
                                        {customer.last_message_status || '-'}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-slate-400">
                                        {formatDateTime(customer.last_message_at)}
                                      </div>
                                      <button
                                        onClick={() =>
                                          handleCustomerState(
                                            camp.id,
                                            customer.customer_id,
                                            customer.paused
                                          )
                                        }
                                        className="text-xs font-bold text-blue-600 hover:underline mt-1"
                                      >
                                        {customer.paused ? '恢复' : '暂停'}
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-xs text-slate-400">暂无客户进度</div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <CampaignWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
};

export default MarketingCampaigns;

