
import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch, parseList, readJson } from '../api';

type Notice = { type: 'success' | 'error' | 'info'; message: string };

interface WhatsAppTemplateItem {
  sid: string;
  friendly_name?: string | null;
  language?: string | null;
  status?: string | null;
  variables?: string[] | null;
}

interface SendResult {
  recipient: string;
  status: string;
  error?: string | null;
}

const WhatsAppMarketing: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'send' | 'templates' | 'senders'>('send');
  const [sendMode, setSendMode] = useState<'text' | 'template'>('text');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [senders, setSenders] = useState<string[]>([]);
  const [sendersLoading, setSendersLoading] = useState(false);
  const [showAddSender, setShowAddSender] = useState(false);
  const [newSenderAddress, setNewSenderAddress] = useState('');
  const [templates, setTemplates] = useState<WhatsAppTemplateItem[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [sendResults, setSendResults] = useState<SendResult[]>([]);
  const [sendForm, setSendForm] = useState({
    fromAddress: '',
    recipients: '',
    body: '',
    mediaUrls: '',
    templateSid: '',
  });
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.sid === sendForm.templateSid),
    [templates, sendForm.templateSid]
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
      const response = await apiFetch('api/whatsapp/senders');
      const data = await readJson<{ senders?: string[]; detail?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.detail || '加载发送人失败。');
      }
      const items = data?.senders || [];
      setSenders(items);
      if (!sendForm.fromAddress && items.length) {
        setSendForm((prev) => ({ ...prev, fromAddress: items[0] }));
      }
    } catch (error: any) {
      showNotice('error', error?.message || '加载发送人失败。');
    } finally {
      setSendersLoading(false);
    }
  };

  const loadTemplates = async () => {
    if (templatesLoading) {
      return;
    }
    setTemplatesLoading(true);
    try {
      const response = await apiFetch('api/whatsapp/templates?limit=50');
      const data = await readJson<{ templates?: WhatsAppTemplateItem[]; detail?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.detail || '加载模板失败。');
      }
      setTemplates(data?.templates || []);
    } catch (error: any) {
      showNotice('error', error?.message || '加载模板失败。');
    } finally {
      setTemplatesLoading(false);
    }
  };

  const handleSend = async () => {
    const recipients = parseList(sendForm.recipients);
    if (!recipients.length) {
      showNotice('error', '请输入收件人号码。');
      return;
    }
    if (!sendForm.fromAddress) {
      showNotice('error', '请选择发送账号。');
      return;
    }
    if (sendMode === 'text' && !sendForm.body.trim()) {
      showNotice('error', '请输入消息正文。');
      return;
    }
    if (sendMode === 'template' && !sendForm.templateSid) {
      showNotice('error', '请选择官方模板。');
      return;
    }
    const payload: Record<string, any> = {
      recipients,
      from_address: sendForm.fromAddress,
    };
    if (sendMode === 'text') {
      payload.body = sendForm.body;
      const mediaUrls = parseList(sendForm.mediaUrls);
      if (mediaUrls.length) {
        payload.media_urls = mediaUrls;
      }
    } else {
      payload.content_sid = sendForm.templateSid;
      const variables: Record<string, string> = {};
      Object.entries(templateVariables).forEach(([key, value]) => {
        if (value.trim()) {
          variables[key] = value.trim();
        }
      });
      if (Object.keys(variables).length) {
        payload.content_variables = variables;
      }
    }
    try {
      const response = await apiFetch('api/send/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await readJson<{ results?: SendResult[]; detail?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.detail || '发送失败。');
      }
      setSendResults(data?.results || []);
      showNotice('success', '消息已提交。');
    } catch (error: any) {
      showNotice('error', error?.message || '发送失败。');
    }
  };

  const handleAddSender = async () => {
    const value = newSenderAddress.trim();
    if (!value) {
      showNotice('error', '请输入发送人地址。');
      return;
    }
    try {
      const response = await apiFetch('api/whatsapp/senders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_address: value }),
      });
      const data = await readJson<{ senders?: string[]; detail?: string; status?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.detail || '添加失败。');
      }
      setSenders(data?.senders || []);
      setNewSenderAddress('');
      setShowAddSender(false);
      showNotice('success', data?.status === 'exists' ? '发送人已存在。' : '已添加发送人。');
    } catch (error: any) {
      showNotice('error', error?.message || '添加失败。');
    }
  };

  const handleDeleteSender = async (address: string) => {
    try {
      const response = await apiFetch('api/whatsapp/senders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_address: address }),
      });
      const data = await readJson<{ senders?: string[]; detail?: string; status?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.detail || '删除失败。');
      }
      setSenders(data?.senders || []);
      if (sendForm.fromAddress === address) {
        setSendForm((prev) => ({ ...prev, fromAddress: data?.senders?.[0] || '' }));
      }
      if (data?.status === 'protected') {
        showNotice('info', '默认发送人不可删除。');
      } else {
        showNotice('success', '已删除发送人。');
      }
    } catch (error: any) {
      showNotice('error', error?.message || '删除失败。');
    }
  };

  useEffect(() => {
    loadSenders();
    loadTemplates();
  }, []);

  useEffect(() => {
    if (!selectedTemplate?.variables?.length) {
      setTemplateVariables({});
      return;
    }
    const nextVars: Record<string, string> = {};
    selectedTemplate.variables.forEach((key) => {
      nextVars[key] = templateVariables[key] || '';
    });
    setTemplateVariables(nextVars);
  }, [selectedTemplate?.sid]);

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">WhatsApp 营销中心</h2>
          <p className="text-slate-500 mt-1">支持文本即时发送、官方模板消息及账号白名单管理</p>
        </div>
        <div className="flex bg-white border border-slate-200 p-1 rounded-2xl shadow-sm">
          {['send', 'templates', 'senders'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}
            >
              {tab === 'send' ? '发送消息' : tab === 'templates' ? '官方模板库' : '发件人列表'}
            </button>
          ))}
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
          <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-sm space-y-8">
            <div className="flex items-center gap-6 border-b border-slate-50 pb-6">
              <button 
                onClick={() => setSendMode('text')}
                className={`flex items-center gap-2 text-sm font-bold transition-colors ${sendMode === 'text' ? 'text-blue-600' : 'text-slate-400'}`}
              >
                <span className={`material-symbols-outlined ${sendMode === 'text' ? 'fill-icon' : ''}`}>chat</span>
                自由文本发送
              </button>
              <button 
                onClick={() => setSendMode('template')}
                className={`flex items-center gap-2 text-sm font-bold transition-colors ${sendMode === 'template' ? 'text-blue-600' : 'text-slate-400'}`}
              >
                <span className={`material-symbols-outlined ${sendMode === 'template' ? 'fill-icon' : ''}`}>dashboard_customize</span>
                使用官方模板
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">发送账号 (From)</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500"
                    value={sendForm.fromAddress}
                    onChange={(event) => setSendForm({ ...sendForm, fromAddress: event.target.value })}
                  >
                    {senders.length === 0 && (
                      <option value="">暂无发送人</option>
                    )}
                    {senders.map((sender) => (
                      <option key={sender} value={sender}>{sender}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">目标客户组 (To)</label>
                  <input
                    type="text"
                    value={sendForm.recipients}
                    onChange={(event) => setSendForm({ ...sendForm, recipients: event.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500"
                    placeholder="+86137..."
                  />
                </div>
              </div>

              {sendMode === 'text' ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">消息正文</label>
                    <textarea
                      rows={5}
                      value={sendForm.body}
                      onChange={(event) => setSendForm({ ...sendForm, body: event.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500"
                      placeholder="Hello from Twilio..."
                    ></textarea>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">媒体资源 URL (图片/PDF)</label>
                    <input
                      type="text"
                      value={sendForm.mediaUrls}
                      onChange={(event) => setSendForm({ ...sendForm, mediaUrls: event.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">选择官方模板 (Content SID)</label>
                    <select
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500"
                      value={sendForm.templateSid}
                      onChange={(event) => setSendForm({ ...sendForm, templateSid: event.target.value })}
                    >
                      {templates.length === 0 && (
                        <option value="">暂无模板</option>
                      )}
                      {templates.map((template) => (
                        <option key={template.sid} value={template.sid}>
                          {(template.friendly_name || template.sid) + (template.language ? ` (${template.language})` : '')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-3">模板变量配置 (Variables)</p>
                    {!selectedTemplate?.variables?.length ? (
                      <p className="text-xs text-slate-400">该模板暂无变量。</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        {selectedTemplate.variables.map((key) => (
                          <div key={key} className="space-y-1">
                            <span className="text-xs text-slate-500">变量 {`{{${key}}}`}</span>
                            <input
                              value={templateVariables[key] || ''}
                              onChange={(event) =>
                                setTemplateVariables({ ...templateVariables, [key]: event.target.value })
                              }
                              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs"
                              placeholder="填入对应内容"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleSend}
              className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-emerald-100 hover:scale-[1.01] transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">send</span>
              发送消息
            </button>
          </div>

          <div className="space-y-6">
            <div className="bg-[#25D366] rounded-[2rem] p-8 text-white relative overflow-hidden">
              <div className="relative z-10">
                <h4 className="font-bold mb-2">WhatsApp 窗口限制</h4>
                <p className="text-[11px] opacity-80 leading-relaxed">
                  在客户最后一次回复 24 小时后，只能发送获批的 **官方模版消息**。普通自由文本消息将被拦截。
                </p>
              </div>
              <span className="material-symbols-outlined absolute right-[-10px] bottom-[-10px] text-8xl opacity-10">chat</span>
            </div>
            
            <div className="bg-white rounded-[2rem] border border-slate-200 p-8">
              <h4 className="font-bold mb-4">发送状态</h4>
              <div className="space-y-4">
                {sendResults.length === 0 ? (
                  <div className="text-xs text-slate-400">暂无发送状态。</div>
                ) : (
                  sendResults.map((item, idx) => (
                    <div key={`${item.recipient}-${idx}`} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        item.status === 'read' ? 'bg-blue-50 text-blue-600' :
                        item.status === 'failed' ? 'bg-rose-50 text-rose-500' : 'bg-slate-50 text-slate-400'
                      }`}>
                        <span className="material-symbols-outlined text-sm">
                          {item.status === 'read' ? 'done_all' : item.status === 'failed' ? 'error' : 'done'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-slate-800">{item.recipient}</p>
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

      {activeTab === 'templates' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-sm animate-in fade-in duration-300">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-bold">官方模版库</h3>
              <p className="text-xs text-slate-400 mt-1">同步自 Twilio Content API，已获批准的模版</p>
            </div>
            <button
              onClick={loadTemplates}
              className="text-blue-600 text-xs font-bold flex items-center gap-1 hover:underline"
            >
              <span className="material-symbols-outlined text-sm">refresh</span> 同步最新模版
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templatesLoading && (
              <div className="col-span-full text-xs text-slate-400">正在同步模板...</div>
            )}
            {!templatesLoading && templates.length === 0 && (
              <div className="col-span-full text-xs text-slate-400">暂无模板。</div>
            )}
            {templates.map((template) => (
              <div key={template.sid} className="border border-slate-100 rounded-3xl p-6 hover:border-blue-200 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                    template.status?.toLowerCase() === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                  }`}>
                    {(template.status || 'pending').toUpperCase()}
                  </span>
                  <span className="text-[10px] text-slate-400">{template.language || '-'}</span>
                </div>
                <h4 className="font-bold text-slate-900 mb-2">{template.friendly_name || template.sid}</h4>
                <div className="bg-slate-50 p-4 rounded-2xl mb-4 h-24 overflow-hidden">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    变量: {template.variables && template.variables.length ? template.variables.join(', ') : '无'}
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <code className="text-[10px] text-slate-300">SID: {template.sid}</code>
                  <button
                    onClick={() => {
                      setActiveTab('send');
                      setSendMode('template');
                      setSendForm((prev) => ({ ...prev, templateSid: template.sid }));
                    }}
                    className="text-blue-600 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    选用
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'senders' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-sm animate-in fade-in duration-300">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold">发送人白名单</h3>
            <button
              onClick={() => setShowAddSender((prev) => !prev)}
              className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold"
            >
              + 添加发送人
            </button>
          </div>

          {showAddSender && (
            <div className="mb-6 flex flex-wrap gap-3 items-center bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <input
                value={newSenderAddress}
                onChange={(event) => setNewSenderAddress(event.target.value)}
                className="flex-1 min-w-[220px] bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500"
                placeholder="whatsapp:+14155238886"
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
                  setNewSenderAddress('');
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
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">发送账号</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {senders.map((sender) => (
                  <tr key={sender} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">{sender}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteSender(sender)}
                        className="text-rose-500 hover:text-rose-700 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {!senders.length && !sendersLoading && (
                  <tr>
                    <td colSpan={2} className="px-6 py-6 text-sm text-slate-400 text-center">
                      暂无发送人配置。
                    </td>
                  </tr>
                )}
                {sendersLoading && (
                  <tr>
                    <td colSpan={2} className="px-6 py-6 text-sm text-slate-400 text-center">
                      正在加载...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppMarketing;
