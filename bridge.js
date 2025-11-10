import { startWhatsApp } from './whatsapp.js';
import { startTelegram } from './telegram.js';

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER;

if (!TELEGRAM_TOKEN || !WHATSAPP_NUMBER) {
  console.error("Missing TELEGRAM_TOKEN or WHATSAPP_NUMBER");
  process.exit(1);
}

(async () => {
  console.log("🚀 Bridge running (flat Railway build).");
  const { sock, sendToGroupByName } = await startWhatsApp();
  await startTelegram(sendToGroupByName);
})();
