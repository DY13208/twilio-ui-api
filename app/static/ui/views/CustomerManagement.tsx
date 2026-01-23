import React, { useEffect, useState } from 'react';
import { apiFetch, formatDateTime, parseList, readJson } from '../api';

type NoticeTone = 'success' | 'error' | 'info';

interface NoticeState {
  type: NoticeTone;
  message: string;
}

interface CustomerItem {
  id: number;
  name?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  mobile?: string | null;
  country?: string | null;
  country_code?: string | null;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

interface CustomerListResponse {
  customers?: CustomerItem[];
  total?: number;
  detail?: string;
}

interface CustomerTagItem {
  tag: string;
  count: number;
}

interface CustomerTagListResponse {
  tags?: CustomerTagItem[];
  detail?: string;
}

interface CustomerGroupItem {
  id: number;
  name: string;
  description?: string | null;
  member_count?: number;
  created_at: string;
  updated_at: string;
}

interface CustomerGroupListResponse {
  groups?: CustomerGroupItem[];
  detail?: string;
}

interface CustomerGroupMembersResponse {
  group_id?: number;
  members?: CustomerItem[];
  detail?: string;
}

const formatCustomerLabel = (customer: CustomerItem) => {
  return (
    customer.name ||
    customer.email ||
    customer.whatsapp ||
    customer.mobile ||
    `客户 ${customer.id}`
  );
};

const CustomerManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'customers' | 'tags' | 'groups'>('customers');
  const [notice, setNotice] = useState<NoticeState | null>(null);

  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerTag, setCustomerTag] = useState('');
  const [customerGroupId, setCustomerGroupId] = useState('');
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null);
  const [customerForm, setCustomerForm] = useState({
    name: '',
    email: '',
    whatsapp: '',
    mobile: '',
    country: '',
    countryCode: '',
    tags: '',
  });

  const [tags, setTags] = useState<CustomerTagItem[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagEditing, setTagEditing] = useState<{ from: string; to: string } | null>(null);

  const [groups, setGroups] = useState<CustomerGroupItem[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CustomerGroupItem | null>(null);
  const [groupForm, setGroupForm] = useState({ name: '', description: '' });
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null);
  const [groupMembers, setGroupMembers] = useState<CustomerItem[]>([]);
  const [groupMembersLoading, setGroupMembersLoading] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberOptions, setMemberOptions] = useState<CustomerItem[]>([]);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);

  const showNotice = (type: NoticeTone, message: string) => {
    setNotice({ type, message });
    window.setTimeout(() => setNotice(null), 4000);
  };

  const loadCustomers = async () => {
    setCustomersLoading(true);
    try {
      const params = new URLSearchParams();
      if (customerSearch.trim()) {
        params.set('search', customerSearch.trim());
      }
      if (customerTag.trim()) {
        params.set('tag', customerTag.trim());
      }
      if (customerGroupId) {
        params.set('group_id', customerGroupId);
      }
      params.set('limit', '100');
      params.set('offset', '0');
      const response = await apiFetch(`api/customers?${params.toString()}`);
      const data = await readJson<CustomerListResponse>(response);
      if (!response.ok) {
        throw new Error(data?.detail || '加载客户失败。');
      }
      setCustomers(data?.customers || []);
    } catch (error: any) {
      showNotice('error', error?.message || '加载客户失败。');
    } finally {
      setCustomersLoading(false);
    }
  };

  const resetCustomerForm = () => {
    setShowCustomerForm(false);
    setEditingCustomer(null);
    setCustomerForm({
      name: '',
      email: '',
      whatsapp: '',
      mobile: '',
      country: '',
      countryCode: '',
      tags: '',
    });
  };

  const saveCustomer = async () => {
    const payload: Record<string, any> = {};
    if (customerForm.name.trim()) {
      payload.name = customerForm.name.trim();
    }
    if (customerForm.email.trim()) {
      payload.email = customerForm.email.trim();
    }
    if (customerForm.whatsapp.trim()) {
      payload.whatsapp = customerForm.whatsapp.trim();
    }
    if (customerForm.mobile.trim()) {
      payload.mobile = customerForm.mobile.trim();
    }
    if (customerForm.country.trim()) {
      payload.country = customerForm.country.trim();
    }
    if (customerForm.countryCode.trim()) {
      payload.country_code = customerForm.countryCode.trim();
    }
    const tagsValue = parseList(customerForm.tags);
    if (tagsValue.length) {
      payload.tags = tagsValue;
    }
    if (!payload.email && !payload.whatsapp && !payload.mobile) {
      showNotice('error', '请至少提供 Email / WhatsApp / 手机号其中一项。');
      return;
    }
    try {
      const response = await apiFetch(
        editingCustomer ? `api/customers/${editingCustomer.id}` : 'api/customers',
        {
          method: editingCustomer ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const data = await readJson<{ detail?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.detail || '保存客户失败。');
      }
      showNotice('success', editingCustomer ? '客户已更新。' : '客户已创建。');
      resetCustomerForm();
      loadCustomers();
      loadTags();
    } catch (error: any) {
      showNotice('error', error?.message || '保存客户失败。');
    }
  };

  const editCustomer = (customer: CustomerItem) => {
    setEditingCustomer(customer);
    setCustomerForm({
      name: customer.name || '',
      email: customer.email || '',
      whatsapp: customer.whatsapp || '',
      mobile: customer.mobile || '',
      country: customer.country || '',
      countryCode: customer.country_code || '',
      tags: customer.tags?.join(', ') || '',
    });
    setShowCustomerForm(true);
  };

  const deleteCustomer = async (customer: CustomerItem) => {
    if (!window.confirm(`确认删除客户 ${formatCustomerLabel(customer)} 吗？`)) {
      return;
    }
    try {
      const response = await apiFetch(`api/customers/${customer.id}`, { method: 'DELETE' });
      const data = await readJson<{ detail?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.detail || '删除客户失败。');
      }
      showNotice('success', '客户已删除。');
      loadCustomers();
      loadTags();
      loadGroups();
    } catch (error: any) {
      showNotice('error', error?.message || '删除客户失败。');
    }
  };

  const loadTags = async () => {
    setTagsLoading(true);
    try {
      const response = await apiFetch('api/customers/tags');
      const data = await readJson<CustomerTagListResponse>(response);
      if (!response.ok) {
        throw new Error(data?.detail || '加载标签失败。');
      }
      setTags(data?.tags || []);
    } catch (error: any) {
      showNotice('error', error?.message || '加载标签失败。');
    } finally {
      setTagsLoading(false);
    }
  };

  const renameTag = async () => {
    if (!tagEditing) {
      return;
    }
    const fromTag = tagEditing.from.trim();
    const toTag = tagEditing.to.trim();
    if (!fromTag || !toTag) {
      showNotice('error', '请填写完整标签名称。');
      return;
    }
    try {
      const response = await apiFetch('api/customers/tags/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_tag: fromTag, to_tag: toTag }),
      });
      const data = await readJson<{ detail?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.detail || '标签重命名失败。');
      }
      showNotice('success', '标签已更新。');
      setTagEditing(null);
      loadTags();
      loadCustomers();
    } catch (error: any) {
      showNotice('error', error?.message || '标签重命名失败。');
    }
  };

  const deleteTag = async (tag: string) => {
    if (!window.confirm(`确认删除标签 ${tag} 吗？`)) {
      return;
    }
    try {
      const response = await apiFetch(`api/customers/tags/${encodeURIComponent(tag)}`, {
        method: 'DELETE',
      });
      const data = await readJson<{ detail?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.detail || '删除标签失败。');
      }
      showNotice('success', '标签已删除。');
      loadTags();
      loadCustomers();
    } catch (error: any) {
      showNotice('error', error?.message || '删除标签失败。');
    }
  };

  const loadGroups = async () => {
    setGroupsLoading(true);
    try {
      const response = await apiFetch('api/customers/groups');
      const data = await readJson<CustomerGroupListResponse>(response);
      if (!response.ok) {
        throw new Error(data?.detail || '加载分组失败。');
      }
      setGroups(data?.groups || []);
    } catch (error: any) {
      showNotice('error', error?.message || '加载分组失败。');
    } finally {
      setGroupsLoading(false);
    }
  };

  const resetGroupForm = () => {
    setShowGroupForm(false);
    setEditingGroup(null);
    setGroupForm({ name: '', description: '' });
  };

  const saveGroup = async () => {
    if (!groupForm.name.trim()) {
      showNotice('error', '请输入分组名称。');
      return;
    }
    try {
      const response = await apiFetch(
        editingGroup ? `api/customers/groups/${editingGroup.id}` : 'api/customers/groups',
        {
          method: editingGroup ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: groupForm.name.trim(),
            description: groupForm.description.trim() || null,
          }),
        }
      );
      const data = await readJson<{ detail?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.detail || '保存分组失败。');
      }
      showNotice('success', editingGroup ? '分组已更新。' : '分组已创建。');
      resetGroupForm();
      loadGroups();
    } catch (error: any) {
      showNotice('error', error?.message || '保存分组失败。');
    }
  };

  const editGroup = (group: CustomerGroupItem) => {
    setEditingGroup(group);
    setGroupForm({ name: group.name || '', description: group.description || '' });
    setShowGroupForm(true);
  };

  const deleteGroup = async (group: CustomerGroupItem) => {
    if (!window.confirm(`确认删除分组 ${group.name} 吗？`)) {
      return;
    }
    try {
      const response = await apiFetch(`api/customers/groups/${group.id}`, { method: 'DELETE' });
      const data = await readJson<{ detail?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.detail || '删除分组失败。');
      }
      showNotice('success', '分组已删除。');
      if (activeGroupId === group.id) {
        setActiveGroupId(null);
        setGroupMembers([]);
      }
      loadGroups();
    } catch (error: any) {
      showNotice('error', error?.message || '删除分组失败。');
    }
  };

  const loadGroupMembers = async (groupId: number) => {
    setGroupMembersLoading(true);
    try {
      const response = await apiFetch(`api/customers/groups/${groupId}/members`);
      const data = await readJson<CustomerGroupMembersResponse>(response);
      if (!response.ok) {
        throw new Error(data?.detail || '加载分组成员失败。');
      }
      setGroupMembers(data?.members || []);
    } catch (error: any) {
      showNotice('error', error?.message || '加载分组成员失败。');
    } finally {
      setGroupMembersLoading(false);
    }
  };

  const searchCustomersForGroup = async () => {
    const query = memberSearch.trim();
    if (!query) {
      setMemberOptions([]);
      return;
    }
    setMemberSearchLoading(true);
    try {
      const params = new URLSearchParams({ search: query, limit: '20', offset: '0' });
      const response = await apiFetch(`api/customers?${params.toString()}`);
      const data = await readJson<CustomerListResponse>(response);
      if (!response.ok) {
        throw new Error(data?.detail || '搜索客户失败。');
      }
      setMemberOptions(data?.customers || []);
    } catch (error: any) {
      showNotice('error', error?.message || '搜索客户失败。');
    } finally {
      setMemberSearchLoading(false);
    }
  };

  const addGroupMember = async (customerId: number) => {
    if (!activeGroupId) {
      return;
    }
    try {
      const response = await apiFetch(`api/customers/groups/${activeGroupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_ids: [customerId] }),
      });
      const data = await readJson<CustomerGroupMembersResponse & { detail?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.detail || '添加成员失败。');
      }
      setGroupMembers(data?.members || []);
      loadGroups();
      showNotice('success', '成员已添加。');
    } catch (error: any) {
      showNotice('error', error?.message || '添加成员失败。');
    }
  };

  const removeGroupMember = async (customerId: number) => {
    if (!activeGroupId) {
      return;
    }
    try {
      const response = await apiFetch(`api/customers/groups/${activeGroupId}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_ids: [customerId] }),
      });
      const data = await readJson<CustomerGroupMembersResponse & { detail?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.detail || '移除成员失败。');
      }
      setGroupMembers(data?.members || []);
      loadGroups();
      showNotice('success', '成员已移除。');
    } catch (error: any) {
      showNotice('error', error?.message || '移除成员失败。');
    }
  };

  useEffect(() => {
    loadCustomers();
    loadTags();
    loadGroups();
  }, []);

  const activeGroup = activeGroupId
    ? groups.find((group) => group.id === activeGroupId) || null
    : null;
  const memberIds = new Set(groupMembers.map((member) => member.id));
  const filteredMemberOptions = memberOptions.filter((option) => !memberIds.has(option.id));

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">客户管理</h2>
          <p className="text-slate-500 mt-1">维护客户资料、标签与分组，支持精准客群管理</p>
        </div>
        <div className="flex bg-white border border-slate-200 p-1 rounded-2xl shadow-sm">
          {[
            { id: 'customers', label: '客户列表' },
            { id: 'tags', label: '标签管理' },
            { id: 'groups', label: '客户分组' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
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

      {activeTab === 'customers' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-sm animate-in fade-in duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">客户列表</h3>
            <button
              onClick={() => setShowCustomerForm((prev) => !prev)}
              className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold"
            >
              {showCustomerForm ? '收起表单' : '+ 新增客户'}
            </button>
          </div>

          {showCustomerForm && (
            <div className="mb-6 bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">姓名</label>
                  <input
                    value={customerForm.name}
                    onChange={(event) => setCustomerForm({ ...customerForm, name: event.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500"
                    placeholder="客户名称"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Email</label>
                  <input
                    value={customerForm.email}
                    onChange={(event) => setCustomerForm({ ...customerForm, email: event.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500"
                    placeholder="name@example.com"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">WhatsApp</label>
                  <input
                    value={customerForm.whatsapp}
                    onChange={(event) => setCustomerForm({ ...customerForm, whatsapp: event.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500"
                    placeholder="whatsapp:+123..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">手机号</label>
                  <input
                    value={customerForm.mobile}
                    onChange={(event) => setCustomerForm({ ...customerForm, mobile: event.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500"
                    placeholder="+86137..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">国家</label>
                  <input
                    value={customerForm.country}
                    onChange={(event) => setCustomerForm({ ...customerForm, country: event.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500"
                    placeholder="US"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">国家代码</label>
                  <input
                    value={customerForm.countryCode}
                    onChange={(event) => setCustomerForm({ ...customerForm, countryCode: event.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500"
                    placeholder="1"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">标签 (逗号分隔)</label>
                <input
                  value={customerForm.tags}
                  onChange={(event) => setCustomerForm({ ...customerForm, tags: event.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500"
                  placeholder="VIP, OEM"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={saveCustomer}
                  className="bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-bold"
                >
                  {editingCustomer ? '保存修改' : '保存客户'}
                </button>
                <button
                  onClick={resetCustomerForm}
                  className="border border-slate-200 px-6 py-2 rounded-xl text-xs font-bold text-slate-500"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3 items-center mb-6">
            <input
              value={customerSearch}
              onChange={(event) => setCustomerSearch(event.target.value)}
              className="flex-1 min-w-[220px] bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500"
              placeholder="搜索客户姓名/邮箱/手机号"
            />
            <input
              value={customerTag}
              onChange={(event) => setCustomerTag(event.target.value)}
              className="w-40 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500"
              placeholder="按标签过滤"
            />
            <select
              value={customerGroupId}
              onChange={(event) => setCustomerGroupId(event.target.value)}
              className="w-48 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="">全部分组</option>
              {groups.map((group) => (
                <option key={group.id} value={String(group.id)}>
                  {group.name}
                </option>
              ))}
            </select>
            <button
              onClick={loadCustomers}
              className="bg-blue-600 text-white px-5 py-2 rounded-xl text-xs font-bold"
            >
              查询
            </button>
          </div>

          <div className="overflow-hidden border border-slate-100 rounded-2xl">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">姓名</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">WhatsApp</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">手机号</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">标签</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">创建时间</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-slate-700">{customer.id}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{customer.name || '-'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{customer.email || '-'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{customer.whatsapp || '-'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{customer.mobile || '-'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {customer.tags && customer.tags.length ? customer.tags.join(', ') : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatDateTime(customer.created_at)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => editCustomer(customer)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => deleteCustomer(customer)}
                          className="text-rose-500 hover:text-rose-700"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!customers.length && !customersLoading && (
                  <tr>
                    <td colSpan={8} className="px-6 py-6 text-sm text-slate-400 text-center">
                      暂无客户。
                    </td>
                  </tr>
                )}
                {customersLoading && (
                  <tr>
                    <td colSpan={8} className="px-6 py-6 text-sm text-slate-400 text-center">
                      正在加载...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'tags' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-sm animate-in fade-in duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">标签管理</h3>
            <button
              onClick={loadTags}
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              刷新
            </button>
          </div>

          <div className="overflow-hidden border border-slate-100 rounded-2xl">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">标签</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">数量</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {tags.map((tagItem) => {
                  const isEditing = tagEditing?.from === tagItem.tag;
                  return (
                    <tr key={tagItem.tag} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-700">
                        {isEditing ? (
                          <input
                            value={tagEditing?.to || ''}
                            onChange={(event) =>
                              setTagEditing({ from: tagItem.tag, to: event.target.value })
                            }
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1 text-sm outline-none focus:border-blue-500"
                          />
                        ) : (
                          tagItem.tag
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{tagItem.count}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {isEditing ? (
                          <div className="flex items-center gap-3">
                            <button
                              onClick={renameTag}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              保存
                            </button>
                            <button
                              onClick={() => setTagEditing(null)}
                              className="text-slate-400 hover:text-slate-600"
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setTagEditing({ from: tagItem.tag, to: tagItem.tag })}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              重命名
                            </button>
                            <button
                              onClick={() => deleteTag(tagItem.tag)}
                              className="text-rose-500 hover:text-rose-700"
                            >
                              删除
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!tags.length && !tagsLoading && (
                  <tr>
                    <td colSpan={3} className="px-6 py-6 text-sm text-slate-400 text-center">
                      暂无标签。
                    </td>
                  </tr>
                )}
                {tagsLoading && (
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

      {activeTab === 'groups' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-sm animate-in fade-in duration-300 space-y-8">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold">客户分组</h3>
            <button
              onClick={() => setShowGroupForm((prev) => !prev)}
              className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold"
            >
              {showGroupForm ? '收起表单' : '+ 新增分组'}
            </button>
          </div>

          {showGroupForm && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">分组名称</label>
                  <input
                    value={groupForm.name}
                    onChange={(event) => setGroupForm({ ...groupForm, name: event.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500"
                    placeholder="例如：高价值客户"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">描述</label>
                  <input
                    value={groupForm.description}
                    onChange={(event) =>
                      setGroupForm({ ...groupForm, description: event.target.value })
                    }
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500"
                    placeholder="可选说明"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={saveGroup}
                  className="bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-bold"
                >
                  {editingGroup ? '保存修改' : '保存分组'}
                </button>
                <button
                  onClick={resetGroupForm}
                  className="border border-slate-200 px-6 py-2 rounded-xl text-xs font-bold text-slate-500"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          <div className="overflow-hidden border border-slate-100 rounded-2xl">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">名称</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">描述</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">成员数</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">更新时间</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {groups.map((group) => (
                  <tr key={group.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">{group.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{group.description || '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{group.member_count || 0}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {formatDateTime(group.updated_at)}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => editGroup(group)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => {
                            setActiveGroupId(group.id);
                            loadGroupMembers(group.id);
                          }}
                          className="text-emerald-600 hover:text-emerald-800"
                        >
                          成员
                        </button>
                        <button
                          onClick={() => deleteGroup(group)}
                          className="text-rose-500 hover:text-rose-700"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!groups.length && !groupsLoading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-6 text-sm text-slate-400 text-center">
                      暂无分组。
                    </td>
                  </tr>
                )}
                {groupsLoading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-6 text-sm text-slate-400 text-center">
                      正在加载...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {activeGroup && (
            <div className="border border-slate-200 rounded-3xl p-6 bg-slate-50/60 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-bold text-slate-800">{activeGroup.name} · 成员</h4>
                  <p className="text-xs text-slate-500">
                    当前 {groupMembers.length} 人
                  </p>
                </div>
                <button
                  onClick={() => activeGroupId && loadGroupMembers(activeGroupId)}
                  className="text-xs font-bold text-blue-600 hover:underline"
                >
                  刷新成员
                </button>
              </div>

              <div className="flex flex-wrap gap-3 items-center">
                <input
                  value={memberSearch}
                  onChange={(event) => setMemberSearch(event.target.value)}
                  className="flex-1 min-w-[220px] bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500"
                  placeholder="搜索客户添加到分组"
                />
                <button
                  onClick={searchCustomersForGroup}
                  className="bg-blue-600 text-white px-5 py-2 rounded-xl text-xs font-bold"
                >
                  搜索
                </button>
              </div>

              {memberSearchLoading && (
                <div className="text-xs text-slate-400">搜索中...</div>
              )}

              {filteredMemberOptions.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredMemberOptions.map((option) => (
                    <div
                      key={option.id}
                      className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-sm font-semibold text-slate-800">
                          {formatCustomerLabel(option)}
                        </div>
                        <div className="text-xs text-slate-400">ID: {option.id}</div>
                      </div>
                      <button
                        onClick={() => addGroupMember(option.id)}
                        className="text-xs font-bold text-emerald-600 hover:text-emerald-800"
                      >
                        添加
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="overflow-hidden border border-slate-100 rounded-2xl bg-white">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">客户</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">联系方式</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {groupMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {formatCustomerLabel(member)}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {member.email || member.whatsapp || member.mobile || '-'}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          <button
                            onClick={() => removeGroupMember(member.id)}
                            className="text-rose-500 hover:text-rose-700"
                          >
                            移除
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!groupMembers.length && !groupMembersLoading && (
                      <tr>
                        <td colSpan={3} className="px-6 py-6 text-sm text-slate-400 text-center">
                          暂无成员。
                        </td>
                      </tr>
                    )}
                    {groupMembersLoading && (
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
        </div>
      )}
    </div>
  );
};

export default CustomerManagement;
