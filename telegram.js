
const { Telegraf } = require("telegraf");
const pino = require("pino");
const logger = pino({ level: process.env.LOG_LEVEL || "info" });

let waApi = null;

function initTelegram(waApiRef) {
  waApi = waApiRef;
  const token = process.env.TELEGRAM_TOKEN;
  if (!token) throw new Error("Missing TELEGRAM_TOKEN");

  const bot = new Telegraf(token);

  bot.on("text", async (ctx) => {
    const chatId = ctx.chat?.id;
    const text = ctx.message?.text || "";
    const fromTitle = ctx.chat?.title || ctx.chat?.username || ctx.from?.username || ctx.from?.first_name || "Unknown";

    logger.info(`📩 From Telegram ${chatId}: ${fromTitle}:\n${text}`);

    try {
      await waApi.sendToAllEligible(text);
    } catch (e) {
      logger.error(e, "Failed to send to WhatsApp");
    }
  });

  bot.launch().then(() => logger.info("🤖 Telegram bot started."));

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

module.exports = { initTelegram };
