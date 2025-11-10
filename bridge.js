
require('dotenv').config();
const pino = require('pino');
const { startWhatsApp } = require('./whatsapp');
const { startTelegramBot } = require('./telegram');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER;
const TOPICS_ONLY = /^true$/i.test(process.env.TOPICS_ONLY || 'true');

if (!TELEGRAM_TOKEN || !WHATSAPP_NUMBER) {
  console.error('Missing TELEGRAM_TOKEN or WHATSAPP_NUMBER');
  process.exit(1);
}

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

async function main() {
  logger.info('🚀 Bridge running (flat Railway build).');
  const wa = await startWhatsApp({ phoneNumber: WHATSAPP_NUMBER, logger });

  await startTelegramBot({
    token: TELEGRAM_TOKEN,
    topicsOnly: TOPICS_ONLY,
    onForward: wa.sendToGroupByName,
    logger
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
