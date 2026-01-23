import React from 'react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', label: '控制台', icon: 'dashboard' },
    { id: 'marketing', label: '智能营销', icon: 'account_tree' },
    { id: 'customers', label: '客户管理', icon: 'group' },
    { id: 'email', label: 'Email 营销', icon: 'mail' },
    { id: 'whatsapp', label: 'WhatsApp 营销', icon: 'chat' },
    { id: 'sms', label: '短信营销', icon: 'sms' },
    { id: 'chat', label: '即时聊天', icon: 'forum' },
    { id: 'api', label: 'API 文档', icon: 'integration_instructions' },
    { id: 'keys', label: 'Key 管理', icon: 'key' },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
      <div className="p-6">
        <div className="flex items-center gap-3 text-blue-600 mb-8 px-2">
          <span className="material-symbols-outlined text-3xl font-bold fill-icon">rocket_launch</span>
          <span className="text-xl font-bold tracking-tight">AI-Marketing</span>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${activeTab === item.id
                  ? 'bg-blue-50 text-blue-600 shadow-sm border border-blue-100'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
            >
              <span className={`material-symbols-outlined ${activeTab === item.id ? 'fill-icon' : ''}`}>
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-4 space-y-2 border-t border-slate-100 bg-slate-50/50">
        <button
          onClick={() => onTabChange('settings')}
          className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-xl transition-colors ${activeTab === 'settings'
              ? 'bg-blue-50 text-blue-600'
              : 'text-slate-500 hover:text-slate-800'
            }`}
        >
          <span className="material-symbols-outlined text-sm">settings</span>
          设置
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">logout</span>
          登出
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
