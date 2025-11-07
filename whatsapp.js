import { makeWASocket, useMultiFileAuthState, Browsers, fetchLatestBaileysVersion } from 'baileys'
import pino from 'pino'
import qrcode from 'qrcode-terminal'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const AUTH_DIR = path.join(process.cwd(), 'auth_whatsapp')

export async function startWhatsApp({ logger = pino({ level: 'silent' }) } = {}) {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    browser: Browsers.ubuntu('Chrome'),
    printQRInTerminal: false, // we'll render QR manually below
    auth: state,
    logger
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', (update) => {
    const { connection, qr, lastDisconnect } = update
    if (qr) {
      qrcode.generate(qr, { small: true })
      console.log('Scan the QR from WhatsApp > Linked Devices')
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode
      console.log(`❌ WhatsApp connection closed${code ? ': ' + code : ''}`)
    } else if (connection === 'open') {
      console.log('✅ WhatsApp connected')
    }
  })

  return sock
}

export async function listWhatsAppGroups(sock) {
  const chats = await sock.groupFetchAllParticipating().catch(() => ({}))
  const groups = Object.values(chats).map(g => ({ id: g.id, name: g.subject }))
  return groups
}
