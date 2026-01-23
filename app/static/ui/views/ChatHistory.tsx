import React, { useEffect, useMemo, useState } from 'react';
import {
  apiFetch,
  formatDateTime,
  fromInputDateTime,
  getStoredApiKey,
  readJson,
  setStoredApiKey,
} from '../api';

type Notice = { type: 'success' | 'error' | 'info'; message: string };

interface ChatUser {
  user_address: string;
  total_messages: number;
  unread_count: number;
  last_message_at?: string | null;
  channels: string[];
}

interface ChatMessage {
  id: number;
  channel: string;
  to_address: string;
  from_address: string;
  subject?: string | null;
  body?: string | null;
  status: string;
  read_at?: string | null;
  created_at: string;
}

const formatChannel = (value: string) => {
  const normalized = (value || '').toLowerCase();
  if (normalized === 'email') return '邮件';
  if (normalized === 'whatsapp') return 'WhatsApp';
  if (normalized === 'sms') return '短信';
  return value || '-';
};

const formatDirection = (message: ChatMessage, user?: ChatUser | null) => {
  if (!user) return '-';
  if (message.from_address === user.user_address) return '入站';
  if (message.to_address === user.user_address) return '出站';
  return message.from_address.includes(user.user_address) ? '入站' : '出站';
};

