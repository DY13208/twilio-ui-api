# Twilio Broadcast Console (Email + WhatsApp)

Minimal FastAPI service with a web UI for broadcasting Email (SendGrid) and WhatsApp (Twilio), plus status tracking via webhooks and a REST API.

## Setup

1. Create a virtual environment and install dependencies:

```bash
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
```

2. Copy `.env.example` to `.env` and fill in values.

If you have a JDBC URL like:

```
jdbc:mysql://127.0.0.1:3306/marketing?serverTimezone=GMT%2B8&useSSL=FALSE
```

Use this SQLAlchemy format:

```
mysql+pymysql://YOUR_DB:YOUR_PASSWORD@127.0.0.1:3306/marketing?charset=utf8mb4
```

Make sure to set admin credentials so you can log in:

```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change_me
```

If you're behind a TLS-terminating proxy, set `ADMIN_COOKIE_SECURE=true` (or pass
`X-Forwarded-Proto=https`). For local HTTP dev with an HTTPS `PUBLIC_BASE_URL`,
set `ADMIN_COOKIE_SECURE=false` to avoid login redirect loops.

3. Run the service:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Open `http://localhost:8000` for the UI.
Open `http://localhost:8000/api-docs` for API docs.
Open `http://localhost:8000/keys` for API key management after login.

## API

All `/api/*` endpoints (except `/api/login`, `/api/logout`, and `/api/keys*`) require an API key.
Send it via `X-API-Key: <key>` or `Authorization: Bearer <key>`.

API key scopes:

- `read`: only GET endpoints
- `send`: send messages + read
- `manage`: full access (senders management)

- `POST /api/send/email`
- `POST /api/send/whatsapp`
- `GET /api/email/senders`
- `POST /api/email/senders`
- `DELETE /api/email/senders`
- `GET /api/whatsapp/senders`
- `POST /api/whatsapp/senders`
- `DELETE /api/whatsapp/senders`
- `GET /api/whatsapp/templates`
- `GET /api/status/{message_id}`
- `GET /api/batch/{batch_id}`
- `GET /api/status/twilio/{message_sid}`
- `POST /api/login`
- `POST /api/logout`
- `GET /api/keys`
- `POST /api/keys`
- `POST /api/keys/{key_id}/revoke`
- `GET /api/admin/users`
- `POST /api/admin/users`
- `POST /api/admin/users/{user_id}/disable`
- `POST /api/admin/users/{user_id}/enable`
- `POST /webhooks/twilio/whatsapp`
- `POST /webhooks/sendgrid`

Email senders must be in the whitelist (includes `SENDGRID_FROM_EMAIL` plus entries added via the senders API).
WhatsApp senders must be in the whitelist (includes `TWILIO_WHATSAPP_FROM` plus entries added via the senders API).

### Example: Email broadcast

```bash
curl -X POST http://localhost:8000/api/send/email ^
  -H "X-API-Key: YOUR_KEY" ^
  -H "Content-Type: application/json" ^
  -d "{\"recipients\":[\"a@example.com\"],\"subject\":\"Hello\",\"text\":\"Hi\",\"from_email\":\"sender@example.com\"}"
```

### Example: Add Email sender whitelist

```bash
curl -X POST http://localhost:8000/api/email/senders ^
  -H "X-API-Key: YOUR_KEY" ^
  -H "Content-Type: application/json" ^
  -d "{\"from_email\":\"sender@example.com\"}"
```

### Example: WhatsApp broadcast

```bash
curl -X POST http://localhost:8000/api/send/whatsapp ^
  -H "X-API-Key: YOUR_KEY" ^
  -H "Content-Type: application/json" ^
  -d "{\"recipients\":[\"+8613712345678\"],\"body\":\"Hello from Twilio\",\"from_address\":\"whatsapp:+14155238886\"}"
```

### Example: WhatsApp template

```bash
curl -X POST http://localhost:8000/api/send/whatsapp ^
  -H "X-API-Key: YOUR_KEY" ^
  -H "Content-Type: application/json" ^
  -d "{\"recipients\":[\"+8613712345678\"],\"content_sid\":\"HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\",\"content_variables\":{\"1\":\"Alice\"},\"from_address\":\"whatsapp:+14155238886\"}"
```

### Example: List WhatsApp templates

```bash
curl http://localhost:8000/api/whatsapp/templates ^
  -H "X-API-Key: YOUR_KEY"
```

Supports optional query params:

- `limit` (default 50)
- `search` (filter by name or SID)
- `page_token` (pagination)

### Example: Add WhatsApp sender whitelist

```bash
curl -X POST http://localhost:8000/api/whatsapp/senders ^
  -H "X-API-Key: YOUR_KEY" ^
  -H "Content-Type: application/json" ^
  -d "{\"from_address\":\"whatsapp:+14155238886\"}"
```

### Example: Create API key (admin login required)

```bash
curl -X POST http://localhost:8000/api/keys ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Marketing\",\"scope\":\"send\",\"expires_in_days\":30}"
```

## Webhooks

- **Twilio WhatsApp**: configure the Status Callback URL to `PUBLIC_BASE_URL/webhooks/twilio/whatsapp`.
- **SendGrid**: configure Event Webhook to `PUBLIC_BASE_URL/webhooks/sendgrid`.

If you enable signature verification:

- `TWILIO_VALIDATE_WEBHOOK_SIGNATURE=true`
- `SENDGRID_EVENT_WEBHOOK_VERIFY=true` and set `SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY`.

## 服务器部署指南（Linux + Nginx + systemd）

1. 安装依赖（以 Ubuntu 为例）：

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip nginx
```

2. 部署代码并准备环境变量：

```bash
git clone <your-repo> /opt/twillio
cd /opt/twillio
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

确保 `.env` 至少包含以下关键项（Webhook/登录相关）：

```
PUBLIC_BASE_URL=https://your-domain.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change_me
ADMIN_COOKIE_SECURE=true
```

3. 创建 systemd 服务（`/etc/systemd/system/twillio.service`）：

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

启用并启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now twillio
sudo systemctl status twillio
```

4. 配置 Nginx 反向代理（`/etc/nginx/sites-available/twillio`）：

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

5. 配置 HTTPS（示例使用 certbot）：

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

完成后访问：`https://your-domain.com`，并确保 `PUBLIC_BASE_URL` 使用同一域名。
