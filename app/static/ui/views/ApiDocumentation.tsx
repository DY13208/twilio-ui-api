
import React, { useState, useMemo } from 'react';
import { API_DOCS } from '../constants';
import { ApiEndpoint } from '../types';
import { buildApiUrl, getStoredApiKey } from '../api';

const TryItOut: React.FC<{ endpoint: ApiEndpoint }> = ({ endpoint }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [payload, setPayload] = useState(JSON.stringify(endpoint.payload || {}, null, 2));
  const [response, setResponse] = useState<{ status: number; body: any; headers: any } | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState(getStoredApiKey());

  const handleSend = async () => {
    setLoading(true);
    setResponse(null);
    try {
      const headers = new Headers();
      if (endpoint.method !== 'GET') {
        headers.set('Content-Type', 'application/json');
      }
      const token = apiKey.trim();
      if (token) {
        if (/^bearer\s+/i.test(token)) {
          headers.set('Authorization', token);
        } else if (token.split('.').length === 3) {
          headers.set('Authorization', `Bearer ${token}`);
        } else {
          headers.set('X-API-Key', token);
          headers.set('Authorization', `Bearer ${token}`);
        }
      }

      let body: string | undefined;
      const trimmedPayload = payload.trim();
      if (endpoint.method !== 'GET' && trimmedPayload) {
        try {
          JSON.parse(trimmedPayload);
          body = trimmedPayload;
        } catch (error: any) {
          setResponse({
            status: 0,
            body: {
              error: 'Payload JSON 格式不正确。',
              detail: error?.message || '无法解析 JSON。'
            },
            headers: {}
          });
          return;
        }
      }

      const res = await fetch(buildApiUrl(endpoint.path), {
        method: endpoint.method,
        headers,
        body,
        credentials: 'same-origin'
      });
      const raw = await res.text();
      let data: any = raw;
      if (raw) {
        try {
          data = JSON.parse(raw);
        } catch {
          data = raw;
        }
      }
      setResponse({
        status: res.status,
        body: raw ? data : null,
        headers: Object.fromEntries(res.headers.entries())
      });
    } catch (err: any) {
      setResponse({
        status: 0,
        body: {
          error: err.message || '请求失败。',
          note: '如果本地没有运行后端服务，此请求将失败。'
        },
        headers: {}
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="text-blue-600 text-[10px] font-bold flex items-center gap-1 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100 transition-colors"
      >
        <span className="material-symbols-outlined text-sm">play_circle</span> 调试 (DEBUG)
      </button>
    );
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4 animate-in slide-in-from-top-2 duration-200 shadow-inner">
      <div className="flex justify-between items-center">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">science</span> 实时请求构造器
        </h4>
        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase">认证凭证 (X-API-Key / JWT)</label>
          <input 
            type="password" 
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500 shadow-sm"
            placeholder="粘贴您的 Token 或 Key..."
          />
        </div>

        {endpoint.method !== 'GET' && (
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">请求负载 (Payload JSON)</label>
            <textarea 
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              rows={5}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-blue-500 shadow-sm"
            />
          </div>
        )}
      </div>

      <button 
        onClick={handleSend}
        disabled={loading}
        className="w-full bg-slate-900 text-white py-3 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
      >
        {loading ? '正在通信...' : '执行请求 (EXECUTE)'}
      </button>

      {response && (
        <div className="space-y-2 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">服务器响应</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${response.status >= 200 && response.status < 300 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
              CODE: {response.status}
            </span>
          </div>
          <div className="bg-slate-950 rounded-xl p-4 overflow-x-auto max-h-60 border border-slate-800">
            <pre className="text-[11px] text-blue-300 font-mono">
              {JSON.stringify(response.body, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

const ApiDocumentation: React.FC = () => {
  const [activeSectionTitle, setActiveSectionTitle] = useState(API_DOCS[0].title);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDocs = useMemo(() => {
    if (!searchQuery.trim()) return API_DOCS;
    const query = searchQuery.toLowerCase();

    return API_DOCS.map(section => ({
      ...section,
      endpoints: section.endpoints.filter(ep => 
        ep.path.toLowerCase().includes(query) ||
        ep.description.toLowerCase().includes(query) ||
        ep.method.toLowerCase().includes(query)
      )
    })).filter(section => section.endpoints.length > 0 || section.title.toLowerCase().includes(query));
  }, [searchQuery]);

  const activeSection = filteredDocs.find(s => s.title === activeSectionTitle) || filteredDocs[0];

  return (
    <div className="p-8 flex gap-8 h-full overflow-hidden animate-in fade-in duration-500">
      {/* Sidebar for Docs */}
      <div className="w-72 shrink-0 flex flex-col h-full space-y-6">
        <div>
          <h3 className="px-4 text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">API 参考手册</h3>
          <div className="relative px-2">
            <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <input 
              type="text"
              placeholder="全域接口搜索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-xs focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 pb-10">
          {filteredDocs.map((section) => (
            <button
              key={section.title}
              onClick={() => setActiveSectionTitle(section.title)}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all group flex items-center justify-between ${
                activeSectionTitle === section.title 
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-100 border border-blue-600' 
                  : 'text-slate-500 hover:bg-white hover:text-slate-800'
              }`}
            >
              <span className="truncate">{section.title}</span>
              {section.endpoints.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeSectionTitle === section.title ? 'bg-blue-500 text-blue-50' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                  {section.endpoints.length}
                </span>
              )}
            </button>
          ))}
          {filteredDocs.length === 0 && (
            <div className="p-10 text-center flex flex-col items-center gap-3">
              <span className="material-symbols-outlined text-4xl text-slate-200">manage_search</span>
              <p className="text-xs text-slate-400">未找到相关接口信息</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Doc Content */}
      <div className="flex-1 overflow-y-auto pr-4 space-y-8 pb-32">
        {activeSection ? (
          <div key={activeSection.title} className="space-y-8 animate-in slide-in-from-right-4 duration-300">
            <div className="bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-sm relative overflow-hidden">
               {/* Background Accent */}
               <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl opacity-50 -mr-32 -mt-32"></div>
               
              <div className="relative z-10 flex justify-between items-start mb-10">
                <div>
                  <h2 className="text-3xl font-bold mb-3 text-slate-900">{activeSection.title}</h2>
                  {activeSection.description && (
                    <div className="flex items-center gap-2 text-slate-500 font-mono text-sm bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 inline-flex">
                      <span className="material-symbols-outlined text-sm">terminal</span>
                      {activeSection.description}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-16">
                {activeSection.endpoints.length > 0 ? (
                  activeSection.endpoints.map((ep, i) => (
                    <div key={i} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${i * 100}ms` }}>
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <span className={`px-4 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                            ep.method === 'GET' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 
                            ep.method === 'POST' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' :
                            ep.method === 'PATCH' ? 'bg-amber-500 text-white shadow-lg shadow-amber-100' : 'bg-rose-500 text-white shadow-lg shadow-rose-100'
                          }`}>
                            {ep.method}
                          </span>
                          <code className="text-sm font-bold text-slate-800 bg-slate-100 px-3 py-1.5 rounded-xl">{ep.path}</code>
                        </div>
                        <TryItOut endpoint={ep} />
                      </div>

                      <div className="flex items-start gap-3 p-4 bg-slate-50/50 rounded-2xl border border-slate-100/50">
                        <span className="material-symbols-outlined text-blue-500 text-lg">info</span>
                        <p className="text-sm text-slate-600 leading-relaxed font-medium">{ep.description}</p>
                      </div>
                      
                      {ep.payload && (
                        <div className="space-y-3">
                          <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">请求体示例 (Payload)</h5>
                          <div className="bg-slate-900 rounded-[2rem] p-8 overflow-x-auto shadow-2xl border border-slate-800 relative group">
                            <button
                              type="button"
                              onClick={() => {
                                if (navigator.clipboard) {
                                  void navigator.clipboard.writeText(JSON.stringify(ep.payload, null, 2));
                                }
                              }}
                              className="absolute top-4 right-4 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity hover:text-white"
                            >
                              <span className="material-symbols-outlined text-sm">content_copy</span>
                            </button>
                            <pre className="text-[11px] text-blue-300 font-mono leading-loose">
                              {JSON.stringify(ep.payload, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-20 flex flex-col items-center text-slate-300 border-2 border-dashed border-slate-50 rounded-[2rem]">
                     <span className="material-symbols-outlined text-5xl mb-2">article</span>
                     <p className="text-sm font-bold uppercase tracking-widest">请参考下方注意事项</p>
                  </div>
                )}

                {activeSection.notes && activeSection.notes.length > 0 && (
                  <div className="bg-slate-900 rounded-[2.5rem] p-10 border border-slate-800 shadow-2xl relative overflow-hidden">
                    {/* Visual Decor */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/10 blur-2xl"></div>
                    
                    <h4 className="text-white text-base font-bold mb-6 flex items-center gap-3">
                      <span className="material-symbols-outlined text-blue-400">tips_and_updates</span>
                      开发注意事项
                    </h4>
                    <ul className="space-y-4">
                      {activeSection.notes.map((note, idx) => (
                        <li key={idx} className="text-sm text-slate-400 flex gap-4 items-start leading-relaxed">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span>
                          {note}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 py-20">
            <span className="material-symbols-outlined text-6xl mb-4">search_off</span>
            <p>未找到匹配的 API 接口</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApiDocumentation;
