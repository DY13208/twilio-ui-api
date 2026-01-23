
import React, { useEffect, useState } from 'react';
import { apiFetch, formatDateTime, parseList, readJson } from '../api';

type Notice = { type: 'success' | 'error' | 'info'; message: string };

interface SmsTemplateItem {
  id: number;
  name: string;
  body: string;
  variables?: string[] | null;
  disabled_at?: string | null;
  created_at: string;
  updated_at: string;
}

interface SmsContactItem {
  id: number;
  phone: string;
  name?: string | null;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

interface SendResult {
  recipient: string;
  status: string;
  error?: string | null;
}

const SMSMarketing: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'send' | 'templates' | 'contacts'>('send');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [sendForm, setSendForm] = useState({
    fromValue: '',
    recipients: '',
    message: '',
    ratePerMinute: 30,
    appendOptOut: true,
  });
  const [sendResults, setSendResults] = useState<SendResult[]>([]);
  const [templates, setTemplates] = useState<SmsTemplateItem[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    body: '',
    variables: '',
  });
  const [contacts, setContacts] = useState<SmsContactItem[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({
    phone: '',
    name: '',
    tags: '',
  });
  const [contactSearch, setContactSearch] = useState('');
  const [contactTag, setContactTag] = useState('');

  const showNotice = (type: Notice['type'], message: string) => {
    setNotice({ type, message });
  };

  const loadTemplates = async () => {
    if (templatesLoading) {
      return;
    }
    setTemplatesLoading(true);
    try {
      const response = await apiFetch('api/sms/templates');
      const data = await readJson<{ templates?: SmsTemplateItem[]; detail?: string }>(response);
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

  const createTemplate = async () => {
    if (!templateForm.name.trim() || !templateForm.body.trim()) {
      showNotice('error', '请填写模板名称和内容。');
      return;
    }
    const payload: Record<string, any> = {
      name: templateForm.name.trim(),
      body: templateForm.body.trim(),
    };
    const variables = parseList(templateForm.variables);
    if (variables.length) {
      payload.variables = variables;
    }
    try {
      const response = await apiFetch('api/sms/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await readJson<{ detail?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.detail || '创建失败。');
      }
      showNotice('success', '模板已创建。');
      setTemplateForm({ name: '', body: '', variables: '' });
      setShowTemplateForm(false);
      loadTemplates();
    } catch (error: any) {
      showNotice('error', error?.message || '创建失败。');
    }
  };

  const loadContacts = async () => {
    setContactsLoading(true);
    try {
      const params = new URLSearchParams();
      if (contactSearch.trim()) {
        params.set('search', contactSearch.trim());
      }
      if (contactTag.trim()) {
        params.set('tag', contactTag.trim());
      }
      const response = await apiFetch(`api/sms/contacts?${params.toString()}`);
      const data = await readJson<{ contacts?: SmsContactItem[]; detail?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.detail || '加载联系人失败。');
      }
      setContacts(data?.contacts || []);
    } catch (error: any) {
      showNotice('error', error?.message || '加载联系人失败。');
    } finally {
      setContactsLoading(false);
    }
  };

  const createContact = async () => {
    if (!contactForm.phone.trim()) {
      showNotice('error', '请输入联系人手机号。');
      return;
    }
    const payload: Record<string, any> = {
      phone: contactForm.phone.trim(),
    };
    if (contactForm.name.trim()) {
      payload.name = contactForm.name.trim();
    }
    const tags = parseList(contactForm.tags);
    if (tags.length) {
      payload.tags = tags;
    }
    try {
      const response = await apiFetch('api/sms/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await readJson<{ detail?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.detail || '创建失败。');
      }
      showNotice('success', '联系人已保存。');
      setContactForm({ phone: '', name: '', tags: '' });
      setShowContactForm(false);
      loadContacts();
    } catch (error: any) {
      showNotice('error', error?.message || '创建失败。');
    }
  };

  const sendSms = async () => {
    const recipients = parseList(sendForm.recipients);
    if (!recipients.length) {
      showNotice('error', '请输入收件人。');
      return;
    }
    if (!sendForm.message.trim()) {
      showNotice('error', '请输入短信内容。');
      return;
    }
    const payload: Record<string, any> = {
      recipients,
      message: sendForm.message,
      rate_per_minute: sendForm.ratePerMinute,
      append_opt_out: sendForm.appendOptOut,
    };
    const fromValue = sendForm.fromValue.trim();
    if (fromValue) {
      if (fromValue.startsWith('MG')) {
        payload.messaging_service_sid = fromValue;
      } else {
        payload.from_number = fromValue;
      }
    }
    try {
      const response = await apiFetch('api/send/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await readJson<{ results?: SendResult[]; detail?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.detail || '发送失败。');
      }
      setSendResults(data?.results || []);
      showNotice('success', '短信已提交。');
    } catch (error: any) {
      showNotice('error', error?.message || '发送失败。');
    }
  };

  useEffect(() => {
    loadTemplates();
    loadContacts();
  }, []);

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">短信营销中心</h2>
          <p className="text-slate-500 mt-1">批量短信群发、模板管理及联系人列表</p>
        </div>
        <div className="flex bg-white border border-slate-200 p-1 rounded-2xl shadow-sm">
          {['send', 'templates', 'contacts'].map((t) => (
            <button 
              key={t}
              onClick={() => setActiveTab(t as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === t ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-50'}`}
              style={activeTab !== t ? { color: '#64748b' } : {}}
            >
              {t === 'send' ? '短信发送' : t === 'templates' ? '短信模板' : '联系人库'}
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
          <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-sm space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600">sms</span> 批量短信发送
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">发送账号/SID</label>
                  <input
                    type="text"
                    value={sendForm.fromValue}
                    onChange={(event) => setSendForm({ ...sendForm, fromValue: event.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500"
                    placeholder="MGxxxxxxxx..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">发送速率 (条/分)</label>
                  <input
                    type="number"
                    value={sendForm.ratePerMinute}
                    onChange={(event) =>
                      setSendForm({ ...sendForm, ratePerMinute: Number.parseInt(event.target.value, 10) || 0 })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">收件人 (支持逗号/换行分隔)</label>
                <textarea
                  rows={3}
                  value={sendForm.recipients}
                  onChange={(event) => setSendForm({ ...sendForm, recipients: event.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500"
                  placeholder="+86137..., +1234..."
                ></textarea>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center mb-1">
                   <label className="text-[10px] font-bold text-slate-400 uppercase">短信内容</label>
                   <span className="text-[10px] text-slate-400">{sendForm.message.length}/70 字符 (1条短信计费)</span>
                </div>
                <textarea
                  rows={5}
                  value={sendForm.message}
                  onChange={(event) => setSendForm({ ...sendForm, message: event.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500"
                  placeholder="输入短信内容，支持 {name} 等变量..."
                ></textarea>
              </div>

              <div className="flex items-center gap-2 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-amber-300 text-amber-600"
                  id="opt-out"
                  checked={sendForm.appendOptOut}
                  onChange={(event) => setSendForm({ ...sendForm, appendOptOut: event.target.checked })}
                />
                <label htmlFor="opt-out" className="text-xs text-amber-800 font-medium">自动附加退订指令 (Reply STOP to opt-out)</label>
              </div>
            </div>

            <button
              onClick={sendSms}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-blue-100 hover:scale-[1.01] transition-all"
            >
              立即提交发送任务
            </button>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900 rounded-[2rem] p-8 text-white">
              <h4 className="font-bold mb-4">发送规则提示</h4>
              <ul className="space-y-4 text-[11px] text-slate-400 leading-relaxed">
                <li className="flex gap-3">
                  <span className="material-symbols-outlined text-blue-400 text-sm">info</span>
                  国内短信请确保签名已过审。
                </li>
                <li className="flex gap-3">
                  <span className="material-symbols-outlined text-blue-400 text-sm">security</span>
                  国际短信建议开启退订保护以降低封号风险。
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200 p-8">
              <h4 className="font-bold mb-4">发送结果</h4>
              <div className="space-y-3">
                {sendResults.length === 0 ? (
                  <div className="text-xs text-slate-400">暂无发送结果。</div>
                ) : (
                  sendResults.map((item, idx) => (
                    <div key={`${item.recipient}-${idx}`} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        item.status === 'failed' ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-blue-600'
                      }`}>
                        <span className="material-symbols-outlined text-sm">
                          {item.status === 'failed' ? 'error' : 'sms'}
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
            <h3 className="text-xl font-bold">短信模板管理</h3>
            <button
              onClick={() => setShowTemplateForm((prev) => !prev)}
              className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold"
            >
              + 创建模板
            </button>
          </div>
          {showTemplateForm && (
            <div className="mb-8 bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">模板名称</label>
                  <input
                    value={templateForm.name}
                    onChange={(event) => setTemplateForm({ ...templateForm, name: event.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500"
                    placeholder="例如：节日优惠"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">变量 (逗号分隔)</label>
                  <input
                    value={templateForm.variables}
                    onChange={(event) => setTemplateForm({ ...templateForm, variables: event.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500"
                    placeholder="name, code"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">模板内容</label>
                <textarea
                  rows={4}
                  value={templateForm.body}
                  onChange={(event) => setTemplateForm({ ...templateForm, body: event.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500"
                  placeholder="输入短信模板内容..."
                ></textarea>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={createTemplate}
                  className="bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-bold"
                >
                  保存模板
                </button>
                <button
                  onClick={() => {
                    setShowTemplateForm(false);
                    setTemplateForm({ name: '', body: '', variables: '' });
                  }}
                  className="border border-slate-200 px-6 py-2 rounded-xl text-xs font-bold text-slate-500"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {templatesLoading && (
              <div className="text-xs text-slate-400">正在加载模板...</div>
            )}
            {!templatesLoading && templates.length === 0 && (
              <div className="text-xs text-slate-400">暂无模板。</div>
            )}
            {templates.map((template) => (
              <div key={template.id} className="border border-slate-100 rounded-3xl p-6 hover:border-blue-200 transition-all group relative">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">模板 ID: {template.id}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => showNotice('info', '短信模板暂不支持编辑。')}
                      className="text-slate-300 hover:text-blue-500"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                    <button
                      onClick={() => showNotice('info', '短信模板暂不支持删除。')}
                      className="text-slate-300 hover:text-red-500"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </div>
                <h4 className="font-bold text-slate-900 mb-2">{template.name}</h4>
                <p className="text-xs text-slate-500 line-clamp-2">{template.body}</p>
                {template.variables?.length ? (
                  <div className="mt-3 text-[10px] text-slate-400">变量: {template.variables.join(', ')}</div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'contacts' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-sm animate-in fade-in duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">联系人库</h3>
            <button
              onClick={() => setShowContactForm((prev) => !prev)}
              className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold"
            >
              + 新增联系人
            </button>
          </div>

          {showContactForm && (
            <div className="mb-6 bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">手机号</label>
                  <input
                    value={contactForm.phone}
                    onChange={(event) => setContactForm({ ...contactForm, phone: event.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500"
                    placeholder="+86137..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">姓名</label>
                  <input
                    value={contactForm.name}
                    onChange={(event) => setContactForm({ ...contactForm, name: event.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500"
                    placeholder="联系人姓名"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">标签 (逗号分隔)</label>
                <input
                  value={contactForm.tags}
                  onChange={(event) => setContactForm({ ...contactForm, tags: event.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500"
                  placeholder="VIP, 活跃"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={createContact}
                  className="bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-bold"
                >
                  保存联系人
                </button>
                <button
                  onClick={() => {
                    setShowContactForm(false);
                    setContactForm({ phone: '', name: '', tags: '' });
                  }}
                  className="border border-slate-200 px-6 py-2 rounded-xl text-xs font-bold text-slate-500"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3 items-center mb-6">
            <input
              value={contactSearch}
              onChange={(event) => setContactSearch(event.target.value)}
              className="flex-1 min-w-[220px] bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500"
              placeholder="搜索手机号或姓名"
            />
            <input
              value={contactTag}
              onChange={(event) => setContactTag(event.target.value)}
              className="w-40 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500"
              placeholder="按标签过滤"
            />
            <button
              onClick={loadContacts}
              className="bg-blue-600 text-white px-5 py-2 rounded-xl text-xs font-bold"
            >
              查询
            </button>
          </div>

          <div className="overflow-hidden border border-slate-100 rounded-2xl">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">手机号</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">姓名</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">标签</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">创建时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {contacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">{contact.phone}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{contact.name || '-'}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {contact.tags && contact.tags.length ? contact.tags.join(', ') : '-'}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">{formatDateTime(contact.created_at)}</td>
                  </tr>
                ))}
                {!contacts.length && !contactsLoading && (
                  <tr>
                    <td colSpan={4} className="px-6 py-6 text-sm text-slate-400 text-center">
                      暂无联系人。
                    </td>
                  </tr>
                )}
                {contactsLoading && (
                  <tr>
                    <td colSpan={4} className="px-6 py-6 text-sm text-slate-400 text-center">
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

export default SMSMarketing;
