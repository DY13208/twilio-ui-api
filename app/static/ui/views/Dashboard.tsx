import React, { useEffect, useState } from 'react';
import { apiFetch, formatDateTime, readJson } from '../api';

interface StatCard {
  label: string;
  value: string;
  trend?: string;
  tone?: 'positive' | 'negative' | 'neutral';
  icon: string;
  color: string;
}

interface MarketingCampaignItem {
  id: number;
  name: string;
  status: string;
  updated_at?: string;
}

interface MarketingCampaignListResponse {
  campaigns?: MarketingCampaignItem[];
  detail?: string;
}

interface CustomerListResponse {
  total?: number;
  detail?: string;
}

interface ChatUsersResponse {
  total?: number;
  detail?: string;
}

interface CampaignStepListResponse {
  steps?: Array<{ id: number }>;
  detail?: string;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<StatCard[]>([]);
  const [campaigns, setCampaigns] = useState<MarketingCampaignItem[]>([]);
  const [stepCounts, setStepCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadDashboard = async () => {
    setLoading(true);
    setNotice(null);
    try {
      const [customerResp, campaignResp, chatResp] = await Promise.all([
        apiFetch('api/customers?limit=1&offset=0'),
        apiFetch('api/marketing/campaigns'),
        apiFetch('api/chat/users?limit=1&offset=0'),
      ]);
      const customerData = await readJson<CustomerListResponse>(customerResp);
      const campaignData = await readJson<MarketingCampaignListResponse>(campaignResp);
      const chatData = await readJson<ChatUsersResponse>(chatResp);

      if (!customerResp.ok || !campaignResp.ok) {
        setNotice('无法加载仪表盘数据，请确认 API Key 或权限。');
      }

      const totalCustomers = customerData?.total || 0;
      const allCampaigns = campaignData?.campaigns || [];
      const runningCampaigns = allCampaigns.filter((item) => item.status === 'RUNNING');
      const chatUsers = chatData?.total || 0;

      setStats([
        {
          label: '客户总数',
          value: totalCustomers.toLocaleString('zh-CN'),
          trend: '实时',
          tone: 'neutral',
          icon: 'group',
          color: 'bg-blue-100 text-blue-600',
        },
        {
          label: '运行中计划',
          value: runningCampaigns.length.toString(),
          trend: '实时',
          tone: 'neutral',
          icon: 'rocket_launch',
          color: 'bg-emerald-100 text-emerald-600',
        },
        {
          label: '聊天用户',
          value: chatUsers.toLocaleString('zh-CN'),
          trend: '实时',
          tone: 'neutral',
          icon: 'forum',
          color: 'bg-amber-100 text-amber-600',
        },
        {
          label: '营销计划总数',
          value: allCampaigns.length.toString(),
          trend: '实时',
          tone: 'neutral',
          icon: 'workspaces',
          color: 'bg-indigo-100 text-indigo-600',
        },
      ]);

      const topCampaigns = runningCampaigns.slice(0, 3);
      setCampaigns(topCampaigns);

      const stepResults = await Promise.all(
        topCampaigns.map(async (campaign) => {
          const response = await apiFetch(`api/marketing/campaigns/${campaign.id}/steps`);
          const data = await readJson<CampaignStepListResponse>(response);
          return {
            id: campaign.id,
            count: response.ok ? data?.steps?.length || 0 : 0,
          };
        })
      );
      const countMap: Record<number, number> = {};
      stepResults.forEach((result) => {
        countMap[result.id] = result.count;
      });
      setStepCounts(countMap);
    } catch (error) {
      setNotice('加载仪表盘失败，请稍后重试。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const renderTrend = (stat: StatCard) => {
    if (!stat.trend) {
      return null;
    }
    const toneClass =
      stat.tone === 'positive'
        ? 'bg-emerald-50 text-emerald-600'
        : stat.tone === 'negative'
        ? 'bg-rose-50 text-rose-600'
        : 'bg-slate-100 text-slate-500';
    return (
      <span className={`text-xs font-bold px-2 py-1 rounded-full ${toneClass}`}>{stat.trend}</span>
    );
  };

  const progressForStatus = (status: string) => {
    if (status === 'COMPLETED') {
      return 100;
    }
    if (status === 'RUNNING') {
      return 60;
    }
    if (status === 'STOPPED') {
      return 30;
    }
    return 15;
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">控制台概览</h1>
        <p className="text-slate-500 mt-1">欢迎回来，以下是您智能营销活动的最新数据摘要。</p>
      </div>

      {notice && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {notice}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl ${stat.color}`}>
                <span className="material-symbols-outlined fill-icon">{stat.icon}</span>
              </div>
              {renderTrend(stat)}
            </div>
            <div className="space-y-1">
              <h3 className="text-slate-500 text-sm font-medium">{stat.label}</h3>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">活跃营销计划状态</h2>
            <button
              onClick={loadDashboard}
              className="text-blue-600 text-sm font-bold hover:underline"
            >
              {loading ? '刷新中...' : '刷新'}
            </button>
          </div>
          <div className="space-y-4">
            {campaigns.length ? (
              campaigns.map((campaign) => {
                const stepsCount = stepCounts[campaign.id] ?? 0;
                const progress = progressForStatus(campaign.status);
                return (
                  <div
                    key={campaign.id}
                    className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                      {stepsCount || '-'}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900">{campaign.name}</h4>
                      <p className="text-xs text-slate-500">
                        状态 {campaign.status} · 步骤 {stepsCount} · 更新{' '}
                        {formatDateTime(campaign.updated_at)}
                      </p>
                    </div>
                    <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600" style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-sm text-slate-400">暂无运行中的计划。</div>
            )}
          </div>
        </div>

        <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-xl font-bold mb-2">AI 智能建议</h2>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              基于过去 7 天的数据，我们发现针对{' '}
              <span className="text-blue-400 font-bold">东南亚地区</span> 的 WhatsApp 营销转化率比平均水平高出
              24%。
            </p>
            <button className="w-full bg-blue-600 py-3 rounded-2xl font-bold text-sm hover:bg-blue-500 transition-colors">
              立即应用优化建议
            </button>
          </div>
          <div className="absolute top-[-20px] right-[-20px] opacity-10">
            <span className="material-symbols-outlined text-[120px]">smart_toy</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
