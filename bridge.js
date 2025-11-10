import 'dotenv/config';
import { Telegraf } from 'telegraf';
import fs from 'fs';
import pino from 'pino';
import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion, Browsers } from 'baileys';

const log = pino({ level: 'info' });
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER;

if (!TELEGRAM_TOKEN || !WHATSAPP_NUMBER) {
  console.error('Missing TELEGRAM_TOKEN or WHATSAPP_NUMBER');
  process.exit(1);
}

let mappings = {};
try { mappings = JSON.parse(fs.readFileSync('./mappings.json', 'utf8')); } catch {}

async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_whatsapp');
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version,
    logger: log,
    printQRInTerminal: true,
    auth: state,
    browser: Browsers.macOS('Safari')
  });
  sock.ev.on('creds.update', saveCreds);
  return sock;
}

const sock = await startWhatsApp();
const bot = new Telegraf(TELEGRAM_TOKEN);

bot.on('message', async (ctx) => {
  const chatId = String(ctx.chat?.id);
  const thread = ctx.message.message_thread_id;
  let key = chatId;
  if (thread) {
    const txt = ctx.message.text?.toLowerCase() || '';
    if (txt.includes('b updates')) key = chatId + '#b_updates';
    if (txt.includes('canada')) key = chatId + '#canada_to_usa';
  }
  const map = mappings[key];
  if (!map) return;
  const msg = ctx.message.text || ctx.message.caption;
  if (!msg) return;
  const groupName = map.waGroup;
  try {
    await sock.sendMessage(`${groupName}@g.us`, { text: msg });
    log.info(`Forwarded ${chatId} -> ${groupName}`);
  } catch (e) {
    console.error('Send error:', e.message);
  }
});

bot.launch();
console.log('🚀 Bridge running (flat Railway build).');
