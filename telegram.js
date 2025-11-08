
import TelegramBot from 'node-telegram-bot-api';
import { log, normalizeChatId } from './utils.js';

export function startTelegram(token, routes) {
  const bot = new TelegramBot(token, { polling: true });
  log.info('✅ Telegram bot started (polling).');

  function matchRoute(msg) {
    const chatId = msg.chat?.id;
    const threadId = msg.message_thread_id; // topic id
    const text = msg.text || msg.caption || '';

    for (const r of routes) {
      if (chatId === r.chatId && threadId === r.threadId) {
        return { route: r, text };
      }
    }
    return null;
  }

  bot.on('message', async (msg) => {
    if (!msg.is_topic_message) return;
    if (!(msg.text || msg.caption)) return;

    const m = matchRoute(msg);
    if (!m) return;

    try {
      const payload = m.text;
      if (!payload || !payload.trim()) return;
      await m.route.whSend(payload.trim());
    } catch (e) {
      log.error(e, 'Failed to forward message to WhatsApp.');
    }
  });

  return bot;
}

export function buildRoutesFromEnv(sendToWhatsApp) {
  const raw = {
    hChat: process.env.TELEGRAM_H_CHAT_ID,
    hTopic: process.env.TELEGRAM_H_TOPIC_ID,
    hWa: process.env.WHATSAPP_H_GROUP_ID,

    fChat: process.env.TELEGRAM_F_CHAT_ID,
    fTopic: process.env.TELEGRAM_F_TOPIC_ID,
    fWa: process.env.WHATSAPP_F_GROUP_ID,

    bChat: process.env.TELEGRAM_B_CHAT_ID,
    bTopic1: process.env.TELEGRAM_B_TOPIC_ID_1,
    bTopic2: process.env.TELEGRAM_B_TOPIC_ID_2,
    bWa: process.env.WHATSAPP_B_GROUP_ID,
    caWa: process.env.WHATSAPP_CANADA_GROUP_ID
  };

  const routes = [];

  if (raw.hChat && raw.hTopic && raw.hWa) {
    routes.push({
      name: 'H1B',
      chatId: normalizeChatId(raw.hChat),
      threadId: Number(raw.hTopic),
      whSend: (text) => sendToWhatsApp(raw.hWa, text)
    });
  }

  if (raw.fChat && raw.fTopic && raw.fWa) {
    routes.push({
      name: 'F1',
      chatId: normalizeChatId(raw.fChat),
      threadId: Number(raw.fTopic),
      whSend: (text) => sendToWhatsApp(raw.fWa, text)
    });
  }

  if (raw.bChat && raw.bTopic1 && raw.bWa) {
    routes.push({
      name: 'B updates',
      chatId: normalizeChatId(raw.bChat),
      threadId: Number(raw.bTopic1),
      whSend: (text) => sendToWhatsApp(raw.bWa, text)
    });
  }

  if (raw.bChat && raw.bTopic2 && raw.caWa) {
    routes.push({
      name: 'Canada→USA',
      chatId: normalizeChatId(raw.bChat),
      threadId: Number(raw.bTopic2),
      whSend: (text) => sendToWhatsApp(raw.caWa, text)
    });
  }

  return routes;
}
