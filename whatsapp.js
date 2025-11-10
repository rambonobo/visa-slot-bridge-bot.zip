import pino from 'pino';
import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion, Browsers } from 'baileys';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import qrcode from 'qrcode-terminal';
import { findGroupJidByName } from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

export async function startWhatsApp({ logger = pino({ level: 'info' }), phoneNumber }) {
  const authDir = join(__dirname, 'auth_whatsapp');
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  let lastConnection = 'init';
  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    auth: state,
    browser: Browsers.macOS('Safari'),
    syncFullHistory: false
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (u) => {
    const { connection, lastDisconnect } = u;
    if (lastConnection !== connection) {
      logger.info({ connection }, '[wa] connection');
      lastConnection = connection || lastConnection;
    }
    if (u.qr) {
      console.log('=======================================');
      console.log('🔳 Scan the QR below:');
      console.log('➡️  Open WhatsApp → Linked Devices → Link a device');
      qrcode.generate(u.qr, { small: true });
      console.log('=======================================');
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode || 'n/a';
      const loc  = lastDisconnect?.error?.data?.location || 'n/a';
      console.error(`❌ WhatsApp connection closed: ${lastDisconnect?.error?.message || 'unknown'} (code: ${code}, loc: ${loc})`);
    }
  });

  const hasCreds = !!state?.creds?.noiseKey;
  if (!hasCreds) {
    console.log('🟢 No session found — attempting phone link...');
    try {
      const code = await sock.requestPairingCode(phoneNumber.replace(/\s+/g, ''));
      console.log('=======================================');
      console.log('📱 Pair this phone number with WhatsApp Business:');
      console.log('➡️  Open WhatsApp Business → Linked Devices → Link with phone number');
      console.log(`🔢 Enter this code: ${code}`);
      console.log('=======================================');
    } catch (err) {
      console.error(`❌ Phone pairing failed: ${err?.message || err}`);
      console.warn('⚠️ Falling back to QR pairing mode...');
    }
  }

  async function sendToGroupByName(groupName, text) {
    if (!text || !groupName) return false;
    const jid = await findGroupJidByName(sock, groupName);
    if (!jid) throw new Error(`WhatsApp group not found by name: "${groupName}"`);
    await sock.sendMessage(jid, { text });
    return true;
  }

  return { sendToGroupByName, getSocket: () => sock };
}
