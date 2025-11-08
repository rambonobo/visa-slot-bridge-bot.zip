
import 'dotenv/config';
import { log } from './utils.js';
import { connectWhatsApp } from './whatsapp.js';
import { startTelegram, buildRoutesFromEnv } from './telegram.js';

async function main() {
  const token = process.env.TELEGRAM_TOKEN;
  if (!token) {
    console.error('Missing TELEGRAM_TOKEN in environment.');
    process.exit(1);
  }

  const missingWaIds = [
    'WHATSAPP_H_GROUP_ID',
    'WHATSAPP_F_GROUP_ID',
    'WHATSAPP_B_GROUP_ID',
    'WHATSAPP_CANADA_GROUP_ID'
  ].filter((k) => !process.env[k]);

  if (missingWaIds.length) {
    console.log('Some WhatsApp group IDs are missing:', missingWaIds.join(', '));
    console.log('Connecting to WhatsApp to list your groups...');
    await connectWhatsApp({ listOnly: true });
    console.log('Scan the QR in logs (Linked Devices). Copy group IDs from the list above.');
    console.log('Add them to Railway Variables, then redeploy.');
    setTimeout(() => process.exit(0), 90_000);
    return;
  }

  const wa = await connectWhatsApp();
  const routes = buildRoutesFromEnv((gid, text) => wa.sendTo(gid, text));

  if (!routes.length) {
    console.error('No valid Telegram→WhatsApp routes from env. Check your env vars.');
    process.exit(1);
  }

  routes.forEach(r => log.info({ route: r.name, chatId: r.chatId, threadId: r.threadId }, 'Route ready.'));
  startTelegram(token, routes);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
