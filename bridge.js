import 'dotenv/config';
import { Telegraf } from 'telegraf';
import pino from 'pino';
import fs from 'fs';
import { startWhatsApp } from './whatsapp.js';

const log = pino({ level: 'info' });

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER || '';
const TOPICS_ONLY = String(process.env.TOPICS_ONLY || 'true').toLowerCase() === 'true';
const OWNER_ID = process.env.OWNER_ID ? Number(process.env.OWNER_ID) : null;

if (!TELEGRAM_TOKEN) { console.error('Missing TELEGRAM_TOKEN'); process.exit(1); }
if (!WHATSAPP_NUMBER) { console.error('Missing WHATSAPP_NUMBER'); process.exit(1); }

const MAPPINGS_FILE = './mappings.json';
let mappings = {};
try { mappings = JSON.parse(fs.readFileSync(MAPPINGS_FILE,'utf8')); } catch { mappings = {}; }
function saveMappings(){ fs.writeFileSync(MAPPINGS_FILE, JSON.stringify(mappings, null, 2)); }

const { sendToGroupByName } = await startWhatsApp({ logger: log, phoneNumber: WHATSAPP_NUMBER });
const bot = new Telegraf(TELEGRAM_TOKEN);

function isOwner(ctx){ if (!OWNER_ID) return true; return ctx.from && Number(ctx.from.id) === OWNER_ID; }

bot.command('link', async (ctx)=>{
  if (!isOwner(ctx)) return ctx.reply('⛔ Only owner can use this.');
  const chatId = ctx.chat?.id;
  const groupName = (ctx.message.text.split(' ').slice(1).join(' ')||'').trim();
  if (!groupName) return ctx.reply('Usage: /link <WhatsApp Group Name>');
  mappings[String(chatId)] = { waGroup: groupName };
  saveMappings();
  return ctx.reply(`✅ Linked this Telegram chat -> WhatsApp group: “${groupName}”.`);
});

bot.command('unlink', async (ctx)=>{
  if (!isOwner(ctx)) return ctx.reply('⛔ Only owner can use this.');
  const chatId = ctx.chat?.id;
  delete mappings[String(chatId)];
  saveMappings();
  return ctx.reply('✅ Unlinked this Telegram chat.');
});

bot.command('status', async (ctx)=>{
  const chatId = ctx.chat?.id;
  const map = mappings[String(chatId)];
  if (!map) return ctx.reply('ℹ️ This chat is not linked.');
  return ctx.reply(`🔗 Linked to WhatsApp group: “${map.waGroup}”. TOPICS_ONLY=${TOPICS_ONLY}`);
});

bot.on('message', async (ctx)=>{
  try{
    const chatId = ctx.chat?.id;
    const map = mappings[String(chatId)];
    if (!map) return;
    if (TOPICS_ONLY) {
      const hasThread = typeof ctx.message.message_thread_id === 'number';
      if (!hasThread) return;
    }
    const text = ctx.message.text || ctx.message.caption;
    if (!text) return;
    const fromName = [ctx.from?.first_name, ctx.from?.last_name].filter(Boolean).join(' ') || ctx.from?.username || 'unknown';
    const topicSuffix = ctx.message.message_thread_id ? ` (topic #${ctx.message.message_thread_id})` : '';
    const payload = `📩 *${fromName}*${topicSuffix}\n${text}`;
    await sendToGroupByName(map.waGroup, payload);
    log.info({ chatId, waGroup: map.waGroup }, 'Forwarded');
  } catch(e){
    console.error('Forward error:', e?.message || e);
  }
});

await bot.launch();
console.log('🚀 Telegram bot launched. Send /link <WA Group> inside a group to start forwarding.');

process.once('SIGINT', ()=> bot.stop('SIGINT'));
process.once('SIGTERM', ()=> bot.stop('SIGTERM'));
