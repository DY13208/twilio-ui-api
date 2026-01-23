import React, { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './views/Dashboard';
import MarketingCampaigns from './views/MarketingCampaigns';
import ApiDocumentation from './views/ApiDocumentation';
import EmailMarketing from './views/EmailMarketing';
import WhatsAppMarketing from './views/WhatsAppMarketing';
import SMSMarketing from './views/SMSMarketing';
import KeyManagement from './views/KeyManagement';
import ChatHistory from './views/ChatHistory';
import Login from './views/Login';
import Settings from './views/Settings';
import CustomerManagement from './views/CustomerManagement';
import { buildApiUrl, clearAdminSession, readJson, storeAdminSession } from './api';

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<
    | 'dashboard'
    | 'marketing'
    | 'customers'
    | 'api'
    | 'email'
    | 'whatsapp'
    | 'sms'
    | 'keys'
    | 'chat'
    | 'settings'
  >('dashboard');
  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'anonymous'>('loading');
  const [adminProfile, setAdminProfile] = useState<{
    username?: string | null;
    admin_user_id?: number | null;
    expires_at?: string | null;
  }>({});

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'marketing':
        return <MarketingCampaigns />;
      case 'customers':
        return <CustomerManagement />;
      case 'email':
        return <EmailMarketing />;
      case 'whatsapp':
        return <WhatsAppMarketing />;
      case 'sms':
        return <SMSMarketing />;
      case 'api':
        return <ApiDocumentation />;
      case 'keys':
        return <KeyManagement />;
      case 'chat':
        return <ChatHistory />;
      case 'settings':
        return (
          <Settings
            adminUserId={adminProfile.admin_user_id}
            username={adminProfile.username}
            expiresAt={adminProfile.expires_at}
          />
        );
      default:
        return <Dashboard />;
    }
  };

  const loadAdminSession = async () => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 4000);
    try {
      const response = await fetch(buildApiUrl('api/admin/token'), {
        credentials: 'same-origin',
        signal: controller.signal,
      });
      const data = await readJson<{
        status?: string;
        token?: string;
        admin_user_id?: number;
        username?: string;
        expires_at?: string;
      }>(response);
      if (response.ok && data?.status === 'ok' && data?.token) {
        storeAdminSession(data);
        setAdminProfile({
          username: data.username,
          admin_user_id: data.admin_user_id,
          expires_at: data.expires_at,
        });
        setAuthStatus('authenticated');
        return;
      }
    } catch {
      // fall through to anonymous
    } finally {
      window.clearTimeout(timeoutId);
    }
    clearAdminSession();
    setAdminProfile({});
    setAuthStatus('anonymous');
  };

  const handleLogin = async (username: string, password: string) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetch(buildApiUrl('api/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ username, password }),
        signal: controller.signal,
      });
      const data = await readJson<{
        status?: string;
        token?: string;
        admin_user_id?: number;
        username?: string;
        expires_at?: string;
        detail?: string;
      }>(response);
      if (!response.ok || data?.status !== 'ok' || !data?.token) {
        return data?.detail || '登录失败，请检查账号密码。';
      }
      storeAdminSession(data);
      setAdminProfile({
        username: data.username,
        admin_user_id: data.admin_user_id,
        expires_at: data.expires_at,
      });
      setAuthStatus('authenticated');
      setCurrentTab('dashboard');
      return null;
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        return '登录接口超时，请检查后端或数据库是否正常。';
      }
      return error?.message || '登录失败，请稍后重试。';
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(buildApiUrl('api/logout'), {
        method: 'POST',
        credentials: 'same-origin',
      });
    } catch {
      // ignore network errors
    }
    clearAdminSession();
    setAdminProfile({});
    setAuthStatus('anonymous');
    setCurrentTab('dashboard');
  };

  useEffect(() => {
    loadAdminSession();
  }, []);

  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] text-slate-400 text-sm">
        正在加载...
      </div>
    );
  }

  if (authStatus !== 'authenticated') {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen overflow-hidden text-slate-800">
      <Sidebar activeTab={currentTab} onTabChange={setCurrentTab} onLogout={handleLogout} />
      <main className="flex-1 overflow-y-auto bg-[#f8fafc] relative">{renderContent()}</main>
    </div>
  );
};

export default App;
