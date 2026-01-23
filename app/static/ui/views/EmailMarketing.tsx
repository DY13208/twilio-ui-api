import React, { useEffect, useMemo, useState } from 'react';
import {
  apiFetch,
  formatDateTime,
  fromInputDateTime,
  parseList,
  readJson,
  toInputDateTime,
} from '../api';

type Notice = { type: 'success' | 'error' | 'info'; message: string };

interface EmailSenderItem {
  from_email: string;
  from_name?: string | null;
}

interface SendResult {
  recipient: string;
  status: string;
  error?: string | null;
}

interface EmailCampaignItem {
  id: number;
  name: string;
  recipients: string[];
  subject?: string | null;
  text?: string | null;
  html?: string | null;
  from_email?: string | null;
  status: string;
  error?: string | null;
  schedule_at?: string | null;
  followup_enabled: boolean;
  followup_delay_minutes?: number | null;
  followup_condition?: string | null;
  followup_subject?: string | null;
  followup_text?: string | null;
  followup_html?: string | null;
  created_at: string;
  updated_at: string;
}

const EmailMarketing: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'send' | 'senders' | 'campaigns'>('send');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [senders, setSenders] = useState<EmailSenderItem[]>([]);
  const [sendersLoading, setSendersLoading] = useState(false);
  const [selectedSender, setSelectedSender] = useState('');
  const [sendForm, setSendForm] = useState({
    recipients: '',
    subject: '',
    body: '',
    replyTo: '',
    useHtml: false,
  });
  const [sendResults, setSendResults] = useState<SendResult[]>([]);
  const [sendLoading, setSendLoading] = useState(false);
  const [showAddSender, setShowAddSender] = useState(false);
  const [newSenderEmail, setNewSenderEmail] = useState('');
  const [campaigns, setCampaigns] = useState<EmailCampaignItem[]>([]);
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    recipients: '',
    subject: '',
    body: '',
    fromEmail: '',
    scheduleAt: '',
    useHtml: false,
    followupEnabled: false,
    followupDelayMinutes: 1440,
    followupCondition: 'unread',
    followupSubject: '',
    followupBody: '',
  });

  const protectedSender = useMemo(
    () => (senders.length ? senders[0].from_email : ''),
    [senders]
  );

  const showNotice = (type: Notice['type'], message: string) => {
    setNotice({ type, message });
  };

  const loadSenders = async () => {
    if (sendersLoading) {
      return;
    }
    setSendersLoading(true);
    try {
      const response = await apiFetch('api/email/senders');
      const data = await readJson<{ senders?: EmailSenderItem[]; detail?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.detail || '加载发件人失败。');
      }
      const items = data?.senders || [];
      setSenders(items);
      if (!selectedSender && items.length) {
        setSelectedSender(items[0].from_email);
      }
      if (!campaignForm.fromEmail && items.length) {
        setCampaignForm((prev) => ({ ...prev, fromEmail: items[0].from_email }));
      }
    } catch (error: any) {
      showNotice('error', error?.message || '加载发件人失败。');
    } finally {
      setSendersLoading(false);
    }
  };

  const loadCampaigns = async () => {
    setCampaignLoading(true);
    try {
      const response = await apiFetch('api/email/campaigns');
      const data = await readJson<{ campaigns?: EmailCampaignItem[]; detail?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.detail || '加载跟进流程失败。');
      }
      setCampaigns(data?.campaigns || []);
    } catch (error: any) {
      showNotice('error', error?.message || '加载跟进流程失败。');
    } finally {
      setCampaignLoading(false);
    }
  };

  const handleSend = async () => {
    const recipients = parseList(sendForm.recipients);
    if (!recipients.length) {
      showNotice('error', '请填写收件人地址。');
      return;
    }
    if (!selectedSender) {
      showNotice('error', '请选择发件人白名单。');
      return;
    }
    if (!sendForm.subject.trim()) {
      showNotice('error', '请输入邮件主题。');
      return;
    }
    if (!sendForm.body.trim()) {
      showNotice('error', '请输入邮件正文。');
      return;
    }
    setSendLoading(true);
    try {
      const payload: Record<string, any> = {
        recipients,
        subject: sendForm.subject.trim(),
        from_email: selectedSender,
      };
      if (sendForm.useHtml) {
        payload.html = sendForm.body;
      } else {
        payload.text = sendForm.body;
      }
      const response = await apiFetch('api/send/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await readJson<{ results?: SendResult[]; detail?: string; batch_id?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.detail || '发送失败。');
      }
      setSendResults(data?.results || []);
      showNotice('success', `发送完成，批次 ${data?.batch_id || ''}`.trim());
    } catch (error: any) {
      showNotice('error', error?.message || '发送失败。');
    } finally {
      setSendLoading(false);
    }
  };

  const handleAddSender = async () => {
    const value = newSenderEmail.trim();
    if (!value) {
      showNotice('error', '请输入发件人邮箱。');
      return;
    }
    try {
      const response = await apiFetch('api/email/senders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_email: value }),
      });
      const data = await readJson<{ senders?: EmailSenderItem[]; detail?: string; status?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.detail || '添加失败。');
      }
      setSenders(data?.senders || []);
      setNewSenderEmail('');
      setShowAddSender(false);
      showNotice('success', data?.status === 'exists' ? '该发件人已存在。' : '已添加发件人。');
    } catch (error: any) {
      showNotice('error', error?.message || '添加失败。');
    }
  };

  const handleDeleteSender = async (fromEmail: string) => {
    try {
      const response = await apiFetch('api/email/senders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_email: fromEmail }),
      });
      const data = await readJson<{ senders?: EmailSenderItem[]; detail?: string; status?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.detail || '删除失败。');
      }
      setSenders(data?.senders || []);
      if (selectedSender === fromEmail) {
        setSelectedSender(data?.senders?.[0]?.from_email || '');
      }
      if (data?.status === 'protected') {
        showNotice('info', '系统默认发件人不可删除。');
      } else {
        showNotice('success', '已删除发件人。');
      }
    } catch (error: any) {
      showNotice('error', error?.message || '删除失败。');
    }
  };

  const resetCampaignForm = () => {
    setSelectedCampaignId(null);
    setCampaignForm({
      name: '',
      recipients: '',
      subject: '',
      body: '',
      fromEmail: selectedSender || '',
      scheduleAt: '',
      useHtml: false,
      followupEnabled: false,
      followupDelayMinutes: 1440,
      followupCondition: 'unread',
      followupSubject: '',
      followupBody: '',
    });
  };

  const selectCampaign = (campaign: EmailCampaignItem) => {
    setSelectedCampaignId(campaign.id);
    const bodyValue = campaign.html || campaign.text || '';
    setCampaignForm({
      name: campaign.name || '',
      recipients: (campaign.recipients || []).join(', '),
      subject: campaign.subject || '',
      body: bodyValue,
      fromEmail: campaign.from_email || selectedSender || '',
      scheduleAt: toInputDateTime(campaign.schedule_at || null),
      useHtml: Boolean(campaign.html && !campaign.text),
      followupEnabled: campaign.followup_enabled,
      followupDelayMinutes: campaign.followup_delay_minutes || 1440,
      followupCondition: campaign.followup_condition || 'unread',
      followupSubject: campaign.followup_subject || '',
      followupBody: campaign.followup_text || campaign.followup_html || '',
    });
  };

  const saveCampaign = async () => {
    const recipients = parseList(campaignForm.recipients);
    if (!campaignForm.name.trim()) {
      showNotice('error', '请输入流程名称。');
      return;
    }
    if (!recipients.length) {
      showNotice('error', '请输入收件人列表。');
      return;
    }
    if (!campaignForm.subject.trim()) {
      showNotice('error', '请输入邮件主题。');
      return;
    }
    if (!campaignForm.body.trim()) {
      showNotice('error', '请输入邮件内容。');
      return;
    }
    const payload: Record<string, any> = {
      name: campaignForm.name.trim(),
      recipients,
      subject: campaignForm.subject.trim(),
      from_email: campaignForm.fromEmail || selectedSender,
    };
    if (campaignForm.useHtml) {
      payload.html = campaignForm.body;
    } else {
      payload.text = campaignForm.body;
    }
    const scheduleAt = fromInputDateTime(campaignForm.scheduleAt);
    if (scheduleAt) {
      payload.schedule_at = scheduleAt;
    }
    if (campaignForm.followupEnabled) {
      payload.followup_enabled = true;
      payload.followup_delay_minutes = campaignForm.followupDelayMinutes;
      payload.followup_condition = campaignForm.followupCondition;
      if (campaignForm.followupSubject.trim()) {
        payload.followup_subject = campaignForm.followupSubject.trim();
      }
      if (campaignForm.followupBody.trim()) {
        payload.followup_text = campaignForm.followupBody;
      }
    }
    try {
      const endpoint = selectedCampaignId
        ? `api/email/campaigns/${selectedCampaignId}`
        : 'api/email/campaigns';
      const method = selectedCampaignId ? 'PATCH' : 'POST';
      const response = await apiFetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await readJson<{ detail?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.detail || '保存失败。');
      }
      showNotice('success', selectedCampaignId ? '流程已更新。' : '流程已创建。');
      loadCampaigns();
      if (!selectedCampaignId) {
        resetCampaignForm();
      }
    } catch (error: any) {
      showNotice('error', error?.message || '保存失败。');
    }
  };

  const handleCampaignAction = async (campaignId: number, action: 'start' | 'pause' | 'cancel') => {
    try {
      const response = await apiFetch(`api/email/campaigns/${campaignId}/${action}`, {
        method: 'POST',
      });
      const data = await readJson<{ detail?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.detail || '操作失败。');
      }
      showNotice('success', '流程状态已更新。');
      loadCampaigns();
    } catch (error: any) {
      showNotice('error', error?.message || '操作失败。');
    }
  };

  useEffect(() => {
    loadSenders();
  }, []);

  useEffect(() => {
    if (activeTab === 'campaigns') {
      loadCampaigns();
    }
  }, [activeTab]);

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Email 营销中心</h2>
          <p className="text-slate-500 mt-1">直接发送、管理发件人白名单及单次群发活动</p>
        </div>
        <div className="flex bg-white border border-slate-200 p-1 rounded-2xl shadow-sm">
          <button
            onClick={() => setActiveTab('send')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'send' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}
          >
            发送中心
          </button>
          <button
            onClick={() => setActiveTab('senders')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'senders' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}
          >
            发件人白名单
          </button>
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'campaigns' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}
          >
            跟进流程
          </button>
        </div>
      </div>

      {notice && (
        <div className={`px-6 py-4 rounded-2xl text-sm font-medium border ${
          notice.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : notice.type === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-600'
            : 'bg-slate-50 border-slate-200 text-slate-600'
        }`}>
          {notice.message}
        </div>
      )}

      {activeTab === 'send' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-sm space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600">send</span> 快速发送邮件
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">发件人 (白名单)</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500"
                    value={selectedSender}
                    onChange={(event) => setSelectedSender(event.target.value)}
                  >
                    {senders.length === 0 && (
                      <option value="">暂无发件人</option>
                    )}
                    {senders.map((sender) => (
                      <option key={sender.from_email} value={sender.from_email}>
                        {sender.from_name
                          ? `${sender.from_name} <${sender.from_email}>`
                          : sender.from_email}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">回复地址 (可选)</label>
                  <input
                    type="text"
                    value={sendForm.replyTo}
                    onChange={(event) => setSendForm({ ...sendForm, replyTo: event.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500"
                    placeholder="reply-to@..."
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">收件人 (支持逗号分隔)</label>
                <input
                  type="text"
                  value={sendForm.recipients}
                  onChange={(event) => setSendForm({ ...sendForm, recipients: event.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500"
                  placeholder="user1@example.com, user2@example.com"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">邮件主题</label>
                <input
                  type="text"
                  value={sendForm.subject}
                  onChange={(event) => setSendForm({ ...sendForm, subject: event.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500"
                  placeholder="输入邮件主题..."
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">内容正文 (HTML/Text)</label>
                  <label className="flex items-center gap-2 text-[10px] text-slate-400">
                    <input
                      type="checkbox"
                      checked={sendForm.useHtml}
                      onChange={(event) => setSendForm({ ...sendForm, useHtml: event.target.checked })}
                    />
                    作为 HTML
                  </label>
                </div>
                <textarea
                  rows={8}
                  value={sendForm.body}
                  onChange={(event) => setSendForm({ ...sendForm, body: event.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 font-mono"
                  placeholder="Hi {{name}}, ..."
                ></textarea>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleSend}
                disabled={sendLoading}
                className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-blue-100 hover:scale-[1.02] transition-all disabled:opacity-60"
              >
                {sendLoading ? '发送中...' : '立即群发'}
              </button>
              <button
                type="button"
                onClick={() => setSendForm({ ...sendForm, subject: '', body: '' })}
                className="px-6 border border-slate-200 rounded-2xl font-bold text-slate-500 hover:bg-slate-50"
              >
                清空内容
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900 rounded-[2rem] p-8 text-white">
              <h4 className="font-bold mb-4">发送建议</h4>
              <ul className="space-y-4 text-xs text-slate-400">
                <li className="flex gap-3">
                  <span className="material-symbols-outlined text-blue-400 text-sm">verified</span>
                  确保发件人地址已在 SendGrid 完成验证。
                </li>
                <li className="flex gap-3">
                  <span className="material-symbols-outlined text-blue-400 text-sm">tips_and_updates</span>
                  使用 <code>{`{{name}}`}</code> 等变量可自动匹配客户名称。
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200 p-8">
              <h4 className="font-bold mb-4">最近发送</h4>
              <div className="space-y-4">
                {sendResults.length === 0 ? (
                  <div className="text-xs text-slate-400">暂无发送记录。</div>
                ) : (
                  sendResults.map((item, idx) => (
                    <div key={`${item.recipient}-${idx}`} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                        <span className="material-symbols-outlined text-sm">mail</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{item.recipient}</p>
                        <p className="text-[10px] text-slate-400">{item.status}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'senders' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-sm animate-in slide-in-from-bottom-4">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold">发件人白名单管理</h3>
            <button
              onClick={() => setShowAddSender((prev) => !prev)}
              className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold"
            >
              + 添加发件人
            </button>
          </div>

          {showAddSender && (
            <div className="mb-6 flex flex-wrap gap-3 items-center bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <input
                value={newSenderEmail}
                onChange={(event) => setNewSenderEmail(event.target.value)}
                className="flex-1 min-w-[220px] bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500"
                placeholder="sender@example.com"
              />
              <button
                onClick={handleAddSender}
                className="bg-blue-600 text-white px-5 py-2 rounded-xl text-xs font-bold"
              >
                保存
              </button>
              <button
                onClick={() => {
                  setShowAddSender(false);
                  setNewSenderEmail('');
                }}
                className="border border-slate-200 px-5 py-2 rounded-xl text-xs font-bold text-slate-500"
              >
                取消
              </button>
            </div>
          )}

          <div className="overflow-hidden border border-slate-100 rounded-2xl">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">邮箱地址</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">状态</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {senders.map((sender) => {
                  const isProtected = sender.from_email === protectedSender;
                  return (
                    <tr key={sender.from_email} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-700">
                        {sender.from_name
                          ? `${sender.from_name} <${sender.from_email}>`
                          : sender.from_email}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isProtected ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
                        }`}>
                          {isProtected ? 'PROTECTED' : 'VERIFIED'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!isProtected && (
                          <button
                            onClick={() => handleDeleteSender(sender.from_email)}
                            className="text-rose-500 hover:text-rose-700 transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!senders.length && !sendersLoading && (
                  <tr>
                    <td colSpan={3} className="px-6 py-6 text-sm text-slate-400 text-center">
                      暂无发件人配置。
                    </td>
                  </tr>
                )}
                {sendersLoading && (
                  <tr>
                    <td colSpan={3} className="px-6 py-6 text-sm text-slate-400 text-center">
                      正在加载...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {activeTab === 'campaigns' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-sm space-y-6 animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">邮件跟进流程配置</h3>
              {selectedCampaignId && (
                <button
                  onClick={resetCampaignForm}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700"
                >
                  退出编辑
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">流程名称</label>
                  <input
                    value={campaignForm.name}
                    onChange={(event) => setCampaignForm({ ...campaignForm, name: event.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500"
                    placeholder="例如：新品介绍跟进"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">发件人</label>
                  <select
                    value={campaignForm.fromEmail}
                    onChange={(event) => setCampaignForm({ ...campaignForm, fromEmail: event.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500"
                  >
                    {senders.map((sender) => (
                      <option key={sender.from_email} value={sender.from_email}>
                        {sender.from_name
                          ? `${sender.from_name} <${sender.from_email}>`
                          : sender.from_email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">收件人</label>
                <input
                  value={campaignForm.recipients}
                  onChange={(event) => setCampaignForm({ ...campaignForm, recipients: event.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500"
                  placeholder="email1@example.com, email2@example.com"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">邮件主题</label>
                <input
                  value={campaignForm.subject}
                  onChange={(event) => setCampaignForm({ ...campaignForm, subject: event.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500"
                  placeholder="邮件主题"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">内容正文</label>
                  <label className="flex items-center gap-2 text-[10px] text-slate-400">
                    <input
                      type="checkbox"
                      checked={campaignForm.useHtml}
                      onChange={(event) => setCampaignForm({ ...campaignForm, useHtml: event.target.checked })}
                    />
                    作为 HTML
                  </label>
                </div>
                <textarea
                  rows={6}
                  value={campaignForm.body}
                  onChange={(event) => setCampaignForm({ ...campaignForm, body: event.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 font-mono"
                  placeholder="跟进邮件内容..."
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">定时发送 (可选)</label>
                  <input
                    type="datetime-local"
                    value={campaignForm.scheduleAt}
                    onChange={(event) => setCampaignForm({ ...campaignForm, scheduleAt: event.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">自动追发</label>
                  <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm">
                    <input
                      type="checkbox"
                      checked={campaignForm.followupEnabled}
                      onChange={(event) => setCampaignForm({ ...campaignForm, followupEnabled: event.target.checked })}
                    />
                    启用跟进邮件
                  </div>
                </div>
              </div>

              {campaignForm.followupEnabled && (
                <div className="space-y-4 bg-slate-50 border border-slate-200 rounded-2xl p-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">延迟分钟数</label>
                      <input
                        type="number"
                        min={60}
                        value={campaignForm.followupDelayMinutes}
                        onChange={(event) =>
                          setCampaignForm({
                            ...campaignForm,
                            followupDelayMinutes: Number.parseInt(event.target.value, 10) || 0,
                          })
                        }
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">追发条件</label>
                      <select
                        value={campaignForm.followupCondition}
                        onChange={(event) => setCampaignForm({ ...campaignForm, followupCondition: event.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500"
                      >
                        <option value="unread">未打开</option>
                        <option value="read">已打开</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">追发主题</label>
                    <input
                      value={campaignForm.followupSubject}
                      onChange={(event) => setCampaignForm({ ...campaignForm, followupSubject: event.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500"
                      placeholder="跟进邮件主题"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">追发内容</label>
                    <textarea
                      rows={4}
                      value={campaignForm.followupBody}
                      onChange={(event) => setCampaignForm({ ...campaignForm, followupBody: event.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500"
                      placeholder="跟进邮件内容..."
                    ></textarea>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button
                onClick={saveCampaign}
                className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-blue-100 hover:bg-blue-700"
              >
                {selectedCampaignId ? '更新流程' : '创建流程'}
              </button>
              <button
                onClick={resetCampaignForm}
                className="px-6 border border-slate-200 rounded-2xl font-bold text-slate-500 hover:bg-slate-50"
              >
                清空表单
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-[2rem] border border-slate-200 p-8">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold">跟进流程列表</h4>
                <button onClick={loadCampaigns} className="text-xs font-bold text-blue-600 hover:underline">
                  刷新
                </button>
              </div>
              <div className="space-y-4">
                {campaignLoading && (
                  <div className="text-xs text-slate-400">加载中...</div>
                )}
                {!campaignLoading && campaigns.length === 0 && (
                  <div className="text-xs text-slate-400">暂无流程。</div>
                )}
                {campaigns.map((campaign) => {
                  const status = campaign.status?.toUpperCase() || 'UNKNOWN';
                  const canStart = ['DRAFT', 'SCHEDULED', 'PAUSED'].includes(status);
                  const canPause = status === 'RUNNING';
                  const canCancel = !['COMPLETED', 'CANCELLED', 'FAILED'].includes(status);
                  return (
                    <div
                      key={campaign.id}
                      className={`border border-slate-100 rounded-2xl p-4 transition-colors ${
                        selectedCampaignId === campaign.id ? 'bg-blue-50/60 border-blue-200' : 'hover:bg-slate-50/60'
                      }`}
                      onClick={() => selectCampaign(campaign)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-sm font-bold text-slate-800">{campaign.name}</p>
                          <p className="text-[10px] text-slate-400">
                            收件人 {campaign.recipients?.length || 0} · 更新 {formatDateTime(campaign.updated_at)}
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          status === 'RUNNING' ? 'bg-emerald-100 text-emerald-600' :
                          status === 'DRAFT' ? 'bg-slate-100 text-slate-500' :
                          'bg-amber-100 text-amber-600'
                        }`}>
                          {status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {canStart && (
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              handleCampaignAction(campaign.id, 'start');
                            }}
                            className="text-xs font-bold text-blue-600 hover:underline"
                          >
                            启动
                          </button>
                        )}
                        {canPause && (
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              handleCampaignAction(campaign.id, 'pause');
                            }}
                            className="text-xs font-bold text-amber-600 hover:underline"
                          >
                            暂停
                          </button>
                        )}
                        {canCancel && (
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              handleCampaignAction(campaign.id, 'cancel');
                            }}
                            className="text-xs font-bold text-rose-500 hover:underline"
                          >
                            取消
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailMarketing;
