import React, { useState } from 'react';

type Notice = { type: 'error' | 'info'; message: string };

interface LoginProps {
  onLogin: (username: string, password: string) => Promise<string | null>;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedUser = username.trim();
    if (!trimmedUser || !password) {
      setNotice({ type: 'error', message: '请输入用户名和密码。' });
      return;
    }
    setLoading(true);
    const error = await onLogin(trimmedUser, password);
    if (error) {
      setNotice({ type: 'error', message: error });
    } else {
      setNotice({ type: 'info', message: '登录成功，正在进入控制台...' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl shadow-slate-200 p-10 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 text-blue-600 mb-6">
          <span className="material-symbols-outlined text-3xl font-bold fill-icon">rocket_launch</span>
          <span className="text-xl font-bold tracking-tight">AI-Marketing</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">管理员登录</h1>
        <p className="text-sm text-slate-500 mb-8">
          使用管理员账号进入控制台，管理营销与密钥配置。
        </p>

        {notice && (
          <div
            className={`mb-6 px-5 py-3 rounded-2xl text-sm font-medium border ${
              notice.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-600'
                : 'bg-blue-50 border-blue-200 text-blue-600'
            }`}
          >
            {notice.message}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              用户名
            </label>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-blue-500"
              placeholder="请输入用户名"
              autoComplete="username"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-blue-500"
              placeholder="请输入密码"
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all disabled:opacity-50"
          >
            {loading ? '正在登录...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
