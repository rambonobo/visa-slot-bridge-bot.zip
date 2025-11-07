# visa-slot-bridge-bot

Bridges **Telegram topic messages** to **specific WhatsApp groups**.

## ✨ What it does
- Listens only to Telegram messages that belong to configured **topic threads**.
- For each allowed (chatId, topicId) pair, forwards the text into a **specific WhatsApp group (JID)**.
- WhatsApp login is via **QR code** (printed in the logs once). Session is saved in `auth_whatsapp/`.

---

## 🚀 Deploy to Railway
1. **Create New Project → Deploy from Repository** (or Upload zip).
2. **Set Environment Variables** (Project → Variables):
   - `TELEGRAM_TOKEN` → your bot token (already present in `.env.example` for reference)
   - Optionally: `LOG_PRETTY=true`
3. **Build & Run**: Railway auto detects Node. Start command is `npm start` which runs `node bridge.js`.
4. **First Boot – Scan WhatsApp QR**:
   - Open Railway → Your Service → **Logs**.
   - You’ll see `Scan the QR from WhatsApp > Linked Devices` and a QR rendered.
   - On your phone: WhatsApp → Settings → Linked Devices → **Link a device** → scan the QR.
   - The session persists in `auth_whatsapp/` so next boots won’t need QR.
5. **Map Telegram topics → WhatsApp groups**:
   - First, get WhatsApp group JIDs by running **Locally** or on Railway console:
     ```bash
     npm run list:wa
     ```
     This prints the **group name and JID** like `1203630xxxxx-123456@g.us`.
   - Edit `group_map.json` and replace each placeholder JID with the real JID.
   - Commit / upload the change and redeploy.

---

## 🧩 Configure which topics to forward
Edit `group_map.json`:
```json
{
  "-1002595608455:116": "12036...@g.us",
  "-1002027823047:18579": "12036...@g.us",
  "-1002057466938:3856": "12036...@g.us",
  "-1002057466938:10039": "12036...@g.us"
}
```
- Keys are `"chatId:topicId"` from Telegram.
- Values are WhatsApp group **JIDs** (the string ending with `@g.us`).

### Your prefilled topics (from you)
- H1B/H4 Updates Alerts: chat **-1002595608455**, topic **116**
- F1 visa realtime info: chat **-1002027823047**, topic **18579**
- B1B2 Updates: chat **-1002057466938**, topic **3856**
- Canada to USA: chat **-1002057466938**, topic **10039**

---

## 🔐 Environment
Copy `.env.example` → `.env` when running locally. On Railway, set the Variable:
```
TELEGRAM_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 🛠️ Commands
- `npm start` — run the bridge (Telegram → WhatsApp)
- `npm run list:wa` — print all WhatsApp groups (after you scan the QR)

---

## 🧯 Notes & Tips
- WhatsApp group JID stays constant; if you leave/rejoin a group, it can change.
- If you see connection 405 errors, just re-run after a minute; Baileys may throttle repeated auth attempts.
- This forwards **only messages inside the exact topics** you mapped. All other messages are ignored.
