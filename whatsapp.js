
import makeWASocket, { DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } from 'baileys';
import qrcode from 'qrcode-terminal';
import { log } from './utils.js';
import fs from 'fs';

export async function connectWhatsApp({ listOnly = false } = {}) {
  const authDir = process.env.WHATSAPP_AUTH_DIR || './auth_whatsapp';
  fs.mkdirSync(authDir, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    printQRInTerminal: false,
    auth: state,
    version,
    browser: ['Railway', 'Chrome', '121.0.0'],
    markOnlineOnConnect: false,
    syncFullHistory: false
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      log.info('Scan this QR to link WhatsApp (valid ~20s):');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'open') {
      log.info('✅ WhatsApp connected.');
    } else if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.statusCode;
      log.error({ code }, 'WhatsApp connection closed.');
      if (code !== DisconnectReason.loggedOut) {
        // Baileys will try to reconnect automatically
      }
    }
  });

  async function listGroups() {
    const groupsMap = await sock.groupFetchAllParticipating();
    const groups = Object.values(groupsMap).sort((a,b) => a.subject.localeCompare(b.subject));
    if (!groups.length) {
      log.warn('No groups found. Join some groups in WhatsApp and restart.');
      return [];
    }
    log.info('—— WhatsApp Groups —————————————————————————');
    groups.forEach((g, i) => {
      log.info(`[${i+1}] ${g.subject} — ${g.id}`);
    });
    log.info('———————————————————————————————————————————');
    return groups;
  }

  async function sendTo(groupId, text) {
    if (!groupId) throw new Error('Missing target WhatsApp groupId.');
    await sock.sendMessage(groupId, { text });
  }

  if (listOnly) {
    try {
      await listGroups();
    } catch (e) {
      log.error(e, 'Failed to list groups.');
    }
    return { listGroups: () => listGroups(), sendTo };
  }

  return { listGroups: () => listGroups(), sendTo };
}
