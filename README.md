# VSIH BRIDGE (Telegram → WhatsApp, text-only)

## Local first run
```bash
npm install
node bridge.js
```
Scan the QR from qr.png / console to link WhatsApp. This creates **auth_whatsapp/**.

## Get WhatsApp group IDs
```bash
npm run list:wa
```
Copy the JIDs ending with `@g.us` and fill `.env` -> `TELEGRAM_TO_WHATSAPP_MAP`.

## Deploy to Railway
Upload the whole folder (or push to GitHub), **including auth_whatsapp/**.
Set env vars matching `.env` values.
