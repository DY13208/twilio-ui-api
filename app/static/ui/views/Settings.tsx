import React, { useEffect, useState } from 'react';
import { adminFetch, formatDateTime, readJson } from '../api';

type Notice = { type: 'success' | 'error' | 'info'; message: string };

interface SettingsProps {
  adminUserId?: number | null;
  username?: string | null;
  expiresAt?: string | null;
}

interface SendgridSettings {
  enabled: boolean;
  max_lines?: number | null;
  auto_close: boolean;
  path?: string | null;
}

const Settings: React.FC<SettingsProps> = ({ adminUserId, username, expiresAt }) => {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [passwordForm, setPasswordForm] = useState({ password: '', confirm: '' });
  const [savingPassword, setSavingPassword] = useState(false);
  const [sendgridSettings, setSendgridSettings] = useState<SendgridSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const showNotice = (type: Notice['type'], message: string) => {
    setNotice({ type, message });
  };

  const loadSettings = async () => {
    setLoadingSettings(true);
    try {
      const response = await adminFetch('api/admin/settings/sendgrid-webhook-log');
      const data = await readJson<SendgridSettings & { detail?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.detail || '加载设置失败。');
      }
      setSendgridSettings(data || { enabled: false, auto_close: false });
    } catch (error: any) {
      showNotice('error', error?.message || '加载设置失败。');
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleSavePassword = async () => {
    if (!username) {
      showNotice('error', '当前用户信息为空，请重新登录。');
      return;
    }
    if (!passwordForm.password.trim()) {
      showNotice('error', '请输入新密码。');
      return;
    }
    if (passwordForm.password !== passwordForm.confirm) {
      showNotice('error', '两次输入的密码不一致。');
      return;
    }
    if (passwordForm.password.length < 6) {
      showNotice('error', '密码长度建议至少 6 位。');
      return;
    }
    setSavingPassword(true);
    try {
      const response = await adminFetch('api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: passwordForm.password }),
      });
      const data = await readJson<{ detail?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.detail || '保存失败。');
      }
      setPasswordForm({ password: '', confirm: '' });
      showNotice('success', '密码已更新。');
    } catch (error: any) {
      showNotice('error', error?.message || '保存失败。');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!sendgridSettings) {
      return;
    }
    setSavingSettings(true);
    try {
      const payload = {
        enabled: sendgridSettings.enabled,
        auto_close: sendgridSettings.auto_close,
        max_lines: sendgridSettings.max_lines || null,
      };
      const response = await adminFetch('api/admin/settings/sendgrid-webhook-log', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await readJson<SendgridSettings & { detail?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.detail || '保存设置失败。');
      }
      setSendgridSettings(data || sendgridSettings);
      showNotice('success', '设置已保存。');
    } catch (error: any) {
      showNotice('error', error?.message || '保存设置失败。');
    } finally {
      setSavingSettings(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">系统设置</h2>
        <p className="text-slate-500 mt-1">编辑管理员信息与系统日志设置。</p>
      </div>

      {notice && (
        <div
          className={`px-6 py-4 rounded-2xl text-sm font-medium border ${
            notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : notice.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-600'
              : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}
        >
          {notice.message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 space-y-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900">个人信息</h3>
            <p className="text-sm text-slate-500">查看当前登录账号并修改密码。</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>账号</span>
              <span className="font-semibold text-slate-900">{username || '-'}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>管理员 ID</span>
              <span className="font-semibold text-slate-900">{adminUserId ?? '-'}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>会话到期</span>
              <span className="font-semibold text-slate-900">{expiresAt ? formatDateTime(expiresAt) : '-'}</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">新密码</label>
              <input
                type="password"
                value={passwordForm.password}
                onChange={(event) => setPasswordForm({ ...passwordForm, password: event.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-blue-500"
                placeholder="输入新密码"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">确认密码</label>
              <input
                type="password"
                value={passwordForm.confirm}
                onChange={(event) => setPasswordForm({ ...passwordForm, confirm: event.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-blue-500"
                placeholder="再次输入新密码"
              />
            </div>
            <button
              onClick={handleSavePassword}
              disabled={savingPassword}
              className="w-full bg-slate-900 text-white py-3 rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
            >
              {savingPassword ? '保存中…' : '更新密码'}
            </button>
          </div>
        </section>

        <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 space-y-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900">SendGrid Webhook 日志</h3>
            <p className="text-sm text-slate-500">控制日志记录与保留策略。</p>
          </div>

          {loadingSettings ? (
            <div className="text-sm text-slate-400">正在加载设置…</div>
          ) : (
            <div className="space-y-5">
              <label className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                <input
                  type="checkbox"
                  checked={Boolean(sendgridSettings?.enabled)}
                  onChange={(event) =>
                    setSendgridSettings((prev) =>
                      prev ? { ...prev, enabled: event.target.checked } : prev
                    )
                  }
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                启用日志记录
              </label>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">保留最大行数</label>
                <input
                  type="number"
                  min={1}
                  value={sendgridSettings?.max_lines ?? ''}
                  onChange={(event) =>
                    setSendgridSettings((prev) =>
                      prev
                        ? {
                            ...prev,
                            max_lines: event.target.value ? Number(event.target.value) : null,
                          }
                        : prev
                    )
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-blue-500"
                  placeholder="例如：500"
                />
              </div>

              <label className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                <input
                  type="checkbox"
                  checked={Boolean(sendgridSettings?.auto_close)}
                  onChange={(event) =>
                    setSendgridSettings((prev) =>
                      prev ? { ...prev, auto_close: event.target.checked } : prev
                    )
                  }
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                达到限制时自动清理
              </label>

              <div className="text-xs text-slate-400">
                日志路径：{sendgridSettings?.path || '未配置'}
              </div>

              <button
                onClick={handleSaveSettings}
                disabled={savingSettings || !sendgridSettings}
                className="w-full bg-blue-600 text-white py-3 rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                {savingSettings ? '保存中…' : '保存设置'}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Settings;