const ChatHistory: React.FC = () => {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState(getStoredApiKey());
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userOffset, setUserOffset] = useState(0);
  const [userLimit, setUserLimit] = useState(10);
  const [userLoading, setUserLoading] = useState(false);
  const [userFilters, setUserFilters] = useState({ channel: '', from: '', to: '' });
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageTotal, setMessageTotal] = useState(0);
  const [messageUnread, setMessageUnread] = useState(0);
  const [messageOffset, setMessageOffset] = useState(0);
  const [messageLimit, setMessageLimit] = useState(10);
  const [messageChannel, setMessageChannel] = useState('');
  const [messageLoading, setMessageLoading] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<number>>(new Set());
  const [activeMessage, setActiveMessage] = useState<ChatMessage | null>(null);

  const userHasPrev = userOffset > 0;
  const userHasNext = userOffset + userLimit < userTotal;
  const messageHasMore = messageOffset + messageLimit < messageTotal;

  const applyApiKey = () => {
    setStoredApiKey(apiKeyInput.trim());
    setNotice({ type: 'success', message: 'API Key 已保存。' });
    setUserOffset(0);
    setSelectedUser(null);
  };

  const loadUsers = async () => {
    setUserLoading(true);
    setNotice(null);
    try {
      const params = new URLSearchParams();
      if (userFilters.channel) params.set('channel', userFilters.channel);
      const fromValue = fromInputDateTime(userFilters.from);
      if (fromValue) params.set('created_from', fromValue);
      const toValue = fromInputDateTime(userFilters.to);
      if (toValue) params.set('created_to', toValue);
      params.set('limit', String(userLimit));
      params.set('offset', String(userOffset));
      const response = await apiFetch(`api/chat/users?${params.toString()}`);
      const data = await readJson<{ users?: ChatUser[]; total?: number; detail?: string }>(response);
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('API Key 无效或未设置。');
        }
        throw new Error(data?.detail || '加载用户列表失败。');
      }
      setUsers(data?.users || []);
      setUserTotal(data?.total || 0);
      if (data?.users?.length && !selectedUser) {
        setSelectedUser(data.users[0]);
      }
    } catch (error: any) {
      setNotice({ type: 'error', message: error?.message || '加载用户列表失败。' });
    } finally {
      setUserLoading(false);
    }
  };

  const loadMessages = async (offsetOverride?: number) => {
    if (!selectedUser) {
      setMessages([]);
      setMessageTotal(0);
      setMessageUnread(0);
      return;
    }
    setMessageLoading(true);
    setNotice(null);
    const nextOffset = typeof offsetOverride === 'number' ? offsetOverride : messageOffset;
    try {
      const params = new URLSearchParams();
      if (messageChannel) params.set('channel', messageChannel);
      params.set('limit', String(messageLimit));
      params.set('offset', String(nextOffset));
      const encodedUser = encodeURIComponent(selectedUser.user_address);
      const response = await apiFetch(`api/chat/${encodedUser}?${params.toString()}`);
      const data = await readJson<{
        messages?: ChatMessage[];
        total?: number;
        unread_count?: number;
        detail?: string;
      }>(response);
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('API Key 无效或未设置。');
        }
        throw new Error(data?.detail || '加载聊天记录失败。');
      }
      setMessages(data?.messages || []);
      setMessageTotal(data?.total || 0);
      setMessageUnread(data?.unread_count || 0);
      setMessageOffset(nextOffset);
      setSelectedMessageIds(new Set());
    } catch (error: any) {
      setNotice({ type: 'error', message: error?.message || '加载聊天记录失败。' });
    } finally {
      setMessageLoading(false);
    }
  };

  const handleMarkRead = async () => {
    const ids = Array.from(selectedMessageIds);
    if (!ids.length) {
      setNotice({ type: 'info', message: '请先选择需要标记的消息。' });
      return;
    }
    try {
      const response = await apiFetch('api/chat/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_ids: ids }),
      });
      const data = await readJson<{ updated?: number; detail?: string }>(response);
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('API Key 无效或未设置。');
        }
        throw new Error(data?.detail || '标记已读失败。');
      }
      setNotice({ type: 'success', message: `已更新 ${data?.updated || 0} 条记录。` });
      loadMessages(0);
    } catch (error: any) {
      setNotice({ type: 'error', message: error?.message || '标记已读失败。' });
    }
  };

  useEffect(() => {
    loadUsers();
  }, [userFilters.channel, userFilters.from, userFilters.to, userOffset, userLimit]);

  useEffect(() => {
    setMessageChannel(userFilters.channel);
  }, [userFilters.channel]);

  useEffect(() => {
    loadMessages(0);
  }, [selectedUser, messageChannel, messageLimit]);

  const selectedUserMeta = useMemo(() => {
    if (!selectedUser) return '-';
    const channelText = selectedUser.channels?.map(formatChannel).join('、') || '-';
    return `${channelText} · 记录 ${selectedUser.total_messages} · 未读 ${selectedUser.unread_count}`;
  }, [selectedUser]);

  const toggleSelectMessage = (id: number) => {
    setSelectedMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedMessageIds((prev) => {
      if (messages.length && prev.size === messages.length) {
        return new Set();
      }
      return new Set(messages.map((m) => m.id));
    });
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">营销记录</h2>
          <p className="text-slate-500 mt-1">查询营销用户与记录统计。</p>
        </div>
        <div className="flex gap-3 items-center">
          <input
            value={apiKeyInput}
            onChange={(event) => setApiKeyInput(event.target.value)}
            className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-xs outline-none focus:border-blue-500"
            placeholder="API Key"
            type="password"
          />
          <button
            onClick={applyApiKey}
            className="bg-slate-900 text-white px-5 py-2.5 rounded-2xl text-xs font-bold"
          >
            保存 Key
          </button>
        </div>
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

      <div className="bg-white rounded-[2.5rem] border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">渠道</label>
            <select
              value={userFilters.channel}
              onChange={(event) => setUserFilters({ ...userFilters, channel: event.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none"
            >
              <option value="">全部</option>
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">开始时间</label>
            <input
              type="datetime-local"
              value={userFilters.from}
              onChange={(event) => setUserFilters({ ...userFilters, from: event.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">结束时间</label>
            <input
              type="datetime-local"
              value={userFilters.to}
              onChange={(event) => setUserFilters({ ...userFilters, to: event.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">每页数量</label>
            <select
              value={userLimit}
              onChange={(event) => setUserLimit(Number(event.target.value) || 10)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none"
            >
              {[10, 20, 50].map((value) => (
                <option key={value} value={value}>
                  每页 {value}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_1.5fr] gap-6">
        <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">营销用户</h3>
              <p className="text-xs text-slate-400">共 {userTotal} 位用户</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (userHasPrev) setUserOffset(Math.max(0, userOffset - userLimit));
                }}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-700 disabled:opacity-40"
                disabled={!userHasPrev}
              >
                上一页
              </button>
              <button
                onClick={() => {
                  if (userHasNext) setUserOffset(userOffset + userLimit);
                }}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-700 disabled:opacity-40"
                disabled={!userHasNext}
              >
                下一页
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-3">用户</th>
                  <th className="px-6 py-3">渠道</th>
                  <th className="px-6 py-3">消息数</th>
                  <th className="px-6 py-3">未读</th>
                  <th className="px-6 py-3">最近时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr
                    key={user.user_address}
                    onClick={() => {
                      setSelectedUser(user);
                    }}
                    className={`cursor-pointer transition-colors ${
                      selectedUser?.user_address === user.user_address
                        ? 'bg-blue-50/50'
                        : 'hover:bg-slate-50/60'
                    }`}
                  >
                    <td className="px-6 py-4 font-semibold text-slate-800">{user.user_address}</td>
                    <td className="px-6 py-4 text-slate-500">
                      {user.channels?.map(formatChannel).join('、') || '-'}
                    </td>
                    <td className="px-6 py-4">{user.total_messages}</td>
                    <td className="px-6 py-4">
                      <span className={user.unread_count ? 'text-rose-500 font-semibold' : 'text-slate-400'}>
                        {user.unread_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{formatDateTime(user.last_message_at || '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {userLoading && <div className="p-6 text-center text-xs text-slate-400">加载中…</div>}
            {!userLoading && users.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400">暂无用户数据。</div>
            )}
          </div>
        </section>

        <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">营销记录</h3>
              <p className="text-xs text-slate-400">{selectedUser ? selectedUserMeta : '请选择左侧营销用户'}</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={messageChannel}
                onChange={(event) => setMessageChannel(event.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs"
              >
                <option value="">全部</option>
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS</option>
              </select>
              <button
                onClick={handleMarkRead}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-700"
              >
                标记已读
              </button>
            </div>
          </div>
          <div className="px-6 py-3 text-xs text-slate-400 flex items-center justify-between">
            <span>总计 {messageTotal} 条 · 未读 {messageUnread} 条</span>
            <select
              value={messageLimit}
              onChange={(event) => setMessageLimit(Number(event.target.value) || 50)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs"
            >
              {[10, 20, 50, 100].map((value) => (
                <option key={value} value={value}>
                  每页 {value}
                </option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-3">
                    <input
                      type="checkbox"
                      checked={messages.length > 0 && selectedMessageIds.size === messages.length}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600"
                    />
                  </th>
                  <th className="px-6 py-3">时间</th>
                  <th className="px-6 py-3">渠道</th>
                  <th className="px-6 py-3">方向</th>
                  <th className="px-6 py-3">状态</th>
                  <th className="px-6 py-3">内容</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {messages.map((message) => (
                  <tr
                    key={message.id}
                    className={`transition-colors ${
                      message.read_at ? 'hover:bg-slate-50/60' : 'bg-emerald-50/40 hover:bg-emerald-50'
                    }`}
                    onClick={() => setActiveMessage(message)}
                  >
                    <td className="px-6 py-4" onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedMessageIds.has(message.id)}
                        onChange={() => toggleSelectMessage(message.id)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600"
                      />
                    </td>
                    <td className="px-6 py-4 text-slate-500">{formatDateTime(message.created_at)}</td>
                    <td className="px-6 py-4">{formatChannel(message.channel)}</td>
                    <td className="px-6 py-4 text-slate-500">{formatDirection(message, selectedUser)}</td>
                    <td className="px-6 py-4 text-slate-500">{message.status || '-'}</td>
                    <td className="px-6 py-4">
                      <span className="text-slate-700 line-clamp-1">
                        {message.subject || message.body || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {messageLoading && <div className="p-6 text-center text-xs text-slate-400">加载中…</div>}
            {!messageLoading && messages.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400">暂无消息记录。</div>
            )}
          </div>
          <div className="px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => {
                if (messageOffset > 0) {
                  const nextOffset = Math.max(0, messageOffset - messageLimit);
                  loadMessages(nextOffset);
                }
              }}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-700 disabled:opacity-40"
              disabled={messageOffset === 0}
            >
              上一页
            </button>
            <button
              onClick={() => {
                if (messageHasMore) {
                  const nextOffset = messageOffset + messageLimit;
                  loadMessages(nextOffset);
                }
              }}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-700 disabled:opacity-40"
              disabled={!messageHasMore}
            >
              下一页
            </button>
          </div>
        </section>
      </div>

      {activeMessage && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setActiveMessage(null)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-8 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xl font-bold text-slate-900">消息详情</h4>
                <p className="text-xs text-slate-400">
                  {formatChannel(activeMessage.channel)} · {formatDateTime(activeMessage.created_at)}
                </p>
              </div>
              <button onClick={() => setActiveMessage(null)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-2 text-sm text-slate-600">
              <div>From: {activeMessage.from_address}</div>
              <div>To: {activeMessage.to_address}</div>
              <div>Status: {activeMessage.status}</div>
            </div>
            {activeMessage.subject && (
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Subject</div>
                <div className="text-sm text-slate-700">{activeMessage.subject}</div>
              </div>
            )}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Body</div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm text-slate-700 whitespace-pre-wrap">
                {activeMessage.body || '-'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatHistory;
