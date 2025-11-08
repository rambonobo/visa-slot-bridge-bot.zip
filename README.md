
# VSIH Bridge Pro (Telegram Topic → WhatsApp Group)
**Only text is forwarded.** Runs on Railway. First run discovers WhatsApp groups, then you paste targets.

## Deploy (Railway)
1) Create a project and upload this repo / connect GitHub.  
2) Add Variables:
- `TELEGRAM_TOKEN` = your bot token
- `TELEGRAM_H_CHAT_ID` = `2595608455`
- `TELEGRAM_H_TOPIC_ID` = `116`
- `TELEGRAM_F_CHAT_ID` = `2027823047`
- `TELEGRAM_F_TOPIC_ID` = `18579`
- `TELEGRAM_B_CHAT_ID` = `2057466938`
- `TELEGRAM_B_TOPIC_ID_1` = `3856`
- `TELEGRAM_B_TOPIC_ID_2` = `10039`
- (Optional) `WHATSAPP_AUTH_DIR` = `./auth_whatsapp`
- (Optional) `SILENT` = `true`

3) Leave all `WHATSAPP_*_GROUP_ID` empty for the **first deploy**.

## First Run (discover groups)
- Open Logs → scan QR (WhatsApp → Linked Devices).  
- The app prints every group with its ID (like `120123456789@g.us`).  
- Copy the desired IDs and set:
  - `WHATSAPP_H_GROUP_ID`
  - `WHATSAPP_F_GROUP_ID`
  - `WHATSAPP_B_GROUP_ID`
  - `WHATSAPP_CANADA_GROUP_ID`
- Redeploy.

## Routing
- `H` topic (`116`) → `WHATSAPP_H_GROUP_ID`
- `F` topic (`18579`) → `WHATSAPP_F_GROUP_ID`
- `B updates` (`3856`) → `WHATSAPP_B_GROUP_ID`
- `Canada→USA` (`10039`) → `WHATSAPP_CANADA_GROUP_ID`

## Local Dev
```bash
cp .env.example .env
npm install
npm start
# scan QR, get group IDs, set them, then npm start again
```
