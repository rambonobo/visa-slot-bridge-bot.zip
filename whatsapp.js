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

// 👉 Store WhatsApp auth in Railway volume (mount at /data)
const authDir = "/data/auth_whatsapp_v2";

// 🔹 Filters for which WA groups receive messages
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

// 🔹 Build / reuse cached group index
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

// 🔹 API used by bridge.js → send to all eligible WA groups
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

// 🔹 Main WhatsApp starter
async function startWhatsApp() {
  // Ensure auth dir exists (inside Railway volume)
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
    printQRInTerminal: true, // QR string will print in Railway logs
  });

  // Persist creds
  sock.ev.on("creds.update", saveCreds);

  // Connection lifecycle
  sock.ev.on("connection.update", (update) => {
    const { qr, connection, lastDisconnect } = update;

    // 👉 Raw QR in logs so you can scan it from Railway
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
      groupsIndex = null; // refresh group cache
    }

    if (connection === "close") {
      logger.error("❌ WhatsApp connection closed", { statusCode, errMsg });

      const needFreshLogin =
        statusCode === 405 ||
        statusCode === 401 ||
        statusCode === DisconnectReason.loggedOut;

      if (needFreshLogin) {
        logger.error(
          "🔐 Session invalid (405/401/loggedOut). Deleting auth_whatsapp_v2 and exiting."
        );

        try {
          fs.rmSync(authDir, { recursive: true, force: true });
        } catch (e) {
          logger.error(e, "Failed to delete auth dir");
        }

        // Let Railway restart → on next boot you'll get a fresh QR
        process.exit(1);
        return;
      }

      // Other/transient error → try to reconnect
      logger.info("🔁 Transient error, trying to reconnect...");
      startWhatsApp().catch((e) =>
        logger.error(e, "Reconnection attempt failed")
      );
    }
  });

  // Try to index groups (will fail until connected; that's fine)
  try {
    await ensureGroupsIndex();
  } catch (e) {
    logger.error(e, "Failed to build WhatsApp group index (will retry later)");
  }

  return { sendToAllEligible };
}

module.exports = { startWhatsApp };
