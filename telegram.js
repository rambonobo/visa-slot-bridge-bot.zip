import TelegramBot from 'node-telegram-bot-api'
import dotenv from 'dotenv'
dotenv.config()

const token = process.env.TELEGRAM_TOKEN
if (!token) {
  console.error('Missing TELEGRAM_TOKEN in environment.')
  process.exit(1)
}

export function startTelegram(onTopicMessage) {
  // long polling
  const bot = new TelegramBot(token, { polling: true, filepath: false })
  console.log('✅ Telegram bot polling started')

  bot.on('message', (msg) => {
    // Only supergroups with topics emit message_thread_id
    const chatId = msg.chat?.id
    const topicId = msg.message_thread_id
    const text = msg.text || msg.caption || ''

    if (!chatId || !topicId) return // ignore: not a topic message
    if (!text) return

    onTopicMessage({
      chatId,
      topicId,
      text,
      msg
    })
  })

  return bot
}
