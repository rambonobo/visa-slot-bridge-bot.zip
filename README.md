# VISA Bridge (Railway, Telegram → WhatsApp)

One-way bridge from **Telegram topics** to **WhatsApp group names**.

## Configure on Railway

1. Create a new Railway Service → "Deploy from folder" (or GitHub repo).
2. Set **Environment Variables**:
   - `TELEGRAM_TOKEN` = your BotFather token (already placed in .env here).
   - `WHATSAPP_NUMBER` = +919182576201 (already set).
   - `TOPICS_ONLY` = true
3. Deploy.

## First Login

- If you **do not** upload a valid `auth_whatsapp/creds.json`, the app will try **phone pairing**. Check logs for a pairing code, or it will fall back to QR.
- If you already have a Baileys session locally, upload the entire `auth_whatsapp/` folder next to `bridge.js` in Railway.

## Edit mappings

See `mappings.json`. We keyed by **chat username** + **topic id** → **WhatsApp group name**.

