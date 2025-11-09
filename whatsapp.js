import makeWASocket, { useMultiFileAuthState, DisconnectReason } from 'baileys';
import { log, ensureDir, saveQRImage, __dirname, isTruthy } from './utils.js';
import fs from 'fs';
import path from 'path';

const AUTH_FOLDER = path.join(__dirname, 'auth_whatsapp');
ensureDir(AUTH_FOLDER);

let sock;

export async function initWhatsApp({ onReady, onMessage, onGroupsRefreshed } = {}) {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    browser: ['Ubuntu','Chrome','121.0.0'],
    markOnlineOnConnect: false,
    syncFullHistory: false,
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      const p = path.join(__dirname, 'qr.png');
      try {
        await saveQRImage(qr, p);
        log('QR saved to qr.png (scan via WhatsApp > Linked Devices).');
        if (isTruthy(process.env.PRINT_QR_ASCII)) {
          console.log('\nScan this QR (also saved as qr.png)\n');
          console.log(qr);
          console.log('\n');
        }
      } catch (e) {
        log('Failed to save QR image:', e.message);
      }
    }

    if (connection === 'open') {
      log('✅ WhatsApp connected.');
      await listGroupsToFile();
      if (onReady) onReady();
      if (onGroupsRefreshed) onGroupsRefreshed(await getGroups());
    } else if (connection === 'close') {
      const shouldReconnect =
        !lastDisconnect?.error ||
        lastDisconnect?.error?.output?.statusCode != DisconnectReason.loggedOut;

      log('❌ WhatsApp connection closed.', lastDisconnect?.error?.message || '');
      if (shouldReconnect) {
        setTimeout(() => initWhatsApp({ onReady, onMessage, onGroupsRefreshed }), 3000);
      } else {
        log('Not reconnecting (logged out). Delete auth_whatsapp to relink.');
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ type, messages }) => {
    if (type != 'notify' || !messages?.length) return;
    for (const m of messages) {
      const msg = m.message?.conversation ||
                  m.message?.extendedTextMessage?.text ||
                  m.message?.imageMessage?.caption ||
                  m.message?.videoMessage?.caption || '';
      if (!msg) continue;
      if (onMessage) {
        onMessage({
          from: m.key.remoteJid,
          pushName: m.pushName,
          text: msg,
          raw: m,
        });
      }
    }
  });

  return sock;
}

export async function sendWhatsAppText(jid, text) {
  if (!sock) throw new Error('WhatsApp not initialized');
  return sock.sendMessage(jid, { text });
}

export async function getGroups() {
  if (!sock) return [];
  const chats = await sock.groupFetchAllParticipating();
  return Object.values(chats || {}).map(c => ({
    subject: c.subject,
    id: c.id,
    participants: c.participants?.length || 0,
  }));
}

async function listGroupsToFile() {
  try {
    const groups = await getGroups();
    const out = path.join(__dirname, 'whatsapp_groups.json');
    fs.writeFileSync(out, JSON.stringify(groups, null, 2));
    log(`📄 Wrote WhatsApp groups to whatsapp_groups.json (${groups.length} items).`);
  } catch (e) {
    log('Failed writing whatsapp_groups.json:', e.message);
  }
}
