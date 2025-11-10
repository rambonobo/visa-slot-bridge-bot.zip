
const { Telegraf } = require('telegraf');
const fs = require('fs');
const path = require('path');

function loadMappings() {
  const p = path.join(process.cwd(), 'mappings.json');
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function makeMatcher(mappings, topicsOnly) {
  const normalized = mappings.map(m => ({
    chatUser: (m.telegram.chatUser || '').toLowerCase(),
    topicId: m.telegram.topicId || null,
    groupName: m.whatsappGroupName
  }));

  return (ctx) => {
    const msg = ctx.message || ctx.channelPost || {};
    const chat = msg.chat || {};
    const chatUser = (chat.username || '').toLowerCase();
    const threadId = msg.message_thread_id || null;

    for (const row of normalized) {
      if (row.chatUser && row.chatUser === chatUser) {
        if (topicsOnly) {
          if (row.topicId && row.topicId === threadId) return row.groupName;
        } else {
          return row.groupName;
        }
      }
    }
    return null;
  };
}

async function startTelegramBot({ token, topicsOnly, onForward, logger }) {
  const bot = new Telegraf(token);
  const mappings = loadMappings();
  const pickGroup = makeMatcher(mappings, topicsOnly);

  const forwardText = async (ctx, text) => {
    const groupName = pickGroup(ctx);
    if (!groupName) return;
    const who = ctx.from ? (ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.first_name||''} ${ctx.from.last_name||''}`.trim()) : 'someone';
    const prefix = `[TG→WA] ${who}`;
    const out = `${prefix}\n${text}`.trim();
    try {
      await onForward(groupName, out);
      logger.info({ groupName }, 'Forwarded to WhatsApp');
    } catch (e) {
      logger.error({ err: e }, 'Failed to send to WhatsApp');
    }
  };

  bot.on('message', async (ctx) => {
    const msg = ctx.message;
    if (!msg) return;
    if (msg.text) return forwardText(ctx, msg.text);
    if (msg.caption) return forwardText(ctx, msg.caption);
  });

  await bot.launch();
  logger.info('Telegram bot launched.');
  return bot;
}

module.exports = { startTelegramBot };
