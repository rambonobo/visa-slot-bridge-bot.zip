import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import { makeLogger, buildMappings, formatFromTelegram } from './utils.js';
import { connectWhatsApp, sendTextToGroup } from './whatsapp.js';
import http from 'http';

const logger = makeLogger();
const TOKEN = process.env.TELEGRAM_TOKEN;
if (!TOKEN) {
  console.error('Missing TELEGRAM_TOKEN in environment.');
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });
const mappings = buildMappings(logger);

// --- Control state ---
let forwardingActive = true;
const ADMIN_ID = 6180255804; // Replace with your Telegram ID

function matchMapping(message) {
  if (!message || !message.chat || !message.message_thread_id) return null;
  const chatId = message.chat.id;
  const threadId = message.message_thread_id;
  return mappings.find(m => m.tg.chatId === chatId && m.tg.topicId === threadId) || null;
}

// Handle /pause and /resume
bot.onText(/^\/(pause|resume)$/, async (msg, match) => {
  if (msg.from.id !== ADMIN_ID) {
    return bot.sendMessage(msg.chat.id, "⛔ You are not authorized to control the bridge.");
  }
  const cmd = match[1];
  if (cmd === 'pause') {
    forwardingActive = false;
    bot.sendMessage(msg.chat.id, "⏸️ Forwarding paused. No messages will be sent to WhatsApp.");
    logger.warn('Forwarding paused by admin.');
  } else {
    forwardingActive = true;
    bot.sendMessage(msg.chat.id, "▶️ Forwarding resumed. Messages will now be sent to WhatsApp.");
    logger.info('Forwarding resumed by admin.');
  }
});

bot.on('message', async (msg) => {
  try {
    if (!forwardingActive) return;
    if (!msg.is_topic_message) return;
    const m = matchMapping(msg);
    if (!m) return;
    const txt = formatFromTelegram(msg);
    if (!txt) return;
    const jid = await sendTextToGroup(m.wa, txt);
    logger.info({ tg: { chatId: msg.chat.id, thread: msg.message_thread_id }, wa: m.wa, jid }, 'Forwarded message');
  } catch (err) {
    logger.error({ err }, 'message handler failed');
  }
});

bot.on('edited_message', async (msg) => {
  try {
    if (!forwardingActive) return;
    if (!msg.is_topic_message) return;
    const m = matchMapping(msg);
    if (!m) return;
    const txt = formatFromTelegram(msg);
    if (!txt) return;
    const jid = await sendTextToGroup(m.wa, `[edited]\n${txt}`);
    logger.info({ tg: { chatId: msg.chat.id, thread: msg.message_thread_id }, wa: m.wa, jid }, 'Forwarded edited message');
  } catch (err) {
    logger.error({ err }, 'edited handler failed');
  }
});

const port = process.env.PORT || 3000;
http.createServer((_, res) => { res.writeHead(200); res.end('OK'); }).listen(port, () => {
  logger.info({ port }, 'Health server listening');
});

connectWhatsApp().catch(err => {
  logger.error({ err }, 'Failed to connect WhatsApp');
  process.exit(1);
});
