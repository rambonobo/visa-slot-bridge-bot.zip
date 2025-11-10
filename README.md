# visa-bridge-railway-final

One‑way **Telegram → WhatsApp** forwarder (Baileys + Telegraf).

## Run
```
npm install
node bridge.js
```
If no WA session, you'll see a **phone-link code**, else a **QR** in the console.

## Map chats
Inside any Telegram group (where the bot is a member):
```
/link <WhatsApp Group Name>
/status
/unlink
```
Mappings saved in `mappings.json`.

## Env
See `.env` or `.env.example`.
