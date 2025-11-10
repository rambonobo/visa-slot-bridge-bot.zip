
const path = require("path");
const fs = require("fs");
const pino = require("pino");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

const logger = pino({ level: process.env.LOG_LEVEL || "info" });

let sock = null;
let groupsIndex = null;

const EXCLUDE_NAMES = (process.env.EXCLUDE_GROUPS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

const INCLUDE_REGEX = (() => {
  const re = (process.env.WA_GROUP_ALLOW_REGEX || "").trim();
  if (!re) return null;
  try { return new RegExp(re, "i"); } catch { return null; }
})();

async function ensureGroupsIndex() {
  if (!sock) throw new Error("WhatsApp socket not ready");
  if (groupsIndex) return groupsIndex;

  const all = await sock.groupFetchAllParticipating();
  const list = Object.values(all || {})
    .map(g => ({ id: g.id, name: g.subject || g.name || "" }));

  const filtered = list.filter(g => {
    if (EXCLUDE_NAMES.includes(g.name)) return false;
    if (INCLUDE_REGEX && !INCLUDE_REGEX.test(g.name)) return false;
    return true;
  });

  groupsIndex = { all: list, filtered };
  logger.info({ countAll: list.length, countFiltered: filtered.length }, "Indexed WhatsApp groups");
  return groupsIndex;
}

async function sendToAllEligible(text) {
  const index = await ensureGroupsIndex();
  if (!index.filtered.length) {
    logger.warn("No eligible WA groups found to send to.");
    return;
  }
  for (const g of index.filtered) {
    try {
      await sock.sendMessage(g.id, { text });
      logger.info(`✅ Sent to "${g.name}" (${g.id})`);
    } catch (err) {
      logger.error({ err }, `❌ Failed send to "${g.name}" (${g.id})`);
    }
  }
}

async function startWhatsApp() {
  const authDir = path.join(process.cwd(), "auth_whatsapp");
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version, isLatest } = await fetchLatestBaileysVersion();
  logger.info({ version, isLatest }, "Using Baileys WA web version");

  sock = makeWASocket({
    version,
    logger,
    auth: state,
    browser: ["Mac OS", "Desktop", "14.4.1"],
    printQRInTerminal: false
  });

  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", (u) => {
    if (u.connection) logger.info({ connection: u.connection }, "[wa] connection");
    if (u.qr) {
      logger.warn("QR provided but not expected (creds should be preloaded).");
    }
    if (u.lastDisconnect?.error) {
      logger.error("connection errored");
    }
    if (u.connection === "close") {
      logger.error("WhatsApp connection closed");
    }
  });

  try {
    await ensureGroupsIndex();
  } catch (e) {
    logger.error(e, "Failed to warm up groups index");
  }

  return { sendToAllEligible };
}

module.exports = { startWhatsApp };
