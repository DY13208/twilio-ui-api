import { ApiSection } from './types';

export const API_DOCS: ApiSection[] = [
  {
    title: '通用说明',
    description: '基础地址：http://localhost:8991',
    endpoints: [],
    notes: [
      '请求体使用 JSON，需设置 Content-Type: application/json。',
      'Admin APIs 使用 JWT tokens；消息 APIs 使用 API keys。',
      '发件人白名单默认包含环境变量中的配置。',
      'SENDGRID_FROM_EMAIL 与 TWILIO_WHATSAPP_FROM 受保护不可删除。'
    ]
  },
  {
    title: '认证与 Key',
    endpoints: [
      {
        method: 'POST',
        path: '/api/login',
        description: '管理员登录，成功后写入 Cookie。',
        payload: { username: 'admin', password: 'your-password' }
      },
      { method: 'GET', path: '/api/admin/token', description: '从 Session Cookie 签发管理员 JWT。' },
      { method: 'POST', path: '/api/logout', description: '退出登录。' },
      { method: 'GET', path: '/api/keys', description: '获取 Key 列表（需管理员登录）。' },
      {
        method: 'POST',
        path: '/api/keys',
        description: '生成新 Key（需管理员登录）。',
        payload: { name: 'Marketing Team', scope: 'send', expires_in_days: 30, admin_user_id: 1 }
      },
      { method: 'PATCH', path: '/api/keys/{key_id}', description: '更新 Key scope/owner（需管理员 JWT）。' },
      { method: 'POST', path: '/api/keys/{key_id}/revoke', description: '撤销 Key（需管理员登录）。' },
      { method: 'GET', path: '/api/admin/users', description: '获取管理员用户列表（需管理员登录）。' },
      {
        method: 'POST',
        path: '/api/admin/users',
        description: '新增/重置管理员用户密码（需管理员登录）。',
        payload: { username: 'ops', password: 'strong-pass' }
      },
      { method: 'POST', path: '/api/admin/users/{user_id}/disable', description: '禁用管理员用户（需管理员登录）。' },
      { method: 'POST', path: '/api/admin/users/{user_id}/enable', description: '启用管理员用户（需管理员登录）。' },
      { method: 'DELETE', path: '/api/admin/users/{user_id}', description: '删除管理员用户（需管理员登录）。' }
    ],
    notes: [
      'Admin APIs 使用 Authorization: Bearer <token>。',
      '所有 API Key 调用 /api 接口时可通过 X-API-Key 或 Authorization: Bearer 传递。',
      '新建 Key 可设置 scope（read/send/manage）与 expires_in_days。'
    ]
  },
  {
    title: 'Email 发件人白名单',
    endpoints: [
      { method: 'GET', path: '/api/email/senders', description: '获取白名单列表。' },
      {
        method: 'POST',
        path: '/api/email/senders',
        description: '添加白名单。',
        payload: { from_email: 'sender@example.com' }
      },
      {
        method: 'DELETE',
        path: '/api/email/senders',
        description: '删除白名单（请求体同上）。',
        payload: { from_email: 'sender@example.com' }
      }
    ],
    notes: [
      '发件人必须是 SendGrid 已验证的邮箱。',
      '删除默认发件人会返回 status=protected。'
    ]
  },
  {
    title: '发送 Email',
    endpoints: [
      {
        method: 'POST',
        path: '/api/send/email',
        description: '发送邮件群发。',
        payload: {
          recipients: ['a@example.com'],
          subject: 'Hello',
          text: 'Hi',
          from_email: 'sender@example.com'
        }
      }
    ],
    notes: [
      'text 或 html 至少提供一个。',
      'from_email 必须在白名单内。'
    ]
  },
  {
    title: 'Email 跟进流程',
    endpoints: [
      { method: 'GET', path: '/api/email/campaigns', description: '获取邮件跟进流程列表。' },
      {
        method: 'POST',
        path: '/api/email/campaigns',
        description: '创建邮件跟进流程。',
        payload: {
          name: 'Follow-up Demo',
          recipients: ['a@example.com'],
          subject: 'Hello',
          text: 'Hi',
          from_email: 'sender@example.com',
          schedule_at: '2026-01-01T09:00:00Z',
          followup_enabled: true,
          followup_delay_minutes: 1440,
          followup_condition: 'unopened',
          followup_subject: 'Checking in',
          followup_text: 'Just following up'
        }
      },
      { method: 'PATCH', path: '/api/email/campaigns/{campaign_id}', description: '更新流程。' },
      { method: 'POST', path: '/api/email/campaigns/{campaign_id}/start', description: '立即启动（或恢复暂停的流程）。' },
      { method: 'POST', path: '/api/email/campaigns/{campaign_id}/pause', description: '暂停。' },
      { method: 'POST', path: '/api/email/campaigns/{campaign_id}/cancel', description: '取消。' }
    ]
  },
  {
    title: '客户（Customer）',
    endpoints: [
      {
        method: 'GET',
        path: '/api/customers',
        description: '获取客户列表。支持查询参数：id/search/tag/has_marketed/country/country_code/limit/offset。'
      },
      { method: 'GET', path: '/api/customers/{customer_id}', description: '获取单个客户。' },
      {
        method: 'POST',
        path: '/api/customers',
        description: '创建客户。',
        payload: {
          name: 'Alice',
          email: 'alice@example.com',
          whatsapp: 'whatsapp:+14155550123',
          mobile: '+8613712345678',
          country: 'US',
          country_code: '1',
          tags: ['OEM', 'hospital']
        }
      },
      { method: 'PATCH', path: '/api/customers/{customer_id}', description: '更新客户。' },
      { method: 'DELETE', path: '/api/customers/{customer_id}', description: '删除客户。' }
    ],
    notes: [
      'email / whatsapp / mobile 至少提供一个。',
      '同邮箱去重；无邮箱时以 whatsapp + mobile 去重。'
    ]
  },
  {
    title: '客户标签管理 (Customer Tags)',
    endpoints: [
      { method: 'GET', path: '/api/customers/tags', description: '获取标签列表及其使用计数。' },
      {
        method: 'POST',
        path: '/api/customers/tags/rename',
        description: '重命名标签（会更新所有客户）。',
        payload: { from_tag: 'OLD_TAG', to_tag: 'NEW_TAG' }
      },
      { method: 'DELETE', path: '/api/customers/tags/{tag}', description: '删除标签（从所有客户中移除该标签）。' }
    ],
    notes: [
      '标签是全局去重的。'
    ]
  },
  {
    title: '客户分组管理 (Customer Groups)',
    endpoints: [
      { method: 'GET', path: '/api/customers/groups', description: '获取分组列表。' },
      {
        method: 'POST',
        path: '/api/customers/groups',
        description: '创建新分组。',
        payload: { name: 'VIP Users', description: 'Priority customers' }
      },
      { method: 'PATCH', path: '/api/customers/groups/{group_id}', description: '更新分组信息。' },
      { method: 'DELETE', path: '/api/customers/groups/{group_id}', description: '删除分组（不会删除组内客户）。' },
      { method: 'GET', path: '/api/customers/groups/{group_id}/members', description: '获取分组成员列表。' },
      {
        method: 'POST',
        path: '/api/customers/groups/{group_id}/members',
        description: '向分组添加成员。',
        payload: { customer_ids: [1, 2, 3] }
      },
      {
        method: 'DELETE',
        path: '/api/customers/groups/{group_id}/members',
        description: '从分组移除成员。',
        payload: { customer_ids: [1, 2] }
      }
    ],
    notes: [
      '分组用于营销计划的目标筛选。'
    ]
  },
  {
    title: '消息模板（Message Templates）',
    endpoints: [
      { method: 'GET', path: '/api/templates', description: '获取模板列表。' },
      { method: 'GET', path: '/api/templates?channel=EMAIL', description: '按渠道筛选。' },
      {
        method: 'POST',
        path: '/api/templates',
        description: '创建模板。',
        payload: {
          channel: 'EMAIL',
          name: 'Intro',
          language: 'en',
          subject: 'Hello',
          content: 'Hi {{name}}'
        }
      },
      { method: 'PATCH', path: '/api/templates/{template_id}', description: '更新模板。' },
      { method: 'DELETE', path: '/api/templates/{template_id}', description: '删除模板。' }
    ],
    notes: [
      'channel 可选：EMAIL / WHATSAPP / SMS。',
      '支持变量占位：{{name}}。',
      '此处为本地消息模板，用于 Email/WhatsApp/SMS 的自由文本内容复用。',
      'WhatsApp 模板消息请使用 /api/whatsapp/templates 获取 content_sid。'
    ]
  },
  {
    title: '营销计划（Marketing Campaigns）',
    endpoints: [
      { method: 'GET', path: '/api/marketing/campaigns', description: '获取计划列表。' },
      { method: 'GET', path: '/api/marketing/campaigns?status=RUNNING', description: '按状态筛选。' },
      {
        method: 'POST',
        path: '/api/marketing/campaigns',
        description: '创建计划。',
        payload: {
          name: 'Global Outreach',
          type: 'MIXED',
          run_immediately: true,
          schedule_time: '2026-01-01T09:00:00Z',
          customer_ids: [1, 2, 3],
          filter_rules: { country: 'US', tags: ['OEM'] },
          created_by: 'ops'
        }
      },
      { method: 'PATCH', path: '/api/marketing/campaigns/{campaign_id}', description: '更新计划。' },
      { method: 'POST', path: '/api/marketing/campaigns/{campaign_id}/start', description: '启动计划。' },
      { method: 'POST', path: '/api/marketing/campaigns/{campaign_id}/stop', description: '停止计划。' },
      { method: 'DELETE', path: '/api/marketing/campaigns/{campaign_id}', description: '删除计划。' }
    ],
    notes: [
      '状态：DRAFT / RUNNING / COMPLETED / STOPPED。',
      'filter_rules 支持 country / country_code / tags / has_marketed / last_email_status 等。'
    ]
  },
  {
    title: '计划步骤（Campaign Steps）',
    endpoints: [
      { method: 'GET', path: '/api/marketing/campaigns/{campaign_id}/steps', description: '获取步骤列表。' },
      {
        method: 'POST',
        path: '/api/marketing/campaigns/{campaign_id}/steps',
        description: '创建步骤。',
        payload: {
          order_no: 1,
          channel: 'EMAIL',
          delay_days: 0,
          filter_rules: { prev_channel: 'EMAIL', reply_status: 'not_replied', within_days: 7 },
          template_id: 12,
          subject: 'Checking in',
          content: 'Hi {{name}}'
        }
      },
      {
        method: 'POST',
        path: '/api/marketing/campaigns/{campaign_id}/steps/batch',
        description: '批量创建步骤。',
        payload: {
          steps: [
            { order_no: 1, channel: 'EMAIL', delay_days: 0 },
            { order_no: 2, channel: 'WHATSAPP', delay_days: 7 }
          ]
        }
      },
      { method: 'PATCH', path: '/api/marketing/campaigns/{campaign_id}/steps/{step_id}', description: '更新步骤。' },
      { method: 'DELETE', path: '/api/marketing/campaigns/{campaign_id}/steps/{step_id}', description: '删除步骤。' }
    ],
    notes: [
      '过滤条件示例：prev_channel / reply_status / within_days / opened_status。',
      '支持：email_opened_within_days / email_replied_within_days / email_not_replied_within_days。',
      'WhatsApp 可用 content_sid + content_variables（content_sid 来自 /api/whatsapp/templates）。',
      'template_id 来自本地模板接口 /api/templates；SMS 步骤暂仅记录。'
    ]
  },
  {
    title: '步骤执行详情（Step Executions）',
    endpoints: [
      {
        method: 'GET',
        path: '/api/marketing/campaigns/{campaign_id}/executions',
        description: '获取执行详情列表。支持 step_id / customer_id / status / limit / offset。'
      },
      {
        method: 'POST',
        path: '/api/marketing/campaigns/{campaign_id}/executions',
        description: '新增执行记录。',
        payload: { step_id: 1, customer_id: 12, status: 'sent', message_id: 999, note: 'manual fix' }
      },
      {
        method: 'PATCH',
        path: '/api/marketing/campaigns/{campaign_id}/executions/{execution_id}',
        description: '更新执行记录。'
      },
      {
        method: 'DELETE',
        path: '/api/marketing/campaigns/{campaign_id}/executions/{execution_id}',
        description: '删除执行记录。'
      }
    ],
    notes: [
      '系统发送时会自动写入执行记录。'
    ]
  },
  {
    title: '客户进度（Campaign Customers）',
    endpoints: [
      {
        method: 'GET',
        path: '/api/marketing/campaigns/{campaign_id}/customers/progress',
        description: '获取已营销客户最新步骤。'
      },
      {
        method: 'POST',
        path: '/api/marketing/campaigns/{campaign_id}/customers/{customer_id}/pause',
        description: '暂停该客户。'
      },
      {
        method: 'POST',
        path: '/api/marketing/campaigns/{campaign_id}/customers/{customer_id}/resume',
        description: '恢复该客户。'
      }
    ],
    notes: [
      '暂停后调度器会跳过该客户。'
    ]
  },
  {
    title: 'WhatsApp 发送人白名单',
    endpoints: [
      { method: 'GET', path: '/api/whatsapp/senders', description: '获取白名单列表。' },
      {
        method: 'POST',
        path: '/api/whatsapp/senders',
        description: '添加白名单。',
        payload: { from_address: 'whatsapp:+14155238886' }
      },
      {
        method: 'DELETE',
        path: '/api/whatsapp/senders',
        description: '删除白名单（请求体同上）。',
        payload: { from_address: 'whatsapp:+14155238886' }
      }
    ],
    notes: [
      '发送人必须是 Twilio 已批准的 WhatsApp 号码。',
      '删除默认发送人会返回 status=protected。'
    ]
  },
  {
    title: '发送 WhatsApp（文本）',
    endpoints: [
      {
        method: 'POST',
        path: '/api/send/whatsapp',
        description: '发送文本消息。',
        payload: {
          recipients: ['+8613712345678'],
          body: 'Hello from Twilio',
          from_address: 'whatsapp:+14155238886',
          media_urls: ['https://example.com/image.png']
        }
      }
    ],
    notes: [
      '文本模式需要 body。',
      'media_urls 为可选，多个链接按数组传入。',
      'use_proxy 设为 false 可禁用本地代理。',
      '窗口期外发送文本可能被 Twilio 拒绝，建议使用模板。'
    ]
  },
  {
    title: '获取 WhatsApp 模板列表',
    endpoints: [
      { method: 'GET', path: '/api/whatsapp/templates', description: '获取模板列表（来自 Twilio Content API）。' }
    ],
    notes: [
      '需要正确配置 Twilio 账号与 Token。',
      '这是 Twilio 模板列表，与本地模板接口 /api/templates 不同。',
      '默认返回最多 50 条，可通过 limit 参数调整。',
      '支持 search 过滤模板名称或 SID。',
      '分页使用 page_token，响应中包含 next_page_token 与 previous_page_token。'
    ]
  },
  {
    title: '发送 WhatsApp（模板）',
    endpoints: [
      {
        method: 'POST',
        path: '/api/send/whatsapp',
        description: '发送模板消息。',
        payload: {
          recipients: ['+8613712345678'],
          content_sid: 'HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          content_variables: { '1': 'Alice', '2': '订单123' },
          from_address: 'whatsapp:+14155238886'
        }
      }
    ],
    notes: [
      '模板必须在 Twilio 中完成审批。',
      'content_variables 为 JSON 对象，可选。',
      '模板模式不需要 body。',
      'use_proxy 设为 false 可禁用本地代理。'
    ]
  },
  {
    title: '短信发送',
    endpoints: [
      {
        method: 'POST',
        path: '/api/send/sms',
        description: '发送短信。',
        payload: {
          recipients: ['+8613712345678'],
          message: '您好，优惠已上线',
          from_number: '+1234567890',
          messaging_service_sid: 'MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          rate_per_minute: 30,
          batch_size: 100,
          append_opt_out: true
        }
      }
    ],
    notes: [
      'message 与 template_id 至少提供一个。',
      'template_variables 为 JSON 对象，可选。',
      '支持配置默认发送来源：TWILIO_SMS_FROM 或 TWILIO_SMS_MESSAGING_SERVICE_SID。'
    ]
  },
  {
    title: '短信模板',
    endpoints: [
      { method: 'GET', path: '/api/sms/templates', description: '获取模板列表。' },
      {
        method: 'POST',
        path: '/api/sms/templates',
        description: '创建模板。',
        payload: { name: '节日优惠', body: '{name}您好，优惠券{code}已到账。', variables: ['name', 'code'] }
      },
      { method: 'PATCH', path: '/api/sms/templates/{template_id}', description: '更新模板。' },
      { method: 'DELETE', path: '/api/sms/templates/{template_id}', description: '停用模板。' }
    ],
    notes: [
      '停用模板后可通过 PATCH 设置 disabled=false 重新启用。'
    ]
  },
  {
    title: '联系人与分组',
    endpoints: [
      { method: 'GET', path: '/api/sms/contacts', description: '查询联系人（支持 search/tag/分页）。' },
      { method: 'POST', path: '/api/sms/contacts', description: '新增或更新联系人（UPSERT/Enabled）。' },
      { method: 'GET', path: '/api/sms/groups', description: '分组管理。' },
      { method: 'POST', path: '/api/sms/groups', description: '创建分组。' }
    ],
    notes: [
      '当前版本仅支持查询与新增联系人。导入导出功能暂未实现。'
    ]
  },
  {
    title: '短信营销活动',
    endpoints: [
      { method: 'GET', path: '/api/sms/campaigns', description: '获取活动列表。' },
      { method: 'POST', path: '/api/sms/campaigns', description: '创建活动。' },
      { method: 'POST', path: '/api/sms/campaigns/{campaign_id}/start', description: '立即启动。' },
      { method: 'GET', path: '/api/sms/stats', description: '查看短信总体统计。' }
    ],
    notes: [
      '当前版本短信活动仅支持创建与立即运行。暂不支持暂停/恢复/取消。'
    ]
  },
  {
    title: '关键词与退订',
    endpoints: [
      { method: 'GET', path: '/api/sms/keyword-rules', description: '关键词自动回复规则。' },
      { method: 'POST', path: '/api/sms/keyword-rules', description: '新增关键词规则。' },
      { method: 'PATCH', path: '/api/sms/keyword-rules', description: '更新关键词规则。' },
      { method: 'DELETE', path: '/api/sms/keyword-rules', description: '删除关键词规则。' },
      { method: 'GET', path: '/api/sms/opt-outs', description: '退订名单。' },
      { method: 'POST', path: '/api/sms/opt-outs', description: '新增退订。' },
      { method: 'GET', path: '/api/sms/blacklist', description: '黑名单。' },
      { method: 'POST', path: '/api/sms/blacklist', description: '新增黑名单。' }
    ]
  },
  {
    title: '状态与历史查询',
    endpoints: [
      {
        method: 'GET',
        path: '/api/messages',
        description: '查询消息列表。所有参数可选：batch_id（批次ID）、channel（渠道）、status（状态）、direction（方向：inbound/outbound）、limit（默认100）、offset（默认0）。'
      },
      { method: 'GET', path: '/api/messages/{message_id}', description: '查询单条消息详情。' },
      { method: 'GET', path: '/api/twilio/message/{message_sid}', description: '从 Twilio 查询消息状态（可选参数 use_proxy）。' },
      { method: 'GET', path: '/api/messages/batch/{batch_id}', description: '查询批次消息列表。' },
      {
        method: 'GET',
        path: '/api/chat/users',
        description: '分页查询有聊天记录的用户列表（包含回复）。所有参数可选：channel（渠道）、created_from/created_to（时间范围，ISO8601格式）、limit（默认50）、offset（默认0）。'
      },
      {
        method: 'GET',
        path: '/api/chat/history',
        description: '获取聊天记录。必需参数：address（用户地址/号码）；可选参数：channel（渠道）、limit（默认50）、offset（默认0）。示例：?address=+1234567890&channel=sms&limit=20'
      },
      { method: 'GET', path: '/api/chat/{user_address}', description: '按用户查看聊天记录（路径参数方式）。' },
      {
        method: 'POST',
        path: '/api/chat/mark-read',
        description: '手动标记消息为已读。',
        payload: { message_ids: [1, 2, 3] }
      }
    ],
    notes: [
      'channel 可选：email / whatsapp / sms。',
      'created_from/created_to 为 ISO8601 时间范围。',
      '返回格式示例：{ "messages": [...], "total": 100, "unread_count": 5 }。'
    ]
  },
  {
    title: '系统设置 (System Settings)',
    endpoints: [
      { method: 'GET', path: '/api/admin/settings/sendgrid-webhook-log', description: '获取 SendGrid Webhook 日志设置（需管理员登录）。' },
      {
        method: 'PATCH',
        path: '/api/admin/settings/sendgrid-webhook-log',
        description: '更新 SendGrid Webhook 日志设置（需管理员登录）。',
        payload: { enabled: true, max_lines: 1000, auto_close: false }
      }
    ],
    notes: [
      '用于调试 SendGrid Webhook 回调内容。'
    ]
  },
  {
    title: 'Webhooks',
    endpoints: [
      { method: 'POST', path: '/webhooks/twilio/whatsapp', description: '接收 Twilio WhatsApp 状态回调。' },
      { method: 'POST', path: '/webhooks/twilio/whatsapp/inbound', description: '接收 WhatsApp 上行消息。' },
      { method: 'POST', path: '/webhooks/twilio/sms/status', description: '接收 Twilio SMS 状态回调。' },
      { method: 'POST', path: '/webhooks/twilio/sms/inbound', description: '接收 SMS 上行消息。' },
      { method: 'POST', path: '/webhooks/sendgrid', description: '接收 SendGrid 事件。' },
      { method: 'POST', path: '/webhooks/sendgrid/inbound', description: '接收 SendGrid Inbound Parse。' }
    ],
    notes: [
      '配置对外地址时需设置 PUBLIC_BASE_URL。',
      '可启用签名校验：TWILIO_VALIDATE_WEBHOOK_SIGNATURE 与 SENDGRID_EVENT_WEBHOOK_VERIFY。'
    ]
  }
];

export const MOCK_CAMPAIGNS: any[] = [
  {
    id: '1',
    name: '沉默用户唤回流水线',
    status: 'RUNNING',
    description: '针对30天未下单用户，通过短信与APP Push组合策略进行唤回。',
    stepsCount: 3,
    customerCount: '5k+',
    lastUpdated: '2025-01-20'
  },
  {
    id: '2',
    name: '新客户首单引导',
    status: 'DRAFT',
    description: '面向新注册用户，推送新人大礼包及使用指南。',
    stepsCount: 2,
    customerCount: '1.2k',
    lastUpdated: '2025-01-18'
  }
];
