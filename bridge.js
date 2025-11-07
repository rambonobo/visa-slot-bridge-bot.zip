import fs from 'fs'
import path from 'path'
import pino from 'pino'
import dotenv from 'dotenv'
import { startWhatsApp } from './whatsapp.js'
import { startTelegram } from './telegram.js'
import { fileURLToPath } from 'url'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const LOG_PRETTY = process.env.LOG_PRETTY === 'true'
const logger = pino(LOG_PRETTY ? pino.transport({ target: 'pino-pretty' }) : undefined)

// Load mapping: "chatId:topicId" -> waJid
const mapPath = path.join(process.cwd(), 'group_map.json')
if (!fs.existsSync(mapPath)) {
  console.error('group_map.json missing. Please create it.')
  process.exit(1)
}
const mapping = JSON.parse(fs.readFileSync(mapPath, 'utf-8'))

function keyFor(chatId, topicId) {
  return `${chatId}:${topicId}`
}

const sock = await startWhatsApp({ logger })
const bot = startTelegram(async ({ chatId, topicId, text }) => {
  const key = keyFor(chatId, topicId)
  const waJid = mapping[key]
  if (!waJid) return // silent drop if not mapped

  try {
    await sock.sendMessage(waJid, { text })
    logger.info({ chatId, topicId, waJid }, 'Forwarded Telegram → WhatsApp')
  } catch (err) {
    logger.error({ err }, 'Failed to forward to WhatsApp')
  }
})
