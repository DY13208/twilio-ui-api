# Twilio Broadcast Console（邮件 + WhatsApp + SMS）

一个基于 FastAPI 的极简广播系统，带有 Web UI，可用于批量发送 Email（SendGrid）、WhatsApp（Twilio）、SMS（Twilio），并通过 Webhook 与 REST API 进行状态跟踪。

---

# 安装步骤（Setup）

## 1. 创建虚拟环境并安装依赖：

```bash
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
```

## 2. 复制 `.env.example` 为 `.env` 并填写对应配置。

如果你的 MySQL 连接串是 JDBC 格式：

```
jdbc:mysql://127.0.0.1:3306/marketing?serverTimezone=GMT%2B8&useSSL=FALSE
```

请改为 SQLAlchemy 格式：

```
mysql+pymysql://YOUR_DB:YOUR_PASSWORD@127.0.0.1:3306/marketing?charset=utf8mb4
```

设置管理员账号（用于登录 Web 控制台）：

```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change_me
ADMIN_JWT_SECRET=change_me_too
```

如果你在 **有 TLS 终止的代理（如 Nginx HTTPS）之后部署**，需要设置：

```
ADMIN_COOKIE_SECURE=true
```

如果在本地 HTTP 环境开发，但 `PUBLIC_BASE_URL` 是 HTTPS，避免登录循环重定向，需要：

```
ADMIN_COOKIE_SECURE=false
```

---

## 3. 运行服务：

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

访问地址：

* UI: `http://localhost:8000`
* API 文档: `http://localhost:8000/api-docs`
* 短信营销界面（需登录）: `http://localhost:8000/sms`
* API key 管理: `http://localhost:8000/keys`
* 用户管理: `http://localhost:8000/users`

---

# UI ??

![??????](assets/??????.png)

![?????](assets/?????.png)

![????????](assets/????????.png)

![??????](assets/??????.png)

![??????](assets/??????.png)

![??WhatsApp??](assets/??WhatsAPP??.png)

![??????](assets/??????.png)

![??????](assets/??????.png)

![??KEY??](assets/??KEY%20??.png)

![??API??](assets/??API??.png)

---

# API 说明

所有 `/api/*` 接口（除 `/api/login` 和 `/api/logout` 外）都需要认证。

发送类 API 需要传 API Key：

```
X-API-Key: <key>
```

或：

```
Authorization: Bearer <key>
```

管理员接口（`/api/keys*`, `/api/admin/*`）需要：

```
Authorization: Bearer <admin_jwt_token>
```

API Key 权限（scope）：

* `read`：只能 GET
* `send`：允许发送消息 + read
* `manage`：完全权限（管理发送者等）

---

## API 列表

```
POST /api/send/email
POST /api/send/whatsapp
  GET /api/email/senders
  POST /api/email/senders
  DELETE /api/email/senders
  GET /api/email/campaigns
  POST /api/email/campaigns
  PATCH /api/email/campaigns/{campaign_id}
  POST /api/email/campaigns/{campaign_id}/schedule
  POST /api/email/campaigns/{campaign_id}/start
  POST /api/email/campaigns/{campaign_id}/pause
  POST /api/email/campaigns/{campaign_id}/resume
  POST /api/email/campaigns/{campaign_id}/cancel
  GET /api/email/campaigns/{campaign_id}/flow
  GET /api/whatsapp/senders
POST /api/whatsapp/senders
DELETE /api/whatsapp/senders
GET /api/whatsapp/templates
POST /api/send/sms
GET /api/sms/templates
POST /api/sms/templates
PATCH /api/sms/templates/{template_id}
DELETE /api/sms/templates/{template_id}
GET /api/sms/contacts
POST /api/sms/contacts
PATCH /api/sms/contacts/{contact_id}
DELETE /api/sms/contacts/{contact_id}
POST /api/sms/contacts/import
GET /api/sms/contacts/export
GET /api/sms/groups
POST /api/sms/groups
PATCH /api/sms/groups/{group_id}
DELETE /api/sms/groups/{group_id}
GET /api/sms/groups/{group_id}/members
POST /api/sms/groups/{group_id}/members
DELETE /api/sms/groups/{group_id}/members
GET /api/sms/campaigns
POST /api/sms/campaigns
PATCH /api/sms/campaigns/{campaign_id}
POST /api/sms/campaigns/{campaign_id}/schedule
POST /api/sms/campaigns/{campaign_id}/start
POST /api/sms/campaigns/{campaign_id}/pause
POST /api/sms/campaigns/{campaign_id}/resume
POST /api/sms/campaigns/{campaign_id}/cancel
GET /api/sms/campaigns/{campaign_id}/stats
GET /api/sms/keywords
POST /api/sms/keywords
PATCH /api/sms/keywords/{rule_id}
DELETE /api/sms/keywords/{rule_id}
GET /api/sms/opt-outs
POST /api/sms/opt-outs
DELETE /api/sms/opt-outs/{opt_out_id}
GET /api/sms/blacklist
POST /api/sms/blacklist
DELETE /api/sms/blacklist/{record_id}
GET /api/sms/stats
GET /api/status/{message_id}
GET /api/batch/{batch_id}
GET /api/status/twilio/{message_sid}
POST /api/login
POST /api/logout
GET /api/keys
POST /api/keys
PATCH /api/keys/{key_id}
POST /api/keys/{key_id}/revoke
GET /api/admin/token
GET /api/admin/users
POST /api/admin/users
POST /api/admin/users/{user_id}/disable
POST /api/admin/users/{user_id}/enable
DELETE /api/admin/users/{user_id}
POST /webhooks/twilio/whatsapp
POST /webhooks/sendgrid
```

