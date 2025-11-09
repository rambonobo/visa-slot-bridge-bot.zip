import fs from 'fs';
import path from 'path';
import url from 'url';
import dotenv from 'dotenv';
import QRCode from 'qrcode';

dotenv.config();

export const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

export function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

export function getEnvJson(name, fallback = {}) {
  try {
    const raw = process.env[name];
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

export function getCsvEnv(name) {
  const v = (process.env[name] || '').trim();
  if (!v) return [];
  return v.split(',').map(s => s.trim()).filter(Boolean);
}

export async function saveQRImage(qrData, outPath) {
  await QRCode.toFile(outPath, qrData, { margin: 2, width: 480 });
}

export function log(...args) {
  const ts = new Date().toISOString();
  console.log(`[VSIH ${ts}]`, ...args);
}

export function isTruthy(v) {
  return String(v || '').toLowerCase() in { '1':1, 'true':1, 'yes':1, 'y':1 };
}
