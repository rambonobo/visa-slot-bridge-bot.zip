# VISA Slot Bridge Bot (Telegram ➜ WhatsApp)

One-way forwarder: any text your Telegram bot receives is sent to your WhatsApp *groups*,
except groups named **Announcements** or **Discussion** by default.

## Deploy on Railway

1. Create a new Railway service and upload this ZIP.
2. Set **Variables**:
   - `TELEGRAM_TOKEN` (already filled in `.env.example`; copy to Railway)
   - `WHATSAPP_NUMBER` = +919182576201
   - Optional: `EXCLUDE_GROUPS` e.g. `Announcements,Discussion`
   - Optional: `WA_GROUP_ALLOW_REGEX` to only forward to groups matching a regex
3. Deploy.

## Local run

```bash
cp .env.example .env
npm install
node bridge.js
```

Your existing WhatsApp Business session is embedded at `auth_whatsapp/creds.json`,
so there is **no QR/pairing** needed.
