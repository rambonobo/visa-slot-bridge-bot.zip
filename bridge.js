
require("dotenv").config();
const pino = require("pino");
const logger = pino({ level: process.env.LOG_LEVEL || "info" });

const { startWhatsApp } = require("./whatsapp");
const { initTelegram } = require("./telegram");

(async function main() {
  const token = process.env.TELEGRAM_TOKEN;
  const number = process.env.WHATSAPP_NUMBER;
  if (!token || !number) {
    console.error("Missing TELEGRAM_TOKEN or WHATSAPP_NUMBER");
    process.exit(1);
  }

  console.log("🚀 Bridge running (flat Railway build).");

  const wa = await startWhatsApp();
  logger.info("✅ WhatsApp bridge initialized.");

  initTelegram(wa);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
