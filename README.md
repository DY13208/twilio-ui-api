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
mysql+pymysql://dify:YOUR_PASSWORD@127.0.0.1:3306/marketing?charset=utf8mb4
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
