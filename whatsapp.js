const path = require("path");
const fs = require("fs");
const pino = require("pino");

const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
} = require("@whiskeysockets/baileys");

const logger = pino({ level: process.env.LOG_LEVEL || "info" });

let sock = null;
let groupsIndex = null;

// 👇 Where WhatsApp auth/session is stored (mount a Railway volume at /data)
const authDir = "/data/auth_whatsapp";

// Filters
const EXCLUDE_NAMES = (process.env.EXCLUDE_GROUPS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const INCLUDE_REGEX = (() => {
  const re = (process.env.WA_GROUP_ALLOW_REGEX || "").trim();
  if (!re) return null;
  try {
    return new RegExp(re, "i");
  } catch {
    return null;
  }
})();

async function ensureGroupsIndex() {
  if (!sock) throw new Error("WhatsApp socket not ready");
  if (groupsIndex) return groupsIndex;

  const all = await sock.groupFetchAllParticipating();
  const list = Object.values(all || {}).map((g) => ({
    id: g.id,
    name: g.subject || g.name || "",
  }));

  const filtered = list.filter((g) => {
    if (EXCLUDE_NAMES.includes(g.name)) return false;
    if (INCLUDE_REGEX && !INCLUDE_REGEX.test(g.name)) return false;
    return true;
  });

  groupsIndex = { all: list, filtered };
  logger.info(
    { countAll: list.length, countFiltered: filtered.length },
    "Indexed WhatsApp groups"
  );

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
  // Ensure auth directory exists (on Railway this should be a volume at /data)
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  const { version, isLatest } = await fetchLatestBaileysVersion();
  logger.info({ version, isLatest }, "Using WhatsApp Web version negotiated by Baileys");

  sock = makeWASocket({
    version,
    logger,
    auth: state,
    browser: ["MacOS", "Safari", "14.4"],
    printQRInTerminal: true, // QR will appear in Railway logs
  });

  // Save creds whenever they’re updated
  sock.ev.on("creds.update", saveCreds);

  // Connection lifecycle
  sock.ev.on("connection.update", (update) => {
    const { qr, connection, lastDisconnect } = update;

    // Show raw QR in logs so you can scan from Railway
    if (qr) {
      console.log("\n\n==================== SCAN THIS QR ====================\n");
      console.log(qr);
      console.log("\nScan from WhatsApp → Settings → Linked Devices\n");
      console.log("=======================================================\n\n");
    }

    const statusCode = lastDisconnect?.error?.output?.statusCode;
    const errMsg = lastDisconnect?.error?.message;

    logger.info({ connection, statusCode, errMsg }, "connection.update");

    if (connection === "open") {
      logger.info("✅ WhatsApp connected successfully!");
      groupsIndex = null; // force fresh group index
    }

    if (connection === "close") {
      logger.error("❌ WhatsApp connection closed", { statusCode, errMsg });

      const needFreshLogin =
        statusCode === 405 ||
        statusCode === 401 ||
        statusCode === DisconnectReason.loggedOut;

      if (needFreshLogin) {
        // Session is invalid – delete it so next boot shows a new QR
        logger.error("🔐 Session invalid (405/401/loggedOut). Deleting auth_whatsapp and exiting.");

        try {
          fs.rmSync(authDir, { recursive: true, force: true });
        } catch (e) {
          logger.error(e, "Failed to delete auth dir");
        }

        // Let Railway restart the container, new QR will be printed
        process.exit(1);
      } else {
        logger.info("🔁 Transient error, trying to reconnect...");
        startWhatsApp().catch((e) =>
          logger.error(e, "Reconnection attempt failed")
        );
      }
    }
  });

  // Try to build initial group index (will be retried after connect if it fails)
  try {
    await ensureGroupsIndex();
  } catch (e) {
    logger.error(e, "Failed to build WhatsApp group index");
  }

  return { sendToAllEligible };
}

module.exports = { startWhatsApp };