Email 发送者必须在白名单中（包含 `SENDGRID_FROM_EMAIL` 和通过 API 添加的地址）。

WhatsApp 发送者也必须在白名单（包含 `TWILIO_WHATSAPP_FROM` 和通过 API 添加的地址）。

---

# 示例：发送邮件广播

```bash
curl -X POST http://localhost:8000/api/send/email ^
  -H "X-API-Key: YOUR_KEY" ^
  -H "Content-Type: application/json" ^
  -d "{\"recipients\":[\"a@example.com\"],\"subject\":\"Hello\",\"text\":\"Hi\",\"from_email\":\"sender@example.com\"}"
```

# 示例：添加邮件白名单

```bash
curl -X POST http://localhost:8000/api/email/senders ^
  -H "X-API-Key: YOUR_KEY" ^
  -H "Content-Type: application/json" ^
  -d "{\"from_email\":\"sender@example.com\"}"
```

---

# Webhook 配置

* **Twilio WhatsApp 状态回调：**
  `PUBLIC_BASE_URL/webhooks/twilio/whatsapp`

* **Twilio WhatsApp 接收消息：**
  `PUBLIC_BASE_URL/webhooks/twilio/whatsapp/inbound`

* **Twilio SMS 状态回调：**
  `PUBLIC_BASE_URL/webhooks/twilio/sms/status`

* **Twilio SMS 接收消息：**
  `PUBLIC_BASE_URL/webhooks/twilio/sms/inbound`

* **SendGrid 事件 Webhook：**
  `PUBLIC_BASE_URL/webhooks/sendgrid`

* **SendGrid Inbound Parse：**
  `PUBLIC_BASE_URL/webhooks/sendgrid/inbound`

若启用签名验证：

```
TWILIO_VALIDATE_WEBHOOK_SIGNATURE=true
SENDGRID_EVENT_WEBHOOK_VERIFY=true
SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY=xxxx
```

---

# 服务器部署指南（Linux + Nginx + systemd）

## 1. 安装依赖（Ubuntu）

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip nginx
```

## 2. 部署代码并设置环境变量

```bash
git clone https://github.com/DY13208/twilio-ui-api.git
cd /twilio-ui-api
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

`.env` 必须包含：

```
PUBLIC_BASE_URL=https://your-domain.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change_me
ADMIN_JWT_SECRET=change_me_too
ADMIN_COOKIE_SECURE=true
```

## 3. 配置 systemd（`/etc/systemd/system/twillio.service`）

```
[Unit]
Description=Twilio Broadcast Console
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/twillio
ExecStart=/opt/twillio/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --proxy-headers
Restart=always

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now twillio
sudo systemctl status twillio
```

---

## 4. 配置 Nginx 反向代理（`/etc/nginx/sites-available/twillio`）

```
server {
  listen 80;
  server_name your-domain.com;

  location / {
    proxy_pass http://127.0.0.1:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

启用并重载：

```bash
sudo ln -s /etc/nginx/sites-available/twillio /etc/nginx/sites-enabled/twillio
sudo nginx -t
sudo systemctl reload nginx
```

---

## 5. 配置 HTTPS（certbot）

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

完成后访问：

👉 **[https://your-domain.com](https://your-domain.com)**

并确保 `.env` 中的：

```
PUBLIC_BASE_URL=https://your-domain.com
```

与实际一致。
