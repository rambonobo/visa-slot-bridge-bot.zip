
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers
} = require('@whiskeysockets/baileys');

const WA_DIR = path.join(process.cwd(), 'auth_whatsapp');

async function startWhatsApp({ phoneNumber, logger }) {
  if (!fs.existsSync(WA_DIR)) fs.mkdirSync(WA_DIR, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(WA_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    browser: Browsers.macOS('Desktop'),
    auth: state,
    printQRInTerminal: false,
    logger
  });

  sock.ev.process(async (events) => {
    if (events['creds.update']) await saveCreds();
    if (events['connection.update']) {
      const { connection, lastDisconnect } = events['connection.update'];
      if (connection) logger.info({ connection }, "[wa] connection");
      if (connection === 'close') {
        const reason = lastDisconnect?.error || lastDisconnect;
        logger.error({ err: reason }, "WhatsApp connection closed");
      }
    }
  });

  if (!fs.existsSync(path.join(WA_DIR, 'creds.json'))) {
    logger.info("🟢 No session found — attempting phone link...");
    try {
      const code = await sock.requestPairingCode(phoneNumber.replace(/^\+/, ''));
      logger.warn(`🔢 Pairing code: ${code} (WhatsApp > Linked Devices > Link with phone number)`);
    } catch (e) {
      logger.error(`❌ Phone pairing failed: ${e?.message || e}`);
      logger.warn("⚠️ Falling back to QR pairing mode...");
    }
  }

  async function ensureGroupsIndex() {
    const groups = await sock.groupFetchAllParticipating();
    const byName = {};
    for (const [jid, info] of Object.entries(groups)) {
      const name = (info.subject || '').trim().toLowerCase();
      if (name) byName[name] = jid;
    }
    return byName;
  }

  let groupsIndex = null;
  async function sendToGroupByName(groupName, text) {
    if (!text || !text.trim()) return;
    const key = groupName.trim().toLowerCase();
    if (!groupsIndex) groupsIndex = await ensureGroupsIndex();
    let jid = groupsIndex[key];
    if (!jid) {
      groupsIndex = await ensureGroupsIndex();
      jid = groupsIndex[key];
    }
    if (!jid) throw new Error(`Group not found by name: ${groupName}`);
    await sock.sendMessage(jid, { text });
  }

  return { sock, sendToGroupByName };
}

module.exports = { startWhatsApp };
