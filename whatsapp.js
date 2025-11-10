import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys'
import pino from 'pino'

export async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_whatsapp')
  const { version } = await fetchLatestBaileysVersion()
  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: true,
    auth: state,
    browser: ['Mac OS', 'Chrome', '14.4.1']
  })

  sock.ev.on('creds.update', saveCreds)

  const groupMappings = {
    "H1BandH4UpdatesAlerts": "H Group",
    "F1visa_realtimeinfo": "F Group",
    "VISAslotExpertB1B2_bupdates": "B Updates",
    "VISAslotExpertB1B2_canada": "Canada to USA"
  }

  console.log("✅ WhatsApp bridge initialized with fixed mappings")

  async function sendToGroupByName(name, message) {
    try {
      const groupName = groupMappings[name] || name
      const chats = await sock.groupFetchAllParticipating().catch(() => ({}))
      const group = Object.values(chats).find(g => g.subject?.toLowerCase() === groupName.toLowerCase())

      if (!group) {
        console.warn(`⚠️ Group "${groupName}" not found — skipping`)
        return
      }

      await sock.sendMessage(group.id, { text: message })
      console.log(`✅ Sent to ${groupName}: ${message.slice(0, 40)}...`)
    } catch (err) {
      console.error('❌ Failed to send to WhatsApp', err.message)
    }
  }

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode
      console.log(`❌ WhatsApp connection closed (${reason || 'unknown'})`)
      if (reason !== DisconnectReason.loggedOut) startWhatsApp()
    } else if (connection === 'open') {
      console.log('✅ WhatsApp connection opened successfully')
    }
  })

  return { sock, sendToGroupByName }
}
