import { Telegraf } from 'telegraf';

export async function startTelegram(sendToGroupByName) {
  const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
  console.log("🤖 Telegram bot started.");

  bot.on('message', async (ctx) => {
    const chatId = ctx.chat?.id?.toString() || '';
    const text = ctx.message?.text || '';
    if (!text) return;

    console.log(`📩 From Telegram ${chatId}: ${text.slice(0, 60)}`);

    try {
      await sendToGroupByName(ctx.chat?.title || 'Unknown', text);
    } catch (err) {
      console.error("❌ Failed forwarding message:", err.message);
    }
  });

  await bot.launch();
}
