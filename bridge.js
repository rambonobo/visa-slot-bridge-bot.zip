import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { initWhatsApp, sendWhatsAppText, getGroups } from './whatsapp.js';
import { log, getCsvEnv } from './utils.js';

dotenv.config();

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
if (!TELEGRAM_TOKEN) {
  console.error('Missing TELEGRAM_TOKEN in environment.');
  process.exit(1);
}

const TEXT_ONLY = String(process.env.TEXT_ONLY || 'true').toLowerCase() !== 'false';

const F_GROUP = process.env.TG_F_GROUP_ID;
const F_TOPICS = getCsvEnv('TG_F_TOPIC_IDS').map(n => parseInt(n, 10)).filter(Boolean);

const B_GROUP = process.env.TG_B_GROUP_ID;
const B_TOPICS = getCsvEnv('TG_B_TOPIC_IDS').map(n => parseInt(n, 10)).filter(Boolean);

const H_GROUP = process.env.TG_H_GROUP_ID;
const H_TOPICS = getCsvEnv('TG_H_TOPIC_IDS').map(n => parseInt(n, 10)).filter(Boolean);

const ALLOW = new Map();
function addAllow(chatId, topics) {
  if (!chatId || !topics?.length) return;
  ALLOW.set(String(chatId), new Set(topics));
}
addAllow(F_GROUP, F_TOPICS);
addAllow(B_GROUP, B_TOPICS);
addAllow(H_GROUP, H_TOPICS);

let TG_TO_WA = {};
try { TG_TO_WA = JSON.parse(process.env.TELEGRAM_TO_WHATSAPP_MAP || '{}'); } catch {}

function keyFor(chatId, threadId) { return `${chatId}:${threadId}`; }

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
log('🤖 Telegram bot started (polling).');

await initWhatsApp({
  onReady: async () => {
    log('Bridge ready. Tip: run `npm run list:wa` locally to discover WhatsApp group JIDs.');
  },
  onGroupsRefreshed: async (groups) => {
    log(`WhatsApp groups available: ${groups.length}`);
  }
});

bot.on('message', async (msg) => {
  const chatId = msg.chat?.id;
  const isTopic = !!msg.is_topic_message;
  const threadId = msg.message_thread_id;

  const allowedTopics = ALLOW.get(String(chatId));
  if (!allowedTopics || !allowedTopics.has(threadId)) return;

  if (TEXT_ONLY && !msg.text) return;

  const text = msg.text?.trim();
  if (!text) return;

  const routeKey = keyFor(chatId, threadId);
  const waJid = TG_TO_WA[routeKey];
  if (!waJid) {
    log(`No WA mapping for ${routeKey}. Add to TELEGRAM_TO_WHATSAPP_MAP.`);
    return;
  }
  try {
    await sendWhatsAppText(waJid, text);
    log(`➡️  Sent from TG(${routeKey}) to WA(${waJid})`);
  } catch (e) {
    log('Send error:', e.message);
  }
});

bot.onText(/^\/whatslist$/, async (msg) => {
  const groups = await getGroups();
  if (!groups?.length) return bot.sendMessage(msg.chat.id, 'No groups found or not connected yet.');
  const lines = groups.map(g => `• ${g.subject}\n   ${g.id}`).join('\n');
  bot.sendMessage(msg.chat.id, `WhatsApp Groups (copy an ID):\n\n${lines}`);
});

log('Listening for Telegram topic messages only.');
