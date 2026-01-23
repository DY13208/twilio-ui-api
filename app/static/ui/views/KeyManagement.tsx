
import React, { useEffect, useMemo, useState } from 'react';
import {
  adminFetch,
  formatDateTime,
  getStoredApiKey,
  readJson,
  setStoredApiKey,
} from '../api';

interface ApiKeyItem {
  id: number;
  name?: string | null;
  prefix: string;
  scope: 'send' | 'read' | 'manage';
  admin_user_id?: number | null;
  admin_username?: string | null;
  expires_at?: string | null;
  created_at: string;
  last_used_at?: string | null;
  revoked_at?: string | null;
}

type Notice = { type: 'success' | 'error' | 'info'; message: string };

const KeyManagement: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [currentKey, setCurrentKey] = useState(getStoredApiKey());
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(false);
  const [formState, setFormState] = useState({
    name: '',
    scope: 'manage' as 'read' | 'send' | 'manage',
    expiresInDays: 30,
  });
  const [newKey, setNewKey] = useState('');

  const stats = useMemo(() => {
    const now = Date.now();
    let activeCount = 0;
    let expiringSoon = 0;
    keys.forEach((item) => {
      const isRevoked = Boolean(item.revoked_at);
      const expiresAt = item.expires_at ? new Date(item.expires_at).getTime() : null;
      const isExpired = expiresAt !== null && expiresAt <= now;
      if (!isRevoked && !isExpired) {
        activeCount += 1;
      }
      if (!isRevoked && expiresAt && expiresAt > now) {
        const daysLeft = (expiresAt - now) / (1000 * 60 * 60 * 24);
        if (daysLeft <= 7) {
          expiringSoon += 1;
        }
      }
    });
    return [
      { label: '活跃 Keys', value: String(activeCount), icon: 'vpn_key', color: 'text-blue-600 bg-blue-50' },
      { label: '即将过期', value: String(expiringSoon), icon: 'notification_important', color: 'text-amber-600 bg-amber-50' },
      { label: '本月请求数', value: '—', icon: 'analytics', color: 'text-emerald-600 bg-emerald-50' },
    ];
  }, [keys]);

  const showNotice = (type: Notice['type'], message: string) => {
    setNotice({ type, message });
  };

  const loadKeys = async () => {
    setLoading(true);
    try {
      const response = await adminFetch('api/keys');
      const data = await readJson<{ keys?: ApiKeyItem[]; detail?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.detail || '加载 API Keys 失败。');
      }
      setKeys(data?.keys || []);
      setNotice(null);
    } catch (error: any) {
      showNotice('error', error?.message || '加载 API Keys 失败。');
    } finally {
      setLoading(false);
    }
  };

  const revokeKey = async (keyId: number) => {
    try {
      const response = await adminFetch(`api/keys/${keyId}/revoke`, { method: 'POST' });
      const data = await readJson<{ detail?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.detail || '撤销失败。');
      }
      showNotice('success', 'Key 已撤销。');
      loadKeys();
    } catch (error: any) {
      showNotice('error', error?.message || '撤销失败。');
    }
  };

  const createKey = async () => {
    const payload: Record<string, any> = {
      scope: formState.scope,
    };
    if (formState.name.trim()) {
      payload.name = formState.name.trim();
    }
    if (formState.expiresInDays && formState.expiresInDays > 0) {
      payload.expires_in_days = formState.expiresInDays;
    }
    try {
      const response = await adminFetch('api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await readJson<{ api_key?: string; detail?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.detail || '生成失败。');
      }
      setNewKey(data?.api_key || '');
      showNotice('success', 'API Key 已生成。请立即保存。');
      loadKeys();
    } catch (error: any) {
      showNotice('error', error?.message || '生成失败。');
    }
  };

  const saveCurrentKey = () => {
    setStoredApiKey(currentKey);
    showNotice('success', '已保存当前 API Key。');
  };

  const clearCurrentKey = () => {
    setStoredApiKey('');
    setCurrentKey('');
    showNotice('info', '已清除当前 API Key。');
  };

  useEffect(() => {
    loadKeys();
  }, []);

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">API Key 管理</h2>
          <p className="text-slate-500 mt-1">管理系统集成凭证，配置访问权限与有效期</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-slate-200 hover:scale-[1.02] transition-all"
        >
          <span className="material-symbols-outlined">add</span> 创建新 API Key
        </button>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center gap-4 shadow-sm">
            <div className={`p-4 rounded-2xl ${stat.color}`}>
              <span className="material-symbols-outlined fill-icon">{stat.icon}</span>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-black text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 md:items-end">
          <div className="flex-1 space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">当前 API Key</label>
            <input
              value={currentKey}
              onChange={(event) => setCurrentKey(event.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-blue-500"
              placeholder="粘贴用于消息发送的 API Key"
              type="password"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={saveCurrentKey} className="bg-blue-600 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-sm">
              保存
            </button>
            <button onClick={clearCurrentKey} className="border border-slate-200 px-6 py-3 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-50">
              清除
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Key 名称</th>
              <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">权限范围</th>
              <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">API Key 预览</th>
              <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">到期时间</th>
              <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">状态</th>
              <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {keys.map((k) => {
              const expiresAt = k.expires_at ? new Date(k.expires_at).getTime() : null;
              const isExpired = expiresAt !== null && expiresAt <= Date.now();
              const status = k.revoked_at ? 'revoked' : isExpired ? 'expired' : 'active';
              const preview = k.prefix ? `${k.prefix}...` : '—';
              return (
              <tr key={k.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-8 py-5">
                  <span className="font-bold text-slate-800 block">{k.name || '未命名'}</span>
                  <span className="text-[10px] text-slate-400">创建于 {formatDateTime(k.created_at)}</span>
                </td>
                <td className="px-8 py-5">
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${
                    k.scope === 'manage' ? 'bg-indigo-50 text-indigo-600' :
                    k.scope === 'send' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {k.scope}
                  </span>
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100">{preview}</code>
                    <button
                      className="text-slate-400 hover:text-blue-600"
                      onClick={async () => {
                        if (!currentKey || !currentKey.startsWith(k.prefix)) {
                          showNotice('info', '当前 Key 与该前缀不匹配，无法复制完整值。');
                          return;
                        }
                        try {
                          await navigator.clipboard.writeText(currentKey);
                          showNotice('success', '已复制当前 API Key。');
                        } catch {
                          showNotice('error', '复制失败，请手动选择复制。');
                        }
                      }}
                    >
                      <span className="material-symbols-outlined text-sm">content_copy</span>
                    </button>
                  </div>
                </td>
                <td className="px-8 py-5 text-xs text-slate-600 font-medium">
                  {k.expires_at ? formatDateTime(k.expires_at) : '不过期'}
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${
                      status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                      status === 'expired' ? 'bg-amber-500' : 'bg-slate-300'
                    }`}></span>
                    <span className="text-xs font-bold text-slate-700 capitalize">{status}</span>
                  </div>
                </td>
                <td className="px-8 py-5 text-right">
                  {status === 'active' && (
                    <button
                      onClick={() => revokeKey(k.id)}
                      className="text-rose-500 hover:bg-rose-50 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                    >
                      撤销
                    </button>
                  )}
                </td>
              </tr>
            )})}
          </tbody>
        </table>
        {loading && (
          <div className="p-6 text-center text-xs text-slate-400">正在加载 Key 列表...</div>
        )}
      </div>

      {/* New Key Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-bold mb-2">生成新 API Key</h3>
            <p className="text-sm text-slate-500 mb-8">请为该 Key 命名并设置权限级别</p>
            
            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Key 名称</label>
                <input
                  type="text"
                  value={formState.name}
                  onChange={(event) => setFormState({ ...formState, name: event.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-blue-500"
                  placeholder="例如：开发环境测试"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">权限范围 (Scope)</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['read', 'send', 'manage'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFormState({ ...formState, scope: s })}
                      className={`py-3 border rounded-xl text-xs font-bold transition-all capitalize ${
                        formState.scope === s
                          ? 'border-blue-500 bg-blue-50 text-blue-600'
                          : 'border-slate-200 hover:bg-blue-50 hover:border-blue-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">过期时间 (天)</label>
                <input
                  type="number"
                  min={1}
                  value={formState.expiresInDays}
                  onChange={(event) =>
                    setFormState({
                      ...formState,
                      expiresInDays: Number.parseInt(event.target.value, 10) || 0,
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {newKey && (
              <div className="mt-8 bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <p className="text-xs font-bold text-slate-500">新生成的 Key（请妥善保存）</p>
                <code className="text-xs font-mono text-slate-700 break-all block">{newKey}</code>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(newKey);
                        showNotice('success', '已复制新 Key。');
                      } catch {
                        showNotice('error', '复制失败，请手动选择复制。');
                      }
                    }}
                    className="flex-1 border border-slate-200 rounded-xl py-2 text-xs font-bold text-slate-600 hover:bg-white"
                  >
                    复制
                  </button>
                  <button
                    onClick={() => {
                      setStoredApiKey(newKey);
                      setCurrentKey(newKey);
                      showNotice('success', '已设为当前 API Key。');
                    }}
                    className="flex-1 bg-blue-600 text-white rounded-xl py-2 text-xs font-bold"
                  >
                    设为当前
                  </button>
                </div>
              </div>
            )}

            <div className="mt-10 flex gap-4">
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setNewKey('');
                }}
                className="flex-1 py-4 text-sm font-bold text-slate-400 hover:text-slate-600"
              >
                取消
              </button>
              <button
                onClick={createKey}
                className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-blue-100 hover:bg-blue-700"
              >
                确认生成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KeyManagement;
